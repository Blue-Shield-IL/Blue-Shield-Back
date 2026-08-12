import { Exclude } from "class-transformer";
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  @Exclude()
  @Column({ type: "varchar", nullable: true })
  passwordHash!: string | null;

  @Column({ default: "local" })
  authProvider!: string;

  @Column({ type: "varchar", nullable: true, unique: true })
  googleId!: string | null;

  @Column({ type: "varchar", nullable: true })
  role!: string | null;

  @Column({ default: false })
  isOnboarded!: boolean;

  @Column({ type: "varchar", nullable: true, default: null })
  profilePicUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
