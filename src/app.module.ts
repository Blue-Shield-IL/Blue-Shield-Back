import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ThrottlerModule } from "@nestjs/throttler";
import { JwtAuthGuard } from "@Guards/jwt-auth.guard";
import { AuthModule } from "@Modules/auth/auth.module";
import { UsersModule } from "@Modules/users/users.module";
import { TopicsModule } from "@Modules/topics/topics.module";
import { CustomThrottlerGuard } from "@Guards/throttler.guard";
import { JwtStrategy } from "@Middleware/passport/jwt.strategy";
import { KeywordsModule } from "@Modules/keywords/keywords.module";
import { DatabaseModule } from "@Providers/database/database.provider";
import { DashboardModule } from "@Modules/dashboard/dashboard.module";
import { UserKeywordsModule } from "@Modules/userKeywords/user-keywords.module";

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
    TopicsModule,
    KeywordsModule,
    UserKeywordsModule,
    DashboardModule,
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
