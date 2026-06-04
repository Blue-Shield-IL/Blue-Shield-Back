import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./users.model";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  public findByEmail = async (email: string): Promise<User | null> => {
    return this.usersRepository.findOne({ where: { email } });
  };

  public findById = async (id: string): Promise<User | null> => {
    return this.usersRepository.findOne({ where: { id } });
  };

  public create = async (data: Partial<User>): Promise<User> => {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  };

  public updatePassword = async (
    userId: string,
    passwordHash: string
  ): Promise<void> => {
    await this.usersRepository.update(userId, { password_hash: passwordHash });
  };

  public updateGoogleId = async (
    userId: string,
    googleId: string
  ): Promise<User> => {
    await this.usersRepository.update(userId, { google_id: googleId });
    return this.findById(userId) as Promise<User>;
  };

  public markAsOnboarded = async (userId: string): Promise<void> => {
    await this.usersRepository.update(userId, { is_onboarded: true });
  };

  public updateName = async (userId: string, name: string): Promise<void> => {
    await this.usersRepository.update(userId, { name });
  };

  public deleteUser = async (userId: string): Promise<void> => {
    await this.usersRepository.delete(userId);
  };
}
