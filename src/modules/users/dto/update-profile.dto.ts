import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(["analyst", "foreign-affairs", "communications", "researcher"])
  role?: string;
}
