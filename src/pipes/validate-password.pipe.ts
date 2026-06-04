import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from "@nestjs/common";

export interface PasswordValidationRule {
  test: (password: string) => boolean;
  message: string;
}

const PASSWORD_RULES: PasswordValidationRule[] = [
  {
    test: (password: string) => password.length >= 8,
    message: "Password must be at least 8 characters long",
  },
  {
    test: (password: string) => /[A-Za-z]/.test(password),
    message: "Password must contain at least one letter",
  },
  {
    test: (password: string) => /[0-9]/.test(password),
    message: "Password must contain at least one number",
  },
  {
    test: (password: string) => /[^A-Za-z0-9]/.test(password),
    message: "Password must contain at least one symbol",
  },
];

@Injectable()
export class ValidatePasswordPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const errors = validatePassword(value);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: "Validation failed",
        errors,
      });
    }

    return value;
  }
}

/**
 * Validates a password against the Password_Policy rules.
 * Returns an array of error messages for each violated rule.
 * Returns an empty array if the password satisfies all rules.
 */
export function validatePassword(password: string): string[] {
  const errors: string[] = [];

  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) {
      errors.push(rule.message);
    }
  }

  return errors;
}
