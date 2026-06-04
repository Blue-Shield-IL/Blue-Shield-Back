import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "@Modules/users/users.model";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: false })
  user_id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "varchar", length: 255, nullable: false })
  token_hash!: string;

  @Column({ type: "timestamp", nullable: false })
  expires_at!: Date;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;
}
