import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.model';

describe('AuthService - refresh', () => {
  let authService: AuthService;
  let refreshTokenRepository: any;
  let usersService: any;
  let jwtService: any;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    is_onboarded: false,
    auth_provider: 'local',
  };

  beforeEach(async () => {
    refreshTokenRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    usersService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('new-access-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-google-client-id') } },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should return new access and refresh tokens for a valid refresh token', async () => {
    const plainToken = 'valid-refresh-token-uuid';
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const storedToken = {
      id: 'token-id-1',
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      is_revoked: false,
    };

    refreshTokenRepository.find.mockResolvedValue([storedToken]);
    usersService.findById.mockResolvedValue(mockUser);
    refreshTokenRepository.create.mockImplementation((data: any) => data);
    refreshTokenRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    const result = await authService.refresh({ refreshToken: plainToken });

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBeDefined();
    expect(result.refreshToken).not.toBe(plainToken);
    // Old token should be revoked
    expect(storedToken.is_revoked).toBe(true);
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(storedToken);
    // New token should be stored
    expect(refreshTokenRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        is_revoked: false,
      }),
    );
  });

  it('should throw UnauthorizedException for an invalid refresh token', async () => {
    const tokenHash = await bcrypt.hash('some-other-token', 10);

    refreshTokenRepository.find.mockResolvedValue([
      {
        id: 'token-id-1',
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
        is_revoked: false,
      },
    ]);

    await expect(
      authService.refresh({ refreshToken: 'wrong-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for an expired refresh token', async () => {
    const plainToken = 'expired-refresh-token';
    const tokenHash = await bcrypt.hash(plainToken, 10);

    refreshTokenRepository.find.mockResolvedValue([
      {
        id: 'token-id-1',
        user_id: mockUser.id,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (expired)
        is_revoked: false,
      },
    ]);

    await expect(
      authService.refresh({ refreshToken: plainToken }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when no non-revoked tokens exist', async () => {
    refreshTokenRepository.find.mockResolvedValue([]);

    await expect(
      authService.refresh({ refreshToken: 'any-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should set 30-day expiry when rememberMe is true', async () => {
    const plainToken = 'remember-me-token';
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const storedToken = {
      id: 'token-id-1',
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      is_revoked: false,
    };

    refreshTokenRepository.find.mockResolvedValue([storedToken]);
    usersService.findById.mockResolvedValue(mockUser);
    refreshTokenRepository.create.mockImplementation((data: any) => data);
    refreshTokenRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    const now = Date.now();
    await authService.refresh({ refreshToken: plainToken, rememberMe: true });

    const createCall = refreshTokenRepository.create.mock.calls[0][0];
    const expiryTime = createCall.expires_at.getTime();
    // Should be approximately 30 days from now (within 5 seconds tolerance)
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiryTime).toBeGreaterThan(now + thirtyDaysMs - 5000);
    expect(expiryTime).toBeLessThan(now + thirtyDaysMs + 5000);
  });

  it('should set 24-hour expiry when rememberMe is false or not provided', async () => {
    const plainToken = 'no-remember-token';
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const storedToken = {
      id: 'token-id-1',
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      is_revoked: false,
    };

    refreshTokenRepository.find.mockResolvedValue([storedToken]);
    usersService.findById.mockResolvedValue(mockUser);
    refreshTokenRepository.create.mockImplementation((data: any) => data);
    refreshTokenRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    const now = Date.now();
    await authService.refresh({ refreshToken: plainToken, rememberMe: false });

    const createCall = refreshTokenRepository.create.mock.calls[0][0];
    const expiryTime = createCall.expires_at.getTime();
    // Should be approximately 24 hours from now (within 5 seconds tolerance)
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    expect(expiryTime).toBeGreaterThan(now + twentyFourHoursMs - 5000);
    expect(expiryTime).toBeLessThan(now + twentyFourHoursMs + 5000);
  });

  it('should generate JWT with correct payload', async () => {
    const plainToken = 'jwt-payload-token';
    const tokenHash = await bcrypt.hash(plainToken, 10);

    const storedToken = {
      id: 'token-id-1',
      user_id: mockUser.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
      is_revoked: false,
    };

    refreshTokenRepository.find.mockResolvedValue([storedToken]);
    usersService.findById.mockResolvedValue(mockUser);
    refreshTokenRepository.create.mockImplementation((data: any) => data);
    refreshTokenRepository.save.mockImplementation((entity: any) => Promise.resolve(entity));

    await authService.refresh({ refreshToken: plainToken });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
    });
  });
});
