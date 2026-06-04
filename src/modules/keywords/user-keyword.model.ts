import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from "typeorm";
import { User } from "@Modules/users/users.model";
import { Keyword } from "./keyword.model";

@Entity("user_keywords")
export class UserKeyword {
  @PrimaryColumn({ type: "uuid" })
  user_id!: string;

  @PrimaryColumn({ type: "uuid" })
  keyword_id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Keyword, { onDelete: "CASCADE" })
  @JoinColumn({ name: "keyword_id" })
  keyword!: Keyword;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;
}
