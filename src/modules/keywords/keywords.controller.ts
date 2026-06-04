import { Controller, Get, Post, Body } from "@nestjs/common";
import { KeywordsService } from "./keywords.service";
import { CurrentUser } from "@Decorators/user.decorator";
import { UsersService } from "@Modules/users/users.service";

@Controller("keywords")
export class KeywordsController {
  constructor(
    private readonly keywordsService: KeywordsService,
    private readonly usersService: UsersService
  ) {}

  @Get("topics")
  async getTopics() {
    return this.keywordsService.getTopicsWithKeywords();
  }

  @Get("me")
  async getMyKeywords(@CurrentUser() user: { sub: string; email: string }) {
    return this.keywordsService.getUserKeywords(user.sub);
  }

  @Post("onboarding")
  async onboarding(
    @CurrentUser() user: { sub: string; email: string },
    @Body() body: { topics: string[] }
  ) {
    await this.keywordsService.setUserKeywordsByTopics(user.sub, body.topics);
    await this.usersService.markAsOnboarded(user.sub);
    return { message: "Onboarding completed" };
  }
}
