import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "./dto/login.dto";
import { ConfigService } from "@nestjs/config";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { OAuth2Client } from "google-auth-library";
import { RefreshToken } from "./refresh-token.model";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { UsersService } from "@Modules/users/users.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>("GOOGLE_CLIENT_ID")
    );
  }

  private getRefreshExpiry = (rememberMe?: boolean): Date => {
    const expiryDate = new Date();

    if (rememberMe) {
      const days = parseInt(
        this.configService.get<string>("REFRESH_TOKEN_EXPIRY_DAYS") || "30"
      );

      expiryDate.setDate(expiryDate.getDate() + days);
    } else {
      const hours = parseInt(
        this.configService.get<string>("REFRESH_TOKEN_EXPIRY_HOURS") || "24"
      );

      expiryDate.setHours(expiryDate.getHours() + hours);
    }

    return expiryDate;
  };

  private generateTokens = async (
    user: { id: string; email: string; name: string | null },
    rememberMe?: boolean
  ) => {
    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: this.getRefreshExpiry(rememberMe),
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  };

  public login = async (loginDto: LoginDto) => {
    const { email, password, rememberMe } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      rememberMe
    );

    return {
      user,
      accessToken,
      refreshToken,
    };
  };

  public register = async (registerDto: RegisterDto) => {
    const { name, email, password } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      name,
      email,
      passwordHash,
      authProvider: "local",
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      user,
      accessToken,
      refreshToken,
    };
  };

  public refresh = async (refreshDto: RefreshDto) => {
    const { refreshToken } = refreshDto;

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (new Date() > storedToken.expiresAt) {
      await this.refreshTokenRepository.remove(storedToken);

      throw new UnauthorizedException("Refresh token expired");
    }

    await this.refreshTokenRepository.remove(storedToken);

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(storedToken.user, true);

    return { accessToken, refreshToken: newRefreshToken };
  };

  public logout = async (
    userId: string,
    { refreshToken }: { refreshToken: string }
  ) => {
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, userId },
    });

    if (storedToken) {
      await this.refreshTokenRepository.remove(storedToken);
    }

    return { message: "Logged out successfully" };
  };

  public changePassword = async (
    userId: string,
    changePasswordDto: ChangePasswordDto
  ) => {
    const { current_password, new_password } = changePasswordDto;

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.passwordHash) {
      throw new BadRequestException(
        "Cannot change password for social login accounts"
      );
    }

    const isCurrentValid = await bcrypt.compare(
      current_password,
      user.passwordHash
    );

    if (!isCurrentValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await this.usersService.updatePassword(userId, newHash);

    return { message: "Password changed successfully" };
  };

  public googleAuth = async (googleAuthDto: GoogleAuthDto) => {
    try {
      const { token, rememberMe } = googleAuthDto;

      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>("GOOGLE_CLIENT_ID"),
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException("Invalid Google token");
      }

      const { email, sub: googleId, name } = payload;

      const existingUser = await this.usersService.findByEmail(email);

      let user: {
        id: string;
        email: string;
        name: string | null;
        googleId: string | null;
        isOnboarded: boolean;
        authProvider: string;
      };

      if (existingUser) {
        if (!existingUser.googleId) {
          await this.usersService.updateGoogleId(existingUser.id, googleId!);
        }

        if (!existingUser.name && name) {
          await this.usersService.updateName(existingUser.id, name);
          existingUser.name = name;
        }

        user = existingUser;
      } else {
        user = await this.usersService.create({
          email,
          name: name || null,
          googleId,
          authProvider: "google",
        });
      }

      const { accessToken, refreshToken } = await this.generateTokens(
        user,
        rememberMe
      );

      return {
        user,
        accessToken,
        refreshToken,
      };
    } catch {
      throw new UnauthorizedException("Invalid Google token");
    }
  };
}
