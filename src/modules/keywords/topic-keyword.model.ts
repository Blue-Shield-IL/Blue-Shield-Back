import { Entity, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Topic } from "./topic.model";
import { Keyword } from "./keyword.model";

@Entity("topic_keywords")
export class TopicKeyword {
  @PrimaryColumn({ type: "uuid" })
  topic_id!: string;

  @PrimaryColumn({ type: "uuid" })
  keyword_id!: string;

  @ManyToOne(() => Topic, { onDelete: "CASCADE" })
  @JoinColumn({ name: "topic_id" })
  topic!: Topic;

  @ManyToOne(() => Keyword, { onDelete: "CASCADE" })
  @JoinColumn({ name: "keyword_id" })
  keyword!: Keyword;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;
}
