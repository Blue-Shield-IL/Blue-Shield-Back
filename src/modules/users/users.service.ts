import { Repository } from "typeorm";
import { User } from "./users.model";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  public findByEmail = (email: string) =>
    this.usersRepository.findOne({ where: { email } });

  public findById = (id: string) =>
    this.usersRepository.findOne({ where: { id } });

  public create = async (data: Partial<User>) => {
    const user = this.usersRepository.create(data);

    return await this.usersRepository.save(user);
  };

  public updatePassword = async (userId: string, passwordHash: string) => {
    await this.usersRepository.update(userId, { passwordHash });
  };

  public updateGoogleId = async (userId: string, googleId: string) => {
    await this.usersRepository.update(userId, { googleId });

    return await this.findById(userId);
  };

  public markAsOnboarded = (userId: string) =>
    this.usersRepository.update(userId, { isOnboarded: true });

  public updateName = (userId: string, name: string) =>
    this.usersRepository.update(userId, { name });

  public updateProfile = async (
    userId: string,
    data: { name?: string; email?: string; role?: string }
  ) => {
    const update: Partial<User> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email;
    if (data.role !== undefined) update.role = data.role;
    if (Object.keys(update).length > 0) {
      await this.usersRepository.update(userId, update);
    }
    return this.findById(userId);
  };

  public updateProfilePic = async (userId: string, url: string) => {
    await this.usersRepository.update(userId, { profilePicUrl: url });

    return this.findById(userId);
  };

  public deleteUser = (userId: string) => this.usersRepository.delete(userId);
}
