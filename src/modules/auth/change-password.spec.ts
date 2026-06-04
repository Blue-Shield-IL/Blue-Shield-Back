import 'reflect-metadata';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

describe('AuthService - changePassword', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };
  let refreshTokenRepo: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    };

    configService = {
      get: jest.fn().mockReturnValue('mock-google-client-id'),
    };

    refreshTokenRepo = {
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };

    authService = new AuthService(
      usersService as any,
      jwtService as any,
      configService as any,
      refreshTokenRepo as any,
    );
  });

  it('should change password successfully when current password is correct', async () => {
    const passwordHash = await bcrypt.hash('OldPass1!', 10);
    usersService.findById.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      password_hash: passwordHash,
      auth_provider: 'local',
    });

    const result = await authService.changePassword('user-uuid', {
      current_password: 'OldPass1!',
      new_password: 'NewPass2@',
    });

    expect(result).toEqual({ message: 'Password changed successfully' });
    expect(usersService.updatePassword).toHaveBeenCalledWith(
      'user-uuid',
      expect.stringMatching(/^\$2[aby]\$/),
    );
  });

  it('should throw UnauthorizedException when current password is incorrect', async () => {
    const passwordHash = await bcrypt.hash('OldPass1!', 10);
    usersService.findById.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      password_hash: passwordHash,
      auth_provider: 'local',
    });

    await expect(
      authService.changePassword('user-uuid', {
        current_password: 'WrongPass1!',
        new_password: 'NewPass2@',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(usersService.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when user is not found', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      authService.changePassword('nonexistent-id', {
        current_password: 'OldPass1!',
        new_password: 'NewPass2@',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(usersService.updatePassword).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException for Google-only accounts (no password_hash)', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      password_hash: null,
      auth_provider: 'google',
    });

    await expect(
      authService.changePassword('user-uuid', {
        current_password: 'OldPass1!',
        new_password: 'NewPass2@',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(usersService.updatePassword).not.toHaveBeenCalled();
  });

  it('should hash the new password before storing', async () => {
    const passwordHash = await bcrypt.hash('OldPass1!', 10);
    usersService.findById.mockResolvedValue({
      id: 'user-uuid',
      email: 'test@example.com',
      password_hash: passwordHash,
      auth_provider: 'local',
    });

    await authService.changePassword('user-uuid', {
      current_password: 'OldPass1!',
      new_password: 'NewPass2@',
    });

    const storedHash = usersService.updatePassword.mock.calls[0][1];
    // Verify it's a bcrypt hash
    expect(storedHash).toMatch(/^\$2[aby]\$/);
    // Verify it's not the plaintext password
    expect(storedHash).not.toBe('NewPass2@');
    // Verify the hash matches the new password
    const isMatch = await bcrypt.compare('NewPass2@', storedHash);
    expect(isMatch).toBe(true);
  });
});
