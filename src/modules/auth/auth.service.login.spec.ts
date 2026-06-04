import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.model';

describe('AuthService - login', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;
  let refreshTokenRepo: { create: jest.Mock; save: jest.Mock };

  const hashedPassword = bcrypt.hashSync('Pass1234!', 10);

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    password_hash: hashedPassword,
    is_onboarded: false,
    auth_provider: 'local',
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    refreshTokenRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-google-client-id') } },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should login successfully with valid credentials', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    const result = await authService.login({
      email: 'test@example.com',
      password: 'Pass1234!',
    });

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual({
      id: 'user-uuid',
      email: 'test@example.com',
      isOnboarded: false,
      authProvider: 'local',
    });
  });

  it('should throw UnauthorizedException with "Invalid credentials" when email not found', async () => {
    usersService.findByEmail!.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nonexistent@example.com',
        password: 'Pass1234!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
  });

  it('should throw UnauthorizedException with "Invalid credentials" when password is wrong', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'WrongPassword1!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
  });

  it('should return the same error for wrong email and wrong password (prevent enumeration)', async () => {
    // Wrong email
    usersService.findByEmail!.mockResolvedValue(null);
    const wrongEmailError = await authService
      .login({ email: 'wrong@example.com', password: 'Pass1234!' })
      .catch((e) => e);

    // Wrong password
    usersService.findByEmail!.mockResolvedValue(mockUser);
    const wrongPasswordError = await authService
      .login({ email: 'test@example.com', password: 'WrongPass1!' })
      .catch((e) => e);

    expect(wrongEmailError.message).toBe(wrongPasswordError.message);
    expect(wrongEmailError.message).toBe('Invalid credentials');
  });

  it('should throw UnauthorizedException for Google-only user (no password_hash)', async () => {
    const googleUser = { ...mockUser, password_hash: null, auth_provider: 'google' };
    usersService.findByEmail!.mockResolvedValue(googleUser);

    await expect(
      authService.login({
        email: 'test@example.com',
        password: 'Pass1234!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
  });

  it('should store refresh token hash in the database', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    await authService.login({
      email: 'test@example.com',
      password: 'Pass1234!',
    });

    expect(refreshTokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-uuid',
        is_revoked: false,
      }),
    );
    const storedData = refreshTokenRepo.create.mock.calls[0][0];
    expect(storedData.token_hash).toMatch(/^\$2[aby]\$/);
    expect(storedData.expires_at).toBeInstanceOf(Date);
    expect(refreshTokenRepo.save).toHaveBeenCalled();
  });

  it('should set refresh token expiry to 30 days when rememberMe is true', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    const now = Date.now();
    await authService.login({
      email: 'test@example.com',
      password: 'Pass1234!',
      rememberMe: true,
    });

    const storedData = refreshTokenRepo.create.mock.calls[0][0];
    const expiresAt = storedData.expires_at.getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    // Allow 5 seconds tolerance
    expect(expiresAt).toBeGreaterThanOrEqual(now + thirtyDaysMs - 5000);
    expect(expiresAt).toBeLessThanOrEqual(now + thirtyDaysMs + 5000);
  });

  it('should set refresh token expiry to 24 hours when rememberMe is false or undefined', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    const now = Date.now();
    await authService.login({
      email: 'test@example.com',
      password: 'Pass1234!',
      rememberMe: false,
    });

    const storedData = refreshTokenRepo.create.mock.calls[0][0];
    const expiresAt = storedData.expires_at.getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    // Allow 5 seconds tolerance
    expect(expiresAt).toBeGreaterThanOrEqual(now + twentyFourHoursMs - 5000);
    expect(expiresAt).toBeLessThanOrEqual(now + twentyFourHoursMs + 5000);
  });

  it('should generate JWT with correct payload', async () => {
    usersService.findByEmail!.mockResolvedValue(mockUser);

    await authService.login({
      email: 'test@example.com',
      password: 'Pass1234!',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'user-uuid',
      email: 'test@example.com',
    });
  });
});
