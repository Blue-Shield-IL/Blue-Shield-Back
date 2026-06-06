import {
  Entity,
  Column,
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

  @CreateDateColumn()
  createdAt!: Date;
}
