import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TopicKeyword } from "./topic-keyword.model";

@Module({
  imports: [TypeOrmModule.forFeature([TopicKeyword])],
  exports: [TypeOrmModule],
})
export class TopicKeywordsModule {}
