import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { PostSearchDto } from "./dto/post-search.dto";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private parseKeywords(csv?: string): string[] | undefined {
    if (!csv) return undefined;
    return csv.split(",").map((k) => k.trim()).filter(Boolean);
  }

  @Get("stats")
  async getStats(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getStats(query.startDate, query.endDate, this.parseKeywords(query.keywords));
  }

  @Get("threat-trend")
  async getThreatTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getThreatTrend(query.startDate, query.endDate, query.interval, this.parseKeywords(query.keywords));
  }

  @Get("sentiment")
  async getSentimentDistribution(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSentimentDistribution(query.startDate, query.endDate, this.parseKeywords(query.keywords));
  }

  @Get("top-keywords")
  async getTopKeywords(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopKeywords(query.startDate, query.endDate, query.limit, this.parseKeywords(query.keywords));
  }

  @Get("geographic")
  async getGeographicDistribution(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getGeographicDistribution(query.startDate, query.endDate, this.parseKeywords(query.keywords));
  }

  @Get("top-authors")
  async getTopAuthors(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopAuthors(query.startDate, query.endDate, query.limit);
  }

  @Get("posts")
  async searchPosts(@Query() query: PostSearchDto) {
    return this.dashboardService.searchPosts(query);
  }

  @Get("languages")
  async getLanguages() {
    return this.dashboardService.getLanguages();
  }

  @Get("countries")
  async getCountries() {
    return this.dashboardService.getCountries();
  }

  @Get("sources")
  async getSources() {
    return this.dashboardService.getSources();
  }

  @Get("activity-trend")
  async getActivityTrend(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getActivityTrend(query.startDate, query.endDate, query.interval, this.parseKeywords(query.keywords));
  }

  @Get("top-sources")
  async getTopSources(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopSources(query.startDate, query.endDate, query.limit, this.parseKeywords(query.keywords));
  }

  @Get("most-viewed")
  async getMostViewed(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getMostViewed(query.startDate, query.endDate, query.limit, this.parseKeywords(query.keywords));
  }

  @Get("ihra-breakdown")
  async getIhraBreakdown(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getIhraBreakdown(query.startDate, query.endDate, this.parseKeywords(query.keywords));
  }

  @Get("topic-breakdown")
  async getTopicBreakdown(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getTopicBreakdown(query.startDate, query.endDate);
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
