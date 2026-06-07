import { Keyword } from "@Modules/keywords/keyword.model";
import {
  Entity,
  Column,
  JoinTable,
  ManyToMany,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("topics")
export class Topic {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  icon!: string | null;

  @ManyToMany(() => Keyword)
  @JoinTable({
    name: "topic_keywords",
    joinColumn: { name: "topic_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "keyword_id", referencedColumnName: "id" },
  })
  keywords!: Keyword[];

  @CreateDateColumn()
  createdAt!: Date;
}
