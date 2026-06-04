import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("topics")
export class Topic {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: false })
  name!: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  icon!: string | null;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;
}
