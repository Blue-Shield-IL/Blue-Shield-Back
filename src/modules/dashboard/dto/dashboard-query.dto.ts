import { Type } from "class-transformer";
import { IsDateString, IsIn, IsNumber, IsOptional, Min } from "class-validator";

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(["day", "week", "month"])
  interval?: "day" | "week" | "month";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}
