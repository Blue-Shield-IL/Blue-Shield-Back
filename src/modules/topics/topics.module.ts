import { Topic } from "./topic.model";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TopicsService } from "./topics.service";
import { TopicsController } from "./topics.controller";
import { TopicKeywordsModule } from "@Modules/topicKeywords/topicKeywords.module";

@Module({
  imports: [TypeOrmModule.forFeature([Topic]), TopicKeywordsModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
