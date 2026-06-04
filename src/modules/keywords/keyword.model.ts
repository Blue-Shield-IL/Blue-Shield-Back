import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("keywords")
export class Keyword {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: false })
  word!: string;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;
}
