import { Module } from "@nestjs/common";
import { Keyword } from "./keyword.model";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KeywordsService } from "./keywords.service";
import { UsersModule } from "@Modules/users/users.module";
import { KeywordsController } from "./keywords.controller";
import { UserKeywordsModule } from "@Modules/userKeywords/user-keywords.module";
import { TopicKeywordsModule } from "@Modules/topicKeywords/topicKeywords.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Keyword]),
    UserKeywordsModule,
    TopicKeywordsModule,
    UsersModule,
  ],
  controllers: [KeywordsController],
  providers: [KeywordsService],
  exports: [KeywordsService],
})
export class KeywordsModule {}
