import { IsNotEmpty, IsString, IsOptional, IsBoolean } from "class-validator";

export class GoogleAuthDto {
  @IsString({ message: "Token must be a string" })
  @IsNotEmpty({ message: "Token is required" })
  token!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
