import { IsArray, IsUUID } from "class-validator";

export class OnboardingDto {
  @IsArray()
  @IsUUID("4", { each: true })
  topics!: string[];
}
