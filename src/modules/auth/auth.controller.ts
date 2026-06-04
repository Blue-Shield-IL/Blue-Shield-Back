import { Controller, Post, Patch, Delete, Body, Req, Res } from "@nestjs/common";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { Public } from "@Decorators/public.decorator";
import { CurrentUser } from "@Decorators/user.decorator";
import { UsersService } from "@Modules/users/users.service";

const REFRESH_COOKIE = "refresh_token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // set to true in production with HTTPS
  sameSite: "lax" as const,
  path: "/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(loginDto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  @Post("register")
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(registerDto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post("google")
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.googleAuth(googleAuthDto);
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Public()
  @SkipThrottle()
  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      throw new (await import("@nestjs/common")).UnauthorizedException(
        "No refresh token"
      );
    }

    const result = await this.authService.refresh({
      refreshToken,
      rememberMe: true,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    return { accessToken: result.accessToken };
  }

  @SkipThrottle()
  @Post("logout")
  async logout(
    @CurrentUser() user: { sub: string; email: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.authService.logout(user.sub, { refreshToken });
    }
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
    return { message: "Logged out successfully" };
  }

  @SkipThrottle()
  @Patch("change-password")
  async changePassword(
    @CurrentUser() user: { sub: string; email: string },
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user.sub, changePasswordDto);
  }

  @SkipThrottle()
  @Delete("delete-account")
  async deleteAccount(
    @CurrentUser() user: { sub: string; email: string },
    @Res({ passthrough: true }) res: Response
  ) {
    await this.usersService.deleteUser(user.sub);
    res.clearCookie("refresh_token", { path: "/auth" });
    return { message: "Account deleted successfully" };
  }
}
