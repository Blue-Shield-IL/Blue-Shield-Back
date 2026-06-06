import { Topic } from "@Modules/topics/topic.model";
import { Keyword } from "@Modules/keywords/keyword.model";
import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("topic_keywords")
export class TopicKeyword {
  @PrimaryColumn("uuid")
  topicId!: string;

  @PrimaryColumn("uuid")
  keywordId!: string;

  @ManyToOne(() => Topic, { onDelete: "CASCADE" })
  @JoinColumn()
  topic!: Topic;

  @ManyToOne(() => Keyword, { onDelete: "CASCADE" })
  @JoinColumn()
  keyword!: Keyword;

  @CreateDateColumn()
  createdAt!: Date;
}
