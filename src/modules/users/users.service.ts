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

  public deleteUser = (userId: string) => this.usersRepository.delete(userId);
}
