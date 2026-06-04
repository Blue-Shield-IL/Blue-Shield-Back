import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  function createDto(data: Partial<LoginDto>): LoginDto {
    return plainToInstance(LoginDto, data);
  }

  it('should pass validation with valid email and password', async () => {
    const dto = createDto({ email: 'user@example.com', password: 'anypassword' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if email is missing', async () => {
    const dto = createDto({ password: 'anypassword' });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail if email format is invalid', async () => {
    const dto = createDto({ email: 'invalid', password: 'anypassword' });
    const errors = await validate(dto);
    const emailError = errors.find((e) => e.property === 'email');
    expect(emailError).toBeDefined();
  });

  it('should fail if password is missing', async () => {
    const dto = createDto({ email: 'user@example.com' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });

  it('should fail if password is empty string', async () => {
    const dto = createDto({ email: 'user@example.com', password: '' });
    const errors = await validate(dto);
    const passwordError = errors.find((e) => e.property === 'password');
    expect(passwordError).toBeDefined();
  });
});
