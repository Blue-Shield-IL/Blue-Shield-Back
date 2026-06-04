import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "@Providers/database/database.provider";
import { UsersModule } from "@Modules/users/users.module";
import { AuthModule } from "@Modules/auth/auth.module";
import { KeywordsModule } from "@Modules/keywords/keywords.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { JwtAuthGuard } from "@Guards/jwt-auth.guard";
import { CustomThrottlerGuard } from "@Guards/throttler.guard";
import { JwtStrategy } from "@Middleware/passport/jwt.strategy";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    KeywordsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
