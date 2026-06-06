import { KeywordsService } from "./keywords.service";
import { OnboardingDto } from "./dto/onboarding.dto";
import { JwtPayload } from "@Interfaces/jwt-payload";
import { CurrentUser } from "@Decorators/user.decorator";
import { UsersService } from "@Modules/users/users.service";
import { Body, Controller, Get, Post } from "@nestjs/common";

@Controller("keywords")
export class KeywordsController {
  constructor(
    private readonly keywordsService: KeywordsService,
    private readonly usersService: UsersService
  ) {}

  @Get("me")
  async getMyKeywords(@CurrentUser() { sub }: JwtPayload) {
    return this.keywordsService.getUserKeywords(sub);
  }

  @Post("onboarding")
  async onboarding(
    @CurrentUser() { sub }: JwtPayload,
    @Body() { topics }: OnboardingDto
  ) {
    await this.keywordsService.setUserKeywordsByTopicIds(sub, topics);
    await this.usersService.markAsOnboarded(sub);

    return { message: "Onboarding completed" };
  }
}
