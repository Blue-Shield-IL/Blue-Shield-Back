import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();
    const ttlSeconds = Math.ceil(throttlerLimitDetail.ttl / 1000);

    response.header("Retry-After", String(ttlSeconds));

    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many attempts",
        retryAfter: ttlSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}
