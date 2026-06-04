import { BadRequestException } from '@nestjs/common';
import { ValidatePasswordPipe, validatePassword } from './validate-password.pipe';

describe('ValidatePasswordPipe', () => {
  let pipe: ValidatePasswordPipe;

  beforeEach(() => {
    pipe = new ValidatePasswordPipe();
  });

  it('should return the password when it meets all rules', () => {
    const result = pipe.transform('Abc12345!');
    expect(result).toBe('Abc12345!');
  });

  it('should throw BadRequestException when password is too short', () => {
    expect(() => pipe.transform('Ab1!')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when password has no letter', () => {
    expect(() => pipe.transform('12345678!')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when password has no number', () => {
    expect(() => pipe.transform('Abcdefgh!')).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when password has no symbol', () => {
    expect(() => pipe.transform('Abcdefg1')).toThrow(BadRequestException);
  });

  it('should include all violated rules in the error', () => {
    try {
      pipe.transform('abc');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        message: string;
        errors: string[];
      };
      expect(response.errors).toContain(
        'Password must be at least 8 characters long',
      );
      expect(response.errors).toContain(
        'Password must contain at least one number',
      );
      expect(response.errors).toContain(
        'Password must contain at least one symbol',
      );
    }
  });
});

describe('validatePassword', () => {
  it('should return empty array for a valid password', () => {
    expect(validatePassword('Abc12345!')).toEqual([]);
  });

  it('should return error for short password', () => {
    const errors = validatePassword('Ab1!');
    expect(errors).toContain('Password must be at least 8 characters long');
  });

  it('should return error for password without letter', () => {
    const errors = validatePassword('12345678!');
    expect(errors).toContain('Password must contain at least one letter');
  });

  it('should return error for password without number', () => {
    const errors = validatePassword('Abcdefgh!');
    expect(errors).toContain('Password must contain at least one number');
  });

  it('should return error for password without symbol', () => {
    const errors = validatePassword('Abcdefg1');
    expect(errors).toContain('Password must contain at least one symbol');
  });

  it('should return multiple errors when multiple rules are violated', () => {
    const errors = validatePassword('abc');
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
