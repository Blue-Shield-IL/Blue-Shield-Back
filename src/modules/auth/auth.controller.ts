import { Response } from "express";
import { LoginDto } from "./dto/login.dto";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "@Interfaces/jwt-payload";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { Public } from "@Decorators/public.decorator";
import { CurrentUser } from "@Decorators/user.decorator";
import { UsersService } from "@Modules/users/users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { clearRefreshCookie, setRefreshCookie } from "@Utilities/cookie";
import { RefreshTokenCookie } from "@Decorators/refresh-token.decorator";
import { Body, Controller, Delete, Patch, Post, Res } from "@nestjs/common";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Post("login")
  @Public()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginDto);

    setRefreshCookie(res, refreshToken);

    return { user, accessToken };
  }

  @Post("register")
  @Public()
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerDto);

    setRefreshCookie(res, refreshToken);

    return { user, accessToken };
  }

  @Post("google")
  @Public()
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.googleAuth(googleAuthDto);

    setRefreshCookie(res, refreshToken);

    return { user, accessToken };
  }

  @Post("refresh")
  @Public()
  async refresh(
    @RefreshTokenCookie() refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const {
      accessToken,
      refreshToken: refreshedToken,
      user,
    } = await this.authService.refresh({ refreshToken });

    setRefreshCookie(res, refreshedToken);

    return { accessToken, user };
  }

  @Post("logout")
  async logout(
    @CurrentUser() { sub }: JwtPayload,
    @RefreshTokenCookie() refreshToken: string,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(sub, { refreshToken });

    clearRefreshCookie(res);

    return { message: "Logged out successfully" };
  }

  @Patch("change-password")
  async changePassword(
    @CurrentUser() { sub }: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(sub, changePasswordDto);
  }

  @Delete("delete-account")
  async deleteAccount(
    @CurrentUser() { sub }: JwtPayload,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.usersService.deleteUser(sub);

    clearRefreshCookie(res);

    return { message: "Account deleted successfully" };
  }
}
