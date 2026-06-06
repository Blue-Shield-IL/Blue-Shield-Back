import { IsNotEmpty, IsString, IsOptional, IsBoolean } from "class-validator";

export class RefreshDto {
  @IsString({ message: "Refresh token must be a string" })
  @IsNotEmpty({ message: "Refresh token is required" })
  refreshToken!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
