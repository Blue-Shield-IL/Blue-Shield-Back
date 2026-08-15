import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DashboardService } from "./dashboard.service";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>("ELASTICSEARCH_NODE"),
        auth: {
          username: configService.get<string>("ELASTICSEARCH_USERNAME") || "",
          password: configService.get<string>("ELASTICSEARCH_PASSWORD") || "",
        },
        tls: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
