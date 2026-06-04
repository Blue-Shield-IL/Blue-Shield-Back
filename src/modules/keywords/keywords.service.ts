import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Topic } from "./topic.model";
import { Keyword } from "./keyword.model";
import { TopicKeyword } from "./topic-keyword.model";
import { UserKeyword } from "./user-keyword.model";

@Injectable()
export class KeywordsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Keyword)
    private readonly keywordRepository: Repository<Keyword>,
    @InjectRepository(TopicKeyword)
    private readonly topicKeywordRepository: Repository<TopicKeyword>,
    @InjectRepository(UserKeyword)
    private readonly userKeywordRepository: Repository<UserKeyword>
  ) {}

  public getAllTopics = async () => {
    return this.topicRepository.find({ order: { name: "ASC" } });
  };

  public getTopicsWithKeywords = async () => {
    const topics = await this.topicRepository.find({ order: { name: "ASC" } });
    const topicKeywords = await this.topicKeywordRepository.find({
      relations: { topic: true, keyword: true },
    });

    return topics.map(topic => ({
      ...topic,
      keywords: topicKeywords
        .filter(tk => tk.topic_id === topic.id)
        .map(tk => tk.keyword),
    }));
  };

  public getUserKeywords = async (userId: string) => {
    const userKeywords = await this.userKeywordRepository.find({
      where: { user_id: userId },
      relations: { keyword: true },
    });

    return userKeywords.map(uk => uk.keyword);
  };

  public setUserKeywordsByTopics = async (userId: string, topicIds: string[]) => {
    // Find all keywords linked to those topics
    const topicKeywords = await this.topicKeywordRepository.find({
      where: { topic_id: In(topicIds) },
    });

    const keywordIds = [...new Set(topicKeywords.map(tk => tk.keyword_id))];

    // Remove all existing user keywords
    await this.userKeywordRepository.delete({ user_id: userId });

    // Insert new user keywords
    if (keywordIds.length > 0) {
      const userKeywords = keywordIds.map(keywordId =>
        this.userKeywordRepository.create({ user_id: userId, keyword_id: keywordId })
      );
      await this.userKeywordRepository.save(userKeywords);
    }

    return this.getUserKeywords(userId);
  };

  public addKeywordsToUser = async (userId: string, keywordIds: string[]) => {
    const userKeywords = keywordIds.map(keywordId =>
      this.userKeywordRepository.create({ user_id: userId, keyword_id: keywordId })
    );

    await this.userKeywordRepository
      .createQueryBuilder()
      .insert()
      .into(UserKeyword)
      .values(userKeywords)
      .orIgnore()
      .execute();

    return this.getUserKeywords(userId);
  };

  public removeKeywordsFromUser = async (userId: string, keywordIds: string[]) => {
    await this.userKeywordRepository.delete({
      user_id: userId,
      keyword_id: In(keywordIds),
    });

    return this.getUserKeywords(userId);
  };
}
