import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Topic } from "./topic.model";
import { Keyword } from "./keyword.model";
import { TopicKeyword } from "./topic-keyword.model";
import { UserKeyword } from "./user-keyword.model";
import { KeywordsService } from "./keywords.service";
import { KeywordsController } from "./keywords.controller";
import { UsersModule } from "@Modules/users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, Keyword, TopicKeyword, UserKeyword]),
    UsersModule,
  ],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
