import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("keywords")
export class Keyword {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  word!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
