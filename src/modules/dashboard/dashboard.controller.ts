import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { PostSearchDto } from "./dto/post-search.dto";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  async getStats(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getStats(query.startDate, query.endDate);
  }

  @Get("threat-trend")
  async getThreatTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getThreatTrend(
      query.startDate,
      query.endDate,
      query.interval
    );
  }

  @Get("sentiment")
  async getSentimentDistribution(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSentimentDistribution(
      query.startDate,
      query.endDate
    );
  }

  @Get("top-keywords")
  async getTopKeywords(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopKeywords(
      query.startDate,
      query.endDate,
      query.limit
    );
  }

  @Get("geographic")
  async getGeographicDistribution(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getGeographicDistribution(
      query.startDate,
      query.endDate
    );
  }

  @Get("top-authors")
  async getTopAuthors(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopAuthors(
      query.startDate,
      query.endDate,
      query.limit
    );
  }

  @Get("posts")
  async searchPosts(@Query() query: PostSearchDto) {
    return this.dashboardService.searchPosts(query);
  }

  @Get("languages")
  async getLanguages() {
    return this.dashboardService.getLanguages();
  }

  @Get("activity-trend")
  async getActivityTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getActivityTrend(query.startDate, query.endDate, query.interval);
  }

  @Get("top-sources")
  async getTopSources(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopSources(query.startDate, query.endDate, query.limit);
  }

  @Get("most-viewed")
  async getMostViewed(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getMostViewed(query.startDate, query.endDate, query.limit);
  }

  @Get("date-bounds")
  async getDateBounds() {
    return this.dashboardService.getDateBounds();
  }

  @Get("translate")
  async translate(
    @Query("text") text: string,
    @Query("source") source?: string
  ) {
    return this.dashboardService.translateToEnglish(text, source);
  }
}
