import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true, nullable: false })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  name!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  password_hash!: string | null;

  @Column({ type: "varchar", length: 20, nullable: false, default: "local" })
  auth_provider!: string;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  google_id!: string | null;

  @Column({ type: "boolean", default: false })
  is_onboarded!: boolean;

  @CreateDateColumn({ type: "timestamp", default: () => "NOW()" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "NOW()" })
  updated_at!: Date;
}
