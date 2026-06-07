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
    this.topicRepository.find({
      relations: { keywords: true },
      order: { name: "ASC" },
    });
}
