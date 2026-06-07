import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserKeyword } from "./user-keyword.model";

@Module({
  imports: [TypeOrmModule.forFeature([UserKeyword])],
  exports: [TypeOrmModule],
})
export class UserKeywordsModule {}
