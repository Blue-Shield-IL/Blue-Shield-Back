import { Repository } from "typeorm";
import { Topic } from "./topic.model";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>
  ) {}

  public getAllTopics = () =>
    this.topicRepository.find({ order: { name: "ASC" } });

  public getTopicsWithKeywords = () =>
    this.topicRepository
      .createQueryBuilder("topic")
      .leftJoinAndSelect("topic_keywords", "topic_keyword")
      .leftJoinAndMapMany(
        "topic.keywords",
        "keywords",
        "keyword",
        "keyword.id = topic_keyword.keyword_id"
      )
      .orderBy("topic.name", "ASC")
      .getMany();
}
