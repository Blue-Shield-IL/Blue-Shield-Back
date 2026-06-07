import { User } from "@Modules/users/users.model";
import { Keyword } from "@Modules/keywords/keyword.model";
import {
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("user_keywords")
export class UserKeyword {
  @PrimaryColumn("uuid")
  userId!: string;

  @PrimaryColumn("uuid")
  keywordId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn()
  user!: User;

  @ManyToOne(() => Keyword, { onDelete: "CASCADE" })
  @JoinColumn()
  keyword!: Keyword;

  @CreateDateColumn()
  createdAt!: Date;
}
