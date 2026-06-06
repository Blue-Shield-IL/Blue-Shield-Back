import { REFRESH_COOKIE } from "@Constants/auth";
import {
  ExecutionContext,
  createParamDecorator,
  UnauthorizedException,
} from "@nestjs/common";

export const RefreshTokenCookie = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const { cookies } = ctx.switchToHttp().getRequest();
    const token = cookies?.[REFRESH_COOKIE];

    if (!token) {
      throw new UnauthorizedException("No refresh token");
    }

    return token;
  }
);
