import { Controller, Get } from "@nestjs/common";
import { Public } from "@Decorators/public.decorator";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHealth(): { status: string } {
    return this.appService.getHealth();
  }
}
