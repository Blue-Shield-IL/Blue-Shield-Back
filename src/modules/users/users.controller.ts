import { memoryStorage } from "multer";
import { UsersService } from "./users.service";
import { JwtPayload } from "@Interfaces/jwt-payload";
import { CurrentUser } from "@Decorators/user.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { uploadBufferToCloudinary } from "@Providers/cloudinary/cloudinary.provider";
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";

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
      profilePicUrl: user.profilePicUrl,
    };
  }

  @Patch("me")
  async updateProfile(
    @CurrentUser() { sub }: JwtPayload,
    @Body() dto: UpdateProfileDto
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
      profilePicUrl: user.profilePicUrl,
    };
  }

  @Post("me/profile-pic")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  async uploadProfilePic(
    @CurrentUser() { sub }: JwtPayload,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const result = await uploadBufferToCloudinary(file.buffer, {
      folder: "blue-shield/avatars",
      public_id: sub,
    });

    await this.usersService.updateProfilePic(sub, result.secure_url);

    return { url: result.secure_url };
  }
}
