import { AppService } from "./app.service";
import { Controller, Get } from "@nestjs/common";
import { Public } from "@Decorators/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  public getHealth() {
    return this.appService.getHealth();
  }
}
