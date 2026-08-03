import { Body, Controller, Get, Patch } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CurrentUser } from "@Decorators/user.decorator";
import { JwtPayload } from "@Interfaces/jwt-payload";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@CurrentUser() { sub }: JwtPayload) {
    const user = await this.usersService.findById(sub);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOnboarded: user.isOnboarded,
      authProvider: user.authProvider,
      role: user.role,
    };
  }

  @Patch("me")
  async updateProfile(
    @CurrentUser() { sub }: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(sub, dto);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOnboarded: user.isOnboarded,
      authProvider: user.authProvider,
      role: user.role,
    };
  }
}
