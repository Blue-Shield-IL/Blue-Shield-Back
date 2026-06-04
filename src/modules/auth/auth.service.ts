import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { UsersService } from "@Modules/users/users.service";
import { RefreshToken } from "./refresh-token.model";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";

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
    const now = new Date();

    if (rememberMe) {
      const days = parseInt(
        this.configService.get<string>("REFRESH_TOKEN_EXPIRY_DAYS") || "30",
        10
      );
      now.setDate(now.getDate() + days);
    } else {
      const hours = parseInt(
        this.configService.get<string>("REFRESH_TOKEN_EXPIRY_HOURS") || "24",
        10
      );
      now.setHours(now.getHours() + hours);
    }

    return now;
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

    const expiresAt = this.getRefreshExpiry(rememberMe);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  };

  private buildUserResponse = (user: {
    id: string;
    name: string | null;
    email: string;
    is_onboarded: boolean;
    auth_provider: string;
  }) => {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOnboarded: user.is_onboarded,
      authProvider: user.auth_provider,
    };
  };

  public login = async (loginDto: LoginDto) => {
    const { email, password, rememberMe } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.password_hash) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      rememberMe
    );

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
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
      password_hash: passwordHash,
      auth_provider: "local",
    });

    const { accessToken, refreshToken } = await this.generateTokens(user);

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
    };
  };

  public refresh = async (refreshDto: RefreshDto) => {
    const { refreshToken, rememberMe } = refreshDto;

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token_hash: tokenHash },
      relations: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (new Date() > storedToken.expires_at) {
      await this.refreshTokenRepository.remove(storedToken);
      throw new UnauthorizedException("Refresh token expired");
    }

    await this.refreshTokenRepository.remove(storedToken);

    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(storedToken.user, rememberMe);

    return { accessToken, refreshToken: newRefreshToken };
  };

  public logout = async (userId: string, logoutDto: LogoutDto) => {
    const { refreshToken } = logoutDto;

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token_hash: tokenHash, user_id: userId },
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

    if (!user.password_hash) {
      throw new BadRequestException(
        "Cannot change password for social login accounts"
      );
    }

    const isCurrentValid = await bcrypt.compare(
      current_password,
      user.password_hash
    );
    if (!isCurrentValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await this.usersService.updatePassword(userId, newHash);

    return { message: "Password changed successfully" };
  };

  public googleAuth = async (googleAuthDto: GoogleAuthDto) => {
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

    let user = await this.usersService.findByEmail(email);

    if (user) {
      if (!user.google_id) {
        user = await this.usersService.updateGoogleId(user.id, googleId!);
      }
      if (!user.name && name) {
        await this.usersService.updateName(user.id, name);
        user.name = name;
      }
    } else {
      user = await this.usersService.create({
        email,
        name: name || null,
        google_id: googleId,
        auth_provider: "google",
      });
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      user,
      rememberMe
    );

    return {
      accessToken,
      refreshToken,
      user: this.buildUserResponse(user),
    };
  };
}
