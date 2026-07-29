import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import {
  GeographicDistributionItem,
  SentimentDistributionItem,
  ThreatTrendItem,
  TopKeywordItem,
  DashboardStats,
  TopAuthorItem,
  PostItem,
  PostSearchResult,
  ActivityTrendItem,
  TopSourceItem,
  MostViewedItem,
} from "./interfaces/dashboard.interfaces";
import { resolveLanguage } from "./language.util";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async ping(): Promise<boolean> {
    try {
      await this.elasticsearchService.ping();
      return true;
    } catch (error) {
      this.logger.error("Elasticsearch ping failed", error instanceof Error ? error.stack : error);
      return false;
    }
  }

  async getDateBounds(): Promise<{ earliest: string; latest: string }> {
    try {
      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        aggs: {
          earliest: { min: { field: "created_at" } },
          latest: { max: { field: "created_at" } },
        },
      });
      const aggs = result.aggregations as any;
      return {
        earliest: aggs?.earliest?.value_as_string || new Date().toISOString(),
        latest: aggs?.latest?.value_as_string || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to fetch date bounds", error instanceof Error ? error.stack : error);
      return {
        earliest: new Date().toISOString(),
        latest: new Date().toISOString(),
      };
    }
  }

  async getThreatTrend(
    startDate?: string,
    endDate?: string,
    interval?: "day" | "week" | "month"
  ): Promise<ThreatTrendItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const from = startDate || defaultStart.toISOString();
      const to = endDate || now.toISOString();
      const calendarInterval = interval || "day";

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              { exists: { field: "antisemitism_score" } },
              {
                range: {
                  created_at: {
                    gte: from,
                    lte: to,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          trend: {
            date_histogram: {
              field: "created_at",
              calendar_interval: calendarInterval,
            },
            aggs: {
              avg_score: {
                avg: {
                  field: "antisemitism_score",
                },
              },
            },
          },
        },
      });

      const buckets = (result as any).aggregations?.trend?.buckets || [];

      return buckets.map((bucket: any) => ({
        date: bucket.key_as_string,
        avgScore: bucket.avg_score.value || 0,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch threat trend data", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getSentimentDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<SentimentDistributionItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const start = startDate || defaultStart;
      const end = endDate || defaultEnd;

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            filter: [
              {
                range: {
                  created_at: {
                    gte: start,
                    lte: end,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          sentiment_distribution: {
            terms: {
              field: "sentiment",
              size: 10,
            },
          },
        },
      });

      const aggregations = result.aggregations as any;
      const buckets = aggregations?.sentiment_distribution?.buckets || [];

      const bucketMap = new Map<string, number>();
      for (const bucket of buckets) {
        bucketMap.set(bucket.key, bucket.doc_count);
      }

      const allSentiments = ["Supportive", "Neutral", "Negative", "Hostile"];

      return allSentiments.map((sentiment) => ({
        sentiment,
        count: bucketMap.get(sentiment) || 0,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch sentiment distribution data", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getTopKeywords(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<TopKeywordItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const from = startDate || defaultStart;
      const to = endDate || defaultEnd;
      const size = limit || 10;

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  created_at: {
                    gte: from,
                    lte: to,
                  },
                },
              },
              {
                range: {
                  antisemitism_score: {
                    gt: 0.5,
                  },
                },
              },
            ],
          },
        },
        aggs: {
          top_keywords: {
            terms: {
              field: "keywords",
              size: size,
            },
          },
        },
      });

      const buckets =
        (result.aggregations?.top_keywords as any)?.buckets || [];

      return buckets.map((bucket: any) => ({
        keyword: bucket.key,
        count: bucket.doc_count,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch top keywords data", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getGeographicDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<GeographicDistributionItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const from = startDate || defaultStart;
      const to = endDate || defaultEnd;

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              {
                range: {
                  created_at: {
                    gte: from,
                    lte: to,
                  },
                },
              },
              {
                range: {
                  antisemitism_score: {
                    gt: 0.5,
                  },
                },
              },
              {
                exists: {
                  field: "country_of_origin",
                },
              },
            ],
          },
        },
        aggs: {
          countries: {
            terms: {
              field: "country_of_origin",
              size: 50,
            },
          },
        },
      });

      const buckets =
        (result.aggregations?.countries as any)?.buckets || [];

      // Normalize and merge synonymous country names (e.g. "USA" + "United States")
      const merged = new Map<string, number>();
      for (const bucket of buckets) {
        const name = this.normalizeCountry(bucket.key);
        merged.set(name, (merged.get(name) || 0) + bucket.doc_count);
      }

      return Array.from(merged.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error("Failed to fetch geographic distribution data", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  private normalizeCountry(raw: string): string {
    if (!raw) return raw;
    const key = raw.trim().toLowerCase();
    const aliases: Record<string, string> = {
      "usa": "United States",
      "us": "United States",
      "u.s.": "United States",
      "u.s.a.": "United States",
      "united states": "United States",
      "united states of america": "United States",
      "america": "United States",
      "uk": "United Kingdom",
      "u.k.": "United Kingdom",
      "great britain": "United Kingdom",
      "britain": "United Kingdom",
      "england": "United Kingdom",
      "united kingdom": "United Kingdom",
      "uae": "United Arab Emirates",
      "united arab emirates": "United Arab Emirates",
      "russia": "Russia",
      "russian federation": "Russia",
      "south korea": "South Korea",
      "republic of korea": "South Korea",
      "czech republic": "Czechia",
      "czechia": "Czechia",
    };
    if (aliases[key]) return aliases[key];
    // Title-case fallback for unknown values
    return raw
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  async getStats(startDate?: string, endDate?: string): Promise<DashboardStats> {
    try {
      const now = new Date();
      const from = startDate || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();
      // Compute previous period of same duration for comparison
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      const duration = toMs - fromMs;
      const prevFrom = new Date(fromMs - duration).toISOString();
      const prevTo = from;

      // Total posts count
      const totalResult = await this.elasticsearchService.count({
        index: "posts",
        query: { range: { created_at: { gte: from, lte: to } } },
      });
      const totalPosts = totalResult.count;

      // New posts in selected period
      const newPostsResult = await this.elasticsearchService.count({
        index: "posts",
        query: { range: { created_at: { gte: from, lte: to } } },
      });
      const newPosts = newPostsResult.count;

      // Posts from previous period (for comparison)
      const prevPostsResult = await this.elasticsearchService.count({
        index: "posts",
        query: { range: { created_at: { gte: prevFrom, lt: prevTo } } },
      });
      const prevPosts = prevPostsResult.count;
      const newPostsChange = prevPosts > 0 ? Math.round(((newPosts - prevPosts) / prevPosts) * 100) : 0;

      // Flagged posts (antisemitism_score > 0.5)
      const flaggedResult = await this.elasticsearchService.count({
        index: "posts",
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: from, lte: to } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
            ],
          },
        },
      });
      const flaggedPosts = flaggedResult.count;

      // Flagged posts previous period
      const prevFlaggedResult = await this.elasticsearchService.count({
        index: "posts",
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: prevFrom, lt: prevTo } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
            ],
          },
        },
      });
      const prevFlagged = prevFlaggedResult.count;
      const flaggedPostsChange = prevFlagged > 0 ? Math.round(((flaggedPosts - prevFlagged) / prevFlagged) * 100) : 0;

      // Reach (views) + active sources via aggregations
      let totalViews = 0;
      let activeSources = 0;
      try {
        const aggResult = await this.elasticsearchService.search({
          index: "posts",
          size: 0,
          query: { range: { created_at: { gte: from, lte: to } } },
          aggs: {
            total_views: { sum: { field: "views" } },
            active_channels: { cardinality: { field: "channel" } },
            active_channels_kw: { cardinality: { field: "channel.keyword" } },
            active_authors: { cardinality: { field: "author" } },
            active_authors_kw: { cardinality: { field: "author.keyword" } },
          },
        });
        const aggs = aggResult.aggregations as any;
        totalViews = Math.round(aggs?.total_views?.value || 0);
        activeSources = Math.round(
          aggs?.active_channels?.value ||
          aggs?.active_channels_kw?.value ||
          aggs?.active_authors?.value ||
          aggs?.active_authors_kw?.value ||
          0
        );
      } catch (aggErr) {
        // If multi-agg fails, try simpler query
        try {
          const simpleAgg = await this.elasticsearchService.search({
            index: "posts",
            size: 0,
            query: { range: { created_at: { gte: from, lte: to } } },
            aggs: {
              total_views: { sum: { field: "views" } },
              active_sources: { cardinality: { field: "author.keyword" } },
            },
          });
          const sa = simpleAgg.aggregations as any;
          totalViews = Math.round(sa?.total_views?.value || 0);
          activeSources = Math.round(sa?.active_sources?.value || 0);
        } catch {
          this.logger.warn("Could not compute active sources aggregation");
        }
      }
      const avgViewsPerPost = totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

      // Views in current vs previous period for change %
      const viewsCurRes = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: { range: { created_at: { gte: from, lte: to } } },
        aggs: { v: { sum: { field: "views" } } },
      });
      const viewsPrevRes = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: { range: { created_at: { gte: prevFrom, lt: prevTo } } },
        aggs: { v: { sum: { field: "views" } } },
      });
      const viewsCur = (viewsCurRes.aggregations as any)?.v?.value || 0;
      const viewsPrev = (viewsPrevRes.aggregations as any)?.v?.value || 0;
      const totalViewsChange =
        viewsPrev > 0 ? Math.round(((viewsCur - viewsPrev) / viewsPrev) * 100) : 0;

      return {
        totalPosts,
        newPosts,
        newPostsChange,
        flaggedPosts,
        flaggedPostsChange,
        totalViews,
        totalViewsChange,
        activeSources,
        avgViewsPerPost,
      };
    } catch (error) {
      this.logger.error("Failed to fetch dashboard stats", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getActivityTrend(
    startDate?: string,
    endDate?: string,
    interval?: "day" | "week" | "month"
  ): Promise<ActivityTrendItem[]> {
    try {
      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const from = startDate || defaultFrom;
      const to = endDate || now.toISOString();
      const calendarInterval = interval || "week";

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: { range: { created_at: { gte: from, lte: to } } },
        aggs: {
          trend: {
            date_histogram: {
              field: "created_at",
              calendar_interval: calendarInterval,
              min_doc_count: 0,
              extended_bounds: {
                min: from,
                max: to,
              },
            },
            aggs: {
              views: { sum: { field: "views" } },
            },
          },
        },
      });

      const buckets = (result.aggregations as any)?.trend?.buckets || [];
      return buckets.map((b: any) => ({
        date: b.key_as_string,
        views: Math.round(b.views?.value || 0),
        posts: b.doc_count,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch activity trend", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getTopSources(startDate?: string, endDate?: string, limit?: number): Promise<TopSourceItem[]> {
    try {
      const size = limit || 5;
      const now = new Date();
      const from = startDate || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();

      // Try channel field first, then channel.keyword, then author.keyword fallback
      const tryAgg = async (field: string, withFilter: boolean): Promise<any[]> => {
        try {
          const must: any[] = [
            { range: { created_at: { gte: from, lte: to } } },
          ];
          if (withFilter) {
            must.push({ exists: { field: field.replace(".keyword", "") } });
          }
          const body: any = {
            index: "posts",
            size: 0,
            query: { bool: { must } },
            aggs: {
              sources: {
                terms: { field, size, order: { views: "desc" } },
                aggs: { views: { sum: { field: "views" } } },
              },
            },
          };
          const res = await this.elasticsearchService.search(body);
          return (res.aggregations as any)?.sources?.buckets || [];
        } catch (e) {
          this.logger.warn(`Top sources aggregation failed for field "${field}": ${e instanceof Error ? e.message : e}`);
          return [];
        }
      };

      let buckets = await tryAgg("channel", true);
      if (!buckets.length) buckets = await tryAgg("channel.keyword", true);
      if (!buckets.length) buckets = await tryAgg("author.keyword", false);
      if (!buckets.length) buckets = await tryAgg("author", false);

      return buckets.map((b: any, i: number) => {
        const raw = b.key;
        const name = typeof raw === "string"
          ? raw
          : (raw?.username || raw?.name || JSON.stringify(raw) || "Unknown");
        return {
          rank: i + 1,
          name,
          handle: name.startsWith("@") ? name : `@${name.replace(/\s+/g, "_").toLowerCase()}`,
          posts: b.doc_count,
          views: Math.round(b.views?.value || 0),
        };
      });
    } catch (error) {
      this.logger.error("Failed to fetch top sources", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getMostViewed(startDate?: string, endDate?: string, limit?: number): Promise<MostViewedItem[]> {
    try {
      const size = limit || 5;
      const now = new Date();
      const from = startDate || new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();

      const result = await this.elasticsearchService.search({
        index: "posts",
        size,
        query: { range: { created_at: { gte: from, lte: to } } },
        sort: [{ views: { order: "desc" } }],
        _source: [
          "post_id",
          "author",
          "platform",
          "text_content",
          "views",
          "created_at",
          "keywords",
          "ihra_labels",
          "hashtags",
          "mentions",
          "sentiment",
          "country_of_origin",
          "channel",
          "language",
          "likes",
          "shares",
          "comments_count",
          "url",
          "antisemitism_score",
        ],
      });

      const hits = (result as any).hits?.hits || [];
      return hits.map((hit: any) => {
        const s = hit._source || {};
        const rawAuthor = s.author;
        const author = typeof rawAuthor === "string"
          ? rawAuthor
          : (rawAuthor?.username || rawAuthor?.name || JSON.stringify(rawAuthor) || "Unknown");
        const category =
          (Array.isArray(s.ihra_labels) && s.ihra_labels[0]) ||
          (Array.isArray(s.keywords) && s.keywords[0]) ||
          s.sentiment ||
          "Uncategorized";
        const rawChannel = s.channel;
        const channel = rawChannel == null
          ? null
          : typeof rawChannel === "string"
            ? rawChannel
            : (rawChannel?.username || rawChannel?.name || String(rawChannel));
        return {
          source: author,
          handle: author.startsWith("@") ? author : `@${author.replace(/\s+/g, "_").toLowerCase()}`,
          views: Math.round(Number(s.views) || 0),
          date: s.created_at ?? null,
          category: String(category),
          preview: String(s.text_content || ""),
          postId: String(s.post_id || hit._id || ""),
          platform: String(s.platform || "unknown"),
          country: s.country_of_origin ? String(s.country_of_origin) : null,
          channel,
          language: s.language ? String(s.language) : null,
          antisemitismScore: s.antisemitism_score != null ? Number(s.antisemitism_score) : null,
          keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [],
          hashtags: Array.isArray(s.hashtags) ? s.hashtags.map(String) : [],
          ihraLabels: Array.isArray(s.ihra_labels) ? s.ihra_labels.map(String) : [],
          mentions: Array.isArray(s.mentions) ? s.mentions.map(String) : [],
          likes: Number(s.likes) || 0,
          shares: Number(s.shares) || 0,
          commentsCount: Number(s.comments_count) || 0,
          url: s.url ? String(s.url) : null,
        };
      });
    } catch (error) {
      this.logger.error("Failed to fetch most viewed", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getTopAuthors(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<TopAuthorItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const from = startDate || defaultStart;
      const to = endDate || defaultEnd;
      const size = limit || 6;

      const result = await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: from, lte: to } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
              { exists: { field: "author" } },
            ],
          },
        },
        aggs: {
          top_authors: {
            terms: { field: "author", size },
          },
          total: {
            value_count: { field: "author" },
          },
        },
      });

      const aggregations = result.aggregations as any;
      const buckets = aggregations?.top_authors?.buckets || [];
      const total = aggregations?.total?.value || 1;

      return buckets.map((bucket: any) => ({
        author: bucket.key,
        count: bucket.doc_count,
        percentage: Math.round((bucket.doc_count / total) * 1000) / 10,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch top authors data", error instanceof Error ? error.stack : error);
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async searchPosts(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    author?: string;
    keywords?: string;
    hashtags?: string;
    platform?: string;
    language?: string;
    country?: string;
    sentiment?: string;
    minScore?: number;
    maxScore?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    startDate?: string;
    endDate?: string;
  }): Promise<PostSearchResult> {
    try {
      const page = params.page && params.page > 0 ? params.page : 1;
      const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
      const from = (page - 1) * pageSize;

      const must: any[] = [];
      const filter: any[] = [];

      // Free-text search across content + author
      if (params.search) {
        must.push({
          multi_match: {
            query: params.search,
            fields: ["text_content", "author", "channel"],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        });
      }

      // Helper to split CSV values
      const splitCsv = (v?: string) =>
        v
          ? v
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      // Author - flexible match (supports partial/case-insensitive)
      const authors = splitCsv(params.author);
      if (authors.length === 1) {
        must.push({
          multi_match: {
            query: authors[0],
            fields: ["author", "author.keyword", "channel"],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        });
      } else if (authors.length > 1) {
        must.push({
          bool: {
            should: authors.map((a) => ({
              multi_match: {
                query: a,
                fields: ["author", "author.keyword", "channel"],
                type: "best_fields",
              },
            })),
            minimum_should_match: 1,
          },
        });
      }

      // Keywords (keyword array) - must contain all
      const keywords = splitCsv(params.keywords);
      for (const kw of keywords) {
        filter.push({ term: { keywords: kw } });
      }

      // Hashtags (keyword array)
      const hashtags = splitCsv(params.hashtags);
      for (const ht of hashtags) {
        filter.push({ term: { hashtags: ht } });
      }

      // Platform / source
      const platforms = splitCsv(params.platform);
      if (platforms.length) {
        filter.push({ terms: { platform: platforms } });
      }

      // Country
      const countries = splitCsv(params.country);
      if (countries.length) {
        filter.push({ terms: { country_of_origin: countries } });
      }

      // Sentiment
      const sentiments = splitCsv(params.sentiment);
      if (sentiments.length) {
        filter.push({ terms: { sentiment: sentiments } });
      }

      // Score range
      if (params.minScore !== undefined || params.maxScore !== undefined) {
        const range: any = {};
        if (params.minScore !== undefined) range.gte = params.minScore;
        if (params.maxScore !== undefined) range.lte = params.maxScore;
        filter.push({ range: { antisemitism_score: range } });
      }

      // Date range
      if (params.startDate || params.endDate) {
        const dateRange: any = {};
        if (params.startDate) dateRange.gte = params.startDate;
        if (params.endDate) dateRange.lte = params.endDate;
        filter.push({ range: { created_at: dateRange } });
      }

      const query =
        must.length || filter.length
          ? { bool: { ...(must.length ? { must } : {}), ...(filter.length ? { filter } : {}) } }
          : { match_all: {} };

      const sortField = params.sortBy || "created_at";
      const sortOrder = params.sortOrder || "desc";

      const languageFilter = (params.language || "").trim().toLowerCase();

      // Local hit -> PostItem mapper (resolves/detects language)
      const mapHit = (hit: any): PostItem => {
        const s = hit._source || {};
        const toStr = (v: any): string => {
          if (v == null) return "";
          if (typeof v === "string") return v;
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "object") return v.username || v.name || v.title || JSON.stringify(v);
          return String(v);
        };
        const toArr = (v: any): string[] =>
          Array.isArray(v) ? v.map((x) => typeof x === "object" && x !== null ? (x.username || x.name || String(x)) : String(x)) : v ? [String(v)] : [];
        const toNum = (v: any): number => {
          const n = typeof v === "number" ? v : parseFloat(v);
          return Number.isFinite(n) ? n : 0;
        };
        const rawCountry = toStr(s.country_of_origin);
        const textContent = toStr(s.text_content);
        const detected = resolveLanguage(s.language, textContent);
        return {
          postId: toStr(s.post_id) || hit._id,
          author: toStr(s.author) || "Unknown",
          platform: toStr(s.platform) || "unknown",
          textContent,
          country: rawCountry ? this.normalizeCountry(rawCountry) : null,
          createdAt: s.created_at ?? null,
          antisemitismScore:
            s.antisemitism_score == null ? null : toNum(s.antisemitism_score),
          sentiment: s.sentiment ? toStr(s.sentiment) : null,
          keywords: toArr(s.keywords),
          hashtags: toArr(s.hashtags),
          ihraLabels: toArr(s.ihra_labels),
          mentions: toArr(s.mentions),
          url: s.url ? toStr(s.url) : null,
          language: detected.code === "und" ? null : detected.code,
          channel: s.channel ? toStr(s.channel) : null,
          likes: toNum(s.likes),
          shares: toNum(s.shares),
          commentsCount: toNum(s.comments_count),
          views: toNum(s.views),
        };
      };

      // When filtering by language we must detect in-memory (stored language is
      // unreliable), so fetch a candidate window, detect, filter, then paginate.
      if (languageFilter) {
        const CANDIDATE_CAP = 1000;
        const result = await this.elasticsearchService.search({
          index: "posts",
          from: 0,
          size: CANDIDATE_CAP,
          track_total_hits: true,
          query,
          sort: [{ [sortField]: { order: sortOrder } }],
          _source: { excludes: ["text_vector"] },
        });

        const hits = (result as any).hits?.hits || [];
        const allItems = hits.map(mapHit);
        const filtered = allItems.filter(
          (item: PostItem) => item.language === languageFilter
        );

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const items = filtered.slice(start, start + pageSize);

        return {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }

      const result = await this.elasticsearchService.search({
        index: "posts",
        from,
        size: pageSize,
        track_total_hits: true,
        query,
        sort: [{ [sortField]: { order: sortOrder } }],
        _source: {
          excludes: ["text_vector"],
        },
      });

      const hits = (result as any).hits?.hits || [];
      const totalRaw = (result as any).hits?.total;
      const total =
        typeof totalRaw === "number" ? totalRaw : totalRaw?.value || 0;

      const items: PostItem[] = hits.map(mapHit);

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      this.logger.error(
        "Failed to search posts",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async getLanguages(): Promise<{ code: string; name: string; count: number }[]> {
    try {
      const SAMPLE = 1000;
      const result = await this.elasticsearchService.search({
        index: "posts",
        from: 0,
        size: SAMPLE,
        query: { match_all: {} },
        _source: ["language", "text_content"],
      });

      const hits = (result as any).hits?.hits || [];
      const counts = new Map<string, { name: string; count: number }>();

      for (const hit of hits) {
        const s = hit._source || {};
        const detected = resolveLanguage(s.language, s.text_content);
        if (detected.code === "und") continue;
        const existing = counts.get(detected.code);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(detected.code, { name: detected.name, count: 1 });
        }
      }

      return Array.from(counts.entries())
        .map(([code, { name, count }]) => ({ code, name, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(
        "Failed to fetch languages",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException("Elasticsearch service is unavailable");
    }
  }

  async translateToEnglish(
    text: string,
    source?: string
  ): Promise<{ translatedText: string; detectedSource: string }> {
    if (!text || !text.trim()) {
      return { translatedText: "", detectedSource: source || "auto" };
    }

    // Cap length to keep the request reasonable
    const input = text.slice(0, 5000);
    const sl = source && source.length <= 5 ? source : "auto";

    try {
      const url =
        "https://translate.googleapis.com/translate_a/single" +
        `?client=gtx&sl=${encodeURIComponent(sl)}&tl=en&dt=t&q=${encodeURIComponent(input)}`;

      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!res.ok) {
        throw new Error(`Translate API responded ${res.status}`);
      }

      const data: any = await res.json();
      // data[0] is an array of segments; each segment[0] is translated text
      const segments: any[] = Array.isArray(data?.[0]) ? data[0] : [];
      const translatedText = segments
        .map((seg) => (Array.isArray(seg) ? seg[0] : ""))
        .join("");
      const detectedSource =
        (typeof data?.[2] === "string" && data[2]) || sl;

      return {
        translatedText: translatedText || input,
        detectedSource,
      };
    } catch (error) {
      this.logger.error(
        "Failed to translate text",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException("Translation service is unavailable");
    }
  }
}
