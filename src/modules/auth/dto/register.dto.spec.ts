import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  function createDto(data: Partial<RegisterDto>): RegisterDto {
    return plainToInstance(RegisterDto, data);
  }

  it('should pass validation with a valid email and password', async () => {
    const dto = createDto({ email: 'user@example.com', password: 'Abc1234!' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if email is missing', async () => {
    const dto = createDto({ password: 'Abc1234!' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail if email format is invalid', async () => {
    const dto = createDto({ email: 'not-an-email', password: 'Abc1234!' });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail if password is shorter than 8 characters', async () => {
    const dto = createDto({ email: 'user@example.com', password: 'Ab1!' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(Object.values(passwordError!.constraints || {})).toContain(
      'Password must be at least 8 characters long',
    );
  });

  it('should fail if password has no letter', async () => {
    const dto = createDto({ email: 'user@example.com', password: '12345678!' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(Object.values(passwordError!.constraints || {})).toContain(
      'Password must contain at least one letter',
    );
  });

  it('should fail if password has no number', async () => {
    const dto = createDto({ email: 'user@example.com', password: 'Abcdefgh!' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(Object.values(passwordError!.constraints || {})).toContain(
      'Password must contain at least one number',
    );
  });

  it('should fail if password has no symbol', async () => {
    const dto = createDto({ email: 'user@example.com', password: 'Abcdefg1' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
    expect(Object.values(passwordError!.constraints || {})).toContain(
      'Password must contain at least one symbol',
    );
  });

  it('should fail if password is empty', async () => {
    const dto = createDto({ email: 'user@example.com', password: '' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });
});
