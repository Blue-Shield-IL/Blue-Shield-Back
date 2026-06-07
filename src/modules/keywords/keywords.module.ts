import { Module } from "@nestjs/common";
import { Keyword } from "./keyword.model";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Topic } from "@Modules/topics/topic.model";
import { KeywordsService } from "./keywords.service";
import { UsersModule } from "@Modules/users/users.module";
import { KeywordsController } from "./keywords.controller";
import { UserKeywordsModule } from "@Modules/userKeywords/user-keywords.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Keyword, Topic]),
    UserKeywordsModule,
    UsersModule,
  ],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
