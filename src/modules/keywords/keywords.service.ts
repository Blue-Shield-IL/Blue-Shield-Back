import { uniq } from "lodash";
import { In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { UserKeyword } from "@Modules/userKeywords/user-keyword.model";
import { TopicKeyword } from "@Modules/topicKeywords/topic-keyword.model";

@Injectable()
export class KeywordsService {
  constructor(
    @InjectRepository(UserKeyword)
    private readonly userKeywordRepository: Repository<UserKeyword>,
    @InjectRepository(TopicKeyword)
    private readonly topicKeywordRepository: Repository<TopicKeyword>
  ) {}

  public getUserKeywords = async (userId: string) =>
    (
      await this.userKeywordRepository.find({
        where: { userId },
        relations: { keyword: true },
      })
    ).map(({ keyword }) => keyword);

  public setUserKeywordsByTopicIds = async (
    userId: string,
    topicIds: string[]
  ) => {
    const topicKeywords = await this.topicKeywordRepository.find({
      where: { topicId: In(topicIds) },
    });

    const keywordIds = uniq(topicKeywords.map(({ keywordId }) => keywordId));

    if (keywordIds.length > 0) {
      await this.userKeywordRepository
        .createQueryBuilder()
        .insert()
        .into(UserKeyword)
        .values(keywordIds.map(keywordId => ({ userId, keywordId })))
        .orIgnore()
        .execute();
    }
  };

  public addKeywordsToUser = async (userId: string, keywordIds: string[]) => {
    await this.userKeywordRepository
      .createQueryBuilder()
      .insert()
      .into(UserKeyword)
      .values(keywordIds.map(keywordId => ({ userId, keywordId })))
      .orIgnore()
      .execute();
  };

  public removeKeywordsFromUser = async (
    userId: string,
    keywordIds: string[]
  ) => {
    await this.userKeywordRepository.delete({
      userId,
      keywordId: In(keywordIds),
    });
  };
}
