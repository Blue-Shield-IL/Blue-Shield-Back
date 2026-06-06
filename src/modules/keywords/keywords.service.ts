import { uniq } from "lodash";
import { In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Topic } from "@Modules/topics/topic.model";
import { UserKeyword } from "@Modules/userKeywords/user-keyword.model";

@Injectable()
export class KeywordsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(UserKeyword)
    private readonly userKeywordRepository: Repository<UserKeyword>
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
    const topics = await this.topicRepository.find({
      where: { id: In(topicIds) },
      relations: { keywords: true },
    });

    const keywordIds = uniq(
      topics.flatMap(({ keywords }) => keywords.map(({ id }) => id))
    );

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
