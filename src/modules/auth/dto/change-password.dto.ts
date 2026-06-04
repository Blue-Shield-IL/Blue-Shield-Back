import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from "class-validator";

export class ChangePasswordDto {
  @IsString({ message: "Current password must be a string" })
  @IsNotEmpty({ message: "Current password is required" })
  current_password!: string;

  @IsString({ message: "New password must be a string" })
  @IsNotEmpty({ message: "New password is required" })
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  @Matches(/[A-Za-z]/, {
    message: "New password must contain at least one letter",
  })
  @Matches(/[0-9]/, {
    message: "New password must contain at least one number",
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: "New password must contain at least one symbol",
  })
  new_password!: string;
}
