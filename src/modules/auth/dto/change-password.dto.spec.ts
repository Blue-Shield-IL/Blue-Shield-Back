import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
  function createDto(data: Partial<ChangePasswordDto>): ChangePasswordDto {
    return plainToInstance(ChangePasswordDto, data);
  }

  it('should pass validation with valid current and new password', async () => {
    const dto = createDto({
      current_password: 'OldPass1!',
      new_password: 'NewPass1!',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail if current_password is missing', async () => {
    const dto = createDto({ new_password: 'NewPass1!' });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'current_password');
    expect(error).toBeDefined();
  });

  it('should fail if new_password is missing', async () => {
    const dto = createDto({ current_password: 'OldPass1!' });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'new_password');
    expect(error).toBeDefined();
  });

  it('should fail if new_password does not meet minimum length', async () => {
    const dto = createDto({
      current_password: 'OldPass1!',
      new_password: 'Ab1!',
    });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'new_password');
    expect(error).toBeDefined();
    expect(Object.values(error!.constraints || {})).toContain(
      'New password must be at least 8 characters long',
    );
  });

  it('should fail if new_password has no letter', async () => {
    const dto = createDto({
      current_password: 'OldPass1!',
      new_password: '12345678!',
    });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'new_password');
    expect(error).toBeDefined();
    expect(Object.values(error!.constraints || {})).toContain(
      'New password must contain at least one letter',
    );
  });

  it('should fail if new_password has no number', async () => {
    const dto = createDto({
      current_password: 'OldPass1!',
      new_password: 'Abcdefgh!',
    });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'new_password');
    expect(error).toBeDefined();
    expect(Object.values(error!.constraints || {})).toContain(
      'New password must contain at least one number',
    );
  });

  it('should fail if new_password has no symbol', async () => {
    const dto = createDto({
      current_password: 'OldPass1!',
      new_password: 'Abcdefg1',
    });
    const errors = await validate(dto);
    const error = errors.find((e) => e.property === 'new_password');
    expect(error).toBeDefined();
    expect(Object.values(error!.constraints || {})).toContain(
      'New password must contain at least one symbol',
    );
  });

  it('should not enforce policy on current_password', async () => {
    const dto = createDto({
      current_password: 'weak',
      new_password: 'NewPass1!',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
