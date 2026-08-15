import { resolveLanguage } from "./language.util";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadRequestException,
} from "@nestjs/common";
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
  IhraCategoryItem,
  TopicBreakdownItem,
  SemanticSearchItem,
} from "./interfaces/dashboard.interfaces";

/* ─── Elasticsearch helper types ──────────────────────────────────────── */

interface EsBucket {
  key: string;
  doc_count: number;
  [agg: string]: unknown;
}

interface EsTermsAgg {
  buckets: EsBucket[];
}

interface EsValueAgg {
  value: number | null;
  value_as_string?: string;
}

interface EsDateHistogramBucket {
  key: number;
  key_as_string: string;
  doc_count: number;
  [agg: string]: unknown;
}

interface EsDateHistogramAgg {
  buckets: EsDateHistogramBucket[];
}

interface EsHit {
  _id: string;
  _score: number | null;
  _source: Record<string, unknown>;
}

interface EsSearchResponse {
  hits: {
    total: { value: number } | number;
    hits: EsHit[];
  };
  aggregations?: Record<string, unknown>;
}

/* ─── Service ─────────────────────────────────────────────────────────── */

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  private keywordFilter(keywords?: string[]) {
    if (!keywords || keywords.length === 0) return [];
    return [{ terms: { "keywords.keyword": keywords } }];
  }

  async ping(): Promise<boolean> {
    try {
      await this.elasticsearchService.ping();
      return true;
    } catch (error) {
      this.logger.error(
        "Elasticsearch ping failed",
        error instanceof Error ? error.stack : error
      );
      return false;
    }
  }

  async getDateBounds(): Promise<{ earliest: string; latest: string }> {
    try {
      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        aggs: {
          earliest: { min: { field: "created_at" } },
          latest: { max: { field: "created_at" } },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { earliest: EsValueAgg; latest: EsValueAgg }
        | undefined;
      return {
        earliest:
          aggs?.earliest?.value_as_string || new Date().toISOString(),
        latest: aggs?.latest?.value_as_string || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        "Failed to fetch date bounds",
        error instanceof Error ? error.stack : error
      );
      return {
        earliest: new Date().toISOString(),
        latest: new Date().toISOString(),
      };
    }
  }

  async getThreatTrend(
    startDate?: string,
    endDate?: string,
    interval?: "day" | "week" | "month",
    keywords?: string[]
  ): Promise<ThreatTrendItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const from = startDate || defaultStart.toISOString();
      const to = endDate || now.toISOString();
      const calendarInterval = interval || "day";

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              { exists: { field: "antisemitism_score" } },
              { range: { created_at: { gte: from, lte: to } } },
            ],
            filter: [...this.keywordFilter(keywords)],
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
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { trend: EsDateHistogramAgg }
        | undefined;
      const buckets = aggs?.trend?.buckets || [];

      return buckets.map((bucket) => ({
        date: bucket.key_as_string,
        avgScore: (bucket.avg_score as EsValueAgg)?.value || 0,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch threat trend data",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getSentimentDistribution(
    startDate?: string,
    endDate?: string,
    keywords?: string[]
  ): Promise<SentimentDistributionItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const start = startDate || defaultStart;
      const end = endDate || defaultEnd;

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { created_at: { gte: start, lte: end } } },
              ...this.keywordFilter(keywords),
            ],
          },
        },
        aggs: {
          sentiment_distribution: {
            terms: {
              field: "sentiment.keyword",
              size: 10,
            },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { sentiment_distribution: EsTermsAgg }
        | undefined;
      const buckets = aggs?.sentiment_distribution?.buckets || [];

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
      this.logger.error(
        "Failed to fetch sentiment distribution data",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getTopKeywords(
    startDate?: string,
    endDate?: string,
    limit?: number,
    keywords?: string[]
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

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: from, lte: to } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
            ],
            filter: [...this.keywordFilter(keywords)],
          },
        },
        aggs: {
          top_keywords: {
            terms: {
              field: "keywords.keyword",
              size: size,
            },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { top_keywords: EsTermsAgg }
        | undefined;
      const buckets = aggs?.top_keywords?.buckets || [];

      return buckets.map((bucket) => ({
        keyword: bucket.key,
        count: bucket.doc_count,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch top keywords data",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getGeographicDistribution(
    startDate?: string,
    endDate?: string,
    keywords?: string[]
  ): Promise<GeographicDistributionItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const from = startDate || defaultStart;
      const to = endDate || defaultEnd;

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: from, lte: to } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
              { exists: { field: "country_of_origin" } },
            ],
            filter: [...this.keywordFilter(keywords)],
          },
        },
        aggs: {
          countries: {
            terms: {
              field: "country_of_origin.keyword",
              size: 50,
            },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { countries: EsTermsAgg }
        | undefined;
      const buckets = aggs?.countries?.buckets || [];

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
      this.logger.error(
        "Failed to fetch geographic distribution data",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  private normalizeCountry(raw: string): string {
    if (!raw) return raw;
    const key = raw.trim().toLowerCase();
    const aliases: Record<string, string> = {
      usa: "United States",
      us: "United States",
      "u.s.": "United States",
      "u.s.a.": "United States",
      "united states": "United States",
      "united states of america": "United States",
      america: "United States",
      uk: "United Kingdom",
      "u.k.": "United Kingdom",
      "great britain": "United Kingdom",
      britain: "United Kingdom",
      england: "United Kingdom",
      "united kingdom": "United Kingdom",
      uae: "United Arab Emirates",
      "united arab emirates": "United Arab Emirates",
      russia: "Russia",
      "russian federation": "Russia",
      "south korea": "South Korea",
      "republic of korea": "South Korea",
      "czech republic": "Czechia",
      czechia: "Czechia",
    };
    if (aliases[key]) return aliases[key];
    // Title-case fallback for unknown values
    return raw
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  async getStats(
    startDate?: string,
    endDate?: string,
    keywords?: string[]
  ): Promise<DashboardStats> {
    try {
      const now = new Date();
      const from =
        startDate ||
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();
      const kwFilter = this.keywordFilter(keywords);
      // Compute previous period of same duration for comparison
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      const duration = toMs - fromMs;
      const prevFrom = new Date(fromMs - duration).toISOString();
      const prevTo = from;

      const mkQuery = (rangeFilter: Record<string, unknown>) => ({
        bool: {
          must: [rangeFilter],
          filter: [...kwFilter],
        },
      });

      // Total posts count
      const totalResult = await this.elasticsearchService.count({
        index: "posts",
        query: mkQuery({ range: { created_at: { gte: from, lte: to } } }),
      });
      const totalPosts = totalResult.count;

      // New posts in selected period
      const newPosts = totalPosts;

      // Posts from previous period (for comparison)
      const prevPostsResult = await this.elasticsearchService.count({
        index: "posts",
        query: mkQuery({
          range: { created_at: { gte: prevFrom, lt: prevTo } },
        }),
      });
      const prevPosts = prevPostsResult.count;
      const newPostsChange =
        prevPosts > 0
          ? Math.round(((newPosts - prevPosts) / prevPosts) * 100)
          : 0;

      // Flagged posts (antisemitism_score > 0.5)
      const flaggedResult = await this.elasticsearchService.count({
        index: "posts",
        query: {
          bool: {
            must: [
              { range: { created_at: { gte: from, lte: to } } },
              { range: { antisemitism_score: { gt: 0.5 } } },
            ],
            filter: [...kwFilter],
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
            filter: [...kwFilter],
          },
        },
      });
      const prevFlagged = prevFlaggedResult.count;
      const flaggedPostsChange =
        prevFlagged > 0
          ? Math.round(((flaggedPosts - prevFlagged) / prevFlagged) * 100)
          : 0;

      // Reach (views) + active sources via aggregations
      let totalViews = 0;
      let activeSources = 0;
      let avgThreatScore = 0;
      try {
        const aggResult = (await this.elasticsearchService.search({
          index: "posts",
          size: 0,
          query: mkQuery({ range: { created_at: { gte: from, lte: to } } }),
          aggs: {
            total_views: { sum: { field: "views" } },
            active_sources: {
              cardinality: { field: "channel.username.keyword" },
            },
            avg_threat: { avg: { field: "antisemitism_score" } },
          },
        })) as unknown as EsSearchResponse;

        const aggs = aggResult.aggregations as
          | {
              total_views: EsValueAgg;
              active_sources: EsValueAgg;
              avg_threat: EsValueAgg;
            }
          | undefined;
        totalViews = Math.round(aggs?.total_views?.value || 0);
        activeSources = Math.round(aggs?.active_sources?.value || 0);
        avgThreatScore = aggs?.avg_threat?.value ?? 0;
      } catch {
        try {
          const simpleAgg = (await this.elasticsearchService.search({
            index: "posts",
            size: 0,
            query: mkQuery({ range: { created_at: { gte: from, lte: to } } }),
            aggs: {
              total_views: { sum: { field: "views" } },
              active_sources: {
                cardinality: { field: "author.username.keyword" },
              },
              avg_threat: { avg: { field: "antisemitism_score" } },
            },
          })) as unknown as EsSearchResponse;

          const sa = simpleAgg.aggregations as
            | {
                total_views: EsValueAgg;
                active_sources: EsValueAgg;
                avg_threat: EsValueAgg;
              }
            | undefined;
          totalViews = Math.round(sa?.total_views?.value || 0);
          activeSources = Math.round(sa?.active_sources?.value || 0);
          avgThreatScore = sa?.avg_threat?.value ?? 0;
        } catch {
          this.logger.warn("Could not compute active sources aggregation");
        }
      }
      const avgViewsPerPost =
        totalPosts > 0 ? Math.round(totalViews / totalPosts) : 0;

      // Views in current vs previous period for change %
      const viewsCurRes = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: mkQuery({ range: { created_at: { gte: from, lte: to } } }),
        aggs: { v: { sum: { field: "views" } } },
      })) as unknown as EsSearchResponse;

      const viewsPrevRes = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: mkQuery({
          range: { created_at: { gte: prevFrom, lt: prevTo } },
        }),
        aggs: { v: { sum: { field: "views" } } },
      })) as unknown as EsSearchResponse;

      const viewsCur =
        (viewsCurRes.aggregations?.v as EsValueAgg | undefined)?.value || 0;
      const viewsPrev =
        (viewsPrevRes.aggregations?.v as EsValueAgg | undefined)?.value || 0;
      const totalViewsChange =
        viewsPrev > 0
          ? Math.round(((viewsCur - viewsPrev) / viewsPrev) * 100)
          : 0;

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
        avgThreatScore: Math.round(avgThreatScore * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        "Failed to fetch dashboard stats",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getActivityTrend(
    startDate?: string,
    endDate?: string,
    interval?: "day" | "week" | "month",
    keywords?: string[]
  ): Promise<ActivityTrendItem[]> {
    try {
      const now = new Date();
      const defaultFrom = new Date(
        now.getTime() - 365 * 24 * 60 * 60 * 1000
      ).toISOString();
      const from = startDate || defaultFrom;
      const to = endDate || now.toISOString();
      const calendarInterval = interval || "week";

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            must: [{ range: { created_at: { gte: from, lte: to } } }],
            filter: [...this.keywordFilter(keywords)],
          },
        },
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
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { trend: EsDateHistogramAgg }
        | undefined;
      const buckets = aggs?.trend?.buckets || [];
      return buckets.map((b) => ({
        date: b.key_as_string,
        views: Math.round((b.views as EsValueAgg)?.value || 0),
        posts: b.doc_count,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch activity trend",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getTopSources(
    startDate?: string,
    endDate?: string,
    limit?: number,
    keywords?: string[]
  ): Promise<TopSourceItem[]> {
    try {
      const size = limit || 5;
      const now = new Date();
      const from =
        startDate ||
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();
      const kwF = this.keywordFilter(keywords);

      interface SourceBucket extends EsBucket {
        views: EsValueAgg;
      }

      const tryAgg = async (
        field: string,
        withFilter: boolean
      ): Promise<SourceBucket[]> => {
        try {
          const must: Record<string, unknown>[] = [
            { range: { created_at: { gte: from, lte: to } } },
          ];
          if (withFilter) {
            must.push({ exists: { field: field.replace(".keyword", "") } });
          }
          const res = (await this.elasticsearchService.search({
            index: "posts",
            size: 0,
            query: { bool: { must, filter: [...kwF] } },
            aggs: {
              sources: {
                terms: { field, size, order: { views: "desc" } },
                aggs: { views: { sum: { field: "views" } } },
              },
            },
          })) as unknown as EsSearchResponse;

          const aggs = res.aggregations as
            | { sources: { buckets: SourceBucket[] } }
            | undefined;
          return aggs?.sources?.buckets || [];
        } catch (e) {
          this.logger.warn(
            `Top sources aggregation failed for field "${field}": ${e instanceof Error ? e.message : e}`
          );
          return [];
        }
      };

      let buckets = await tryAgg("channel.username.keyword", true);
      if (!buckets.length)
        buckets = await tryAgg("author.username.keyword", false);

      return buckets.map((b, i) => {
        const raw = b.key;
        const name =
          typeof raw === "string" ? raw : String(raw) || "Unknown";
        return {
          rank: i + 1,
          name,
          handle: name.startsWith("@")
            ? name
            : `@${name.replace(/\s+/g, "_").toLowerCase()}`,
          posts: b.doc_count,
          views: Math.round(b.views?.value || 0),
        };
      });
    } catch (error) {
      this.logger.error(
        "Failed to fetch top sources",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getMostViewed(
    startDate?: string,
    endDate?: string,
    limit?: number,
    keywords?: string[]
  ): Promise<MostViewedItem[]> {
    try {
      const size = limit || 5;
      const now = new Date();
      const from =
        startDate ||
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size,
        query: {
          bool: {
            must: [{ range: { created_at: { gte: from, lte: to } } }],
            filter: [...this.keywordFilter(keywords)],
          },
        },
        sort: [
          {
            _script: {
              type: "number",
              script: {
                source:
                  "(doc.containsKey('views') && doc['views'].size() > 0 ? doc['views'].value : 0) * 0.5 + (doc.containsKey('likes') && doc['likes'].size() > 0 ? doc['likes'].value : 0) * 0.3 + (doc.containsKey('shares') && doc['shares'].size() > 0 ? doc['shares'].value : 0) * 0.2",
              },
              order: "desc",
            },
          },
        ],
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
      })) as unknown as EsSearchResponse;

      const hits = result.hits?.hits || [];
      return hits.map((hit) => {
        const s = hit._source;
        const rawAuthor = s.author;
        const author =
          typeof rawAuthor === "string"
            ? rawAuthor
            : (rawAuthor as Record<string, string>)?.username ||
              (rawAuthor as Record<string, string>)?.name ||
              JSON.stringify(rawAuthor) ||
              "Unknown";
        const category =
          (Array.isArray(s.ihra_labels) && (s.ihra_labels[0] as string)) ||
          (Array.isArray(s.keywords) && (s.keywords[0] as string)) ||
          (s.sentiment as string) ||
          "Uncategorized";
        const rawChannel = s.channel;
        const channel =
          rawChannel == null
            ? null
            : typeof rawChannel === "string"
              ? rawChannel
              : (rawChannel as Record<string, string>)?.username ||
                (rawChannel as Record<string, string>)?.name ||
                String(rawChannel);
        return {
          source: author,
          handle: author.startsWith("@")
            ? author
            : `@${author.replace(/\s+/g, "_").toLowerCase()}`,
          views: Math.round(Number(s.views) || 0),
          date: (s.created_at as string) ?? null,
          category: String(category),
          preview: String(s.text_content || ""),
          postId: String(s.post_id || hit._id || ""),
          platform: String(s.platform || "unknown"),
          country: s.country_of_origin
            ? String(s.country_of_origin)
            : null,
          channel,
          language: s.language ? String(s.language) : null,
          sentiment: s.sentiment ? String(s.sentiment) : null,
          antisemitismScore:
            s.antisemitism_score != null
              ? Number(s.antisemitism_score)
              : null,
          keywords: Array.isArray(s.keywords)
            ? (s.keywords as string[]).map(String)
            : [],
          hashtags: Array.isArray(s.hashtags)
            ? (s.hashtags as string[]).map(String)
            : [],
          ihraLabels: Array.isArray(s.ihra_labels)
            ? (s.ihra_labels as string[]).map(String)
            : [],
          mentions: Array.isArray(s.mentions)
            ? (s.mentions as string[]).map(String)
            : [],
          likes: Number(s.likes) || 0,
          shares: Number(s.shares) || 0,
          commentsCount: Number(s.comments_count) || 0,
          url: s.url ? String(s.url) : null,
          popularity: Math.round(
            (Number(s.views) || 0) * 0.5 +
              (Number(s.likes) || 0) * 0.3 +
              (Number(s.shares) || 0) * 0.2
          ),
        };
      });
    } catch (error) {
      this.logger.error(
        "Failed to fetch most viewed",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getTopAuthors(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<TopAuthorItem[]> {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const defaultEnd = now.toISOString().split("T")[0];

      const from = startDate || defaultStart;
      const to = endDate || defaultEnd;
      const size = limit || 6;

      const result = (await this.elasticsearchService.search({
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
            terms: { field: "author.username.keyword", size },
          },
          total: {
            value_count: { field: "author.username.keyword" },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { top_authors: EsTermsAgg; total: EsValueAgg }
        | undefined;
      const buckets = aggs?.top_authors?.buckets || [];
      const total = aggs?.total?.value || 1;

      return buckets.map((bucket) => ({
        author: bucket.key,
        count: bucket.doc_count,
        percentage: Math.round((bucket.doc_count / total) * 1000) / 10,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch top authors data",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
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
      const pageSize =
        params.pageSize && params.pageSize > 0 ? params.pageSize : 20;
      const from = (page - 1) * pageSize;

      const must: Record<string, unknown>[] = [];
      const filter: Record<string, unknown>[] = [];

      // Free-text search across content + author
      if (params.search) {
        must.push({
          multi_match: {
            query: params.search,
            fields: [
              "text_content",
              "author.name",
              "author.username",
              "channel.name",
              "channel.username",
            ],
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

      // Author / source filter — exact match on object subfields
      const authors = splitCsv(params.author);
      if (authors.length > 0) {
        filter.push({
          bool: {
            should: [
              { terms: { "channel.username.keyword": authors } },
              { terms: { "author.username.keyword": authors } },
              { terms: { "author.name.keyword": authors } },
            ],
            minimum_should_match: 1,
          },
        });
      }

      // Keywords — match posts containing ANY of the specified keywords
      const keywords = splitCsv(params.keywords);
      if (keywords.length > 0) {
        filter.push({ terms: { "keywords.keyword": keywords } });
      }

      // Hashtags (keyword array)
      const hashtags = splitCsv(params.hashtags);
      for (const ht of hashtags) {
        filter.push({ term: { "hashtags.keyword": ht } });
      }

      // Platform / source
      const platforms = splitCsv(params.platform);
      if (platforms.length) {
        filter.push({ terms: { "platform.keyword": platforms } });
      }

      // Country
      const countries = splitCsv(params.country);
      if (countries.length) {
        filter.push({ terms: { "country_of_origin.keyword": countries } });
      }

      // Sentiment
      const sentiments = splitCsv(params.sentiment);
      if (sentiments.length) {
        filter.push({ terms: { "sentiment.keyword": sentiments } });
      }

      // Score range
      if (params.minScore !== undefined || params.maxScore !== undefined) {
        const range: Record<string, number> = {};
        if (params.minScore !== undefined) range.gte = params.minScore;
        if (params.maxScore !== undefined) range.lte = params.maxScore;
        filter.push({ range: { antisemitism_score: range } });
      }

      // Date range
      if (params.startDate || params.endDate) {
        const dateRange: Record<string, string> = {};
        if (params.startDate) dateRange.gte = params.startDate;
        if (params.endDate) dateRange.lte = params.endDate;
        filter.push({ range: { created_at: dateRange } });
      }

      // Language filter
      const languages = splitCsv(params.language);
      if (languages.length) {
        filter.push({ terms: { "language.keyword": languages } });
      }

      const finalQuery =
        must.length || filter.length
          ? {
              bool: {
                ...(must.length ? { must } : {}),
                ...(filter.length ? { filter } : {}),
              },
            }
          : { match_all: {} };

      const sortFieldMap: Record<string, string> = {
        author: "author.username.keyword",
        sentiment: "sentiment.keyword",
        country: "country_of_origin.keyword",
      };
      const rawSort = params.sortBy || "created_at";
      const sortField = sortFieldMap[rawSort] || rawSort;
      const sortOrder = params.sortOrder || "desc";

      // Local hit -> PostItem mapper
      const mapHit = (hit: EsHit): PostItem => {
        const s = hit._source;
        const toStr = (v: unknown): string => {
          if (v == null) return "";
          if (typeof v === "string") return v;
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "object") {
            const obj = v as Record<string, unknown>;
            return (
              String(obj.username || obj.name || obj.title || "") ||
              JSON.stringify(v)
            );
          }
          return String(v);
        };
        const toArr = (v: unknown): string[] =>
          Array.isArray(v)
            ? v.map((x: unknown) =>
                typeof x === "object" && x !== null
                  ? String(
                      (x as Record<string, unknown>).username ||
                        (x as Record<string, unknown>).name ||
                        x
                    )
                  : String(x)
              )
            : v
              ? [String(v)]
              : [];
        const toNum = (v: unknown): number => {
          const n = typeof v === "number" ? v : parseFloat(String(v));
          return Number.isFinite(n) ? n : 0;
        };
        const rawCountry = toStr(s.country_of_origin);
        const textContent = toStr(s.text_content);
        return {
          postId: toStr(s.post_id) || hit._id,
          author: toStr(s.author) || "Unknown",
          platform: toStr(s.platform) || "unknown",
          textContent,
          country: rawCountry ? this.normalizeCountry(rawCountry) : null,
          createdAt: (s.created_at as string) ?? null,
          antisemitismScore:
            s.antisemitism_score == null ? null : toNum(s.antisemitism_score),
          sentiment: s.sentiment ? toStr(s.sentiment) : null,
          keywords: toArr(s.keywords),
          hashtags: toArr(s.hashtags),
          ihraLabels: toArr(s.ihra_labels),
          mentions: toArr(s.mentions),
          url: s.url ? toStr(s.url) : null,
          language: s.language ? String(s.language) : null,
          channel: s.channel ? toStr(s.channel) : null,
          likes: toNum(s.likes),
          shares: toNum(s.shares),
          commentsCount: toNum(s.comments_count),
          views: toNum(s.views),
        };
      };

      const keywordFields = new Set([
        "author.username.keyword",
        "sentiment.keyword",
        "country_of_origin.keyword",
        "channel.username.keyword",
      ]);
      const sortClause = keywordFields.has(sortField)
        ? {
            _script: {
              type: "string" as const,
              order: sortOrder,
              script: {
                source: `doc['${sortField}'].size() > 0 ? doc['${sortField}'].value.toLowerCase() : ''`,
              },
            },
          }
        : { [sortField]: { order: sortOrder } };

      const result = (await this.elasticsearchService.search({
        index: "posts",
        from,
        size: pageSize,
        track_total_hits: true,
        query: finalQuery,
        sort: [sortClause],
        _source: {
          excludes: ["text_vector"],
        },
      })) as unknown as EsSearchResponse;

      const hits = result.hits?.hits || [];
      const totalRaw = result.hits?.total;
      const total =
        typeof totalRaw === "number" ? totalRaw : (totalRaw as { value: number })?.value || 0;

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
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getIhraBreakdown(
    startDate?: string,
    endDate?: string,
    keywords?: string[]
  ): Promise<IhraCategoryItem[]> {
    try {
      const now = new Date();
      const from =
        startDate ||
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();

      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: {
          bool: {
            filter: [
              { range: { created_at: { gte: from, lte: to } } },
              ...this.keywordFilter(keywords),
            ],
          },
        },
        aggs: {
          ihra: {
            terms: {
              field: "ihra_labels.keyword",
              size: 20,
            },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as { ihra: EsTermsAgg } | undefined;
      const buckets = aggs?.ihra?.buckets || [];
      return buckets.map((b) => ({
        label: b.key,
        count: b.doc_count,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch IHRA breakdown",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  private static readonly TOPIC_KEYWORD_MAP: Record<string, string[]> = {
    "Conspiracy Theories": [
      "globalist conspiracy",
      "George Soros conspiracy",
      "Rothschild conspiracy",
      "New World Order Jewish conspiracy",
      "Jewish world domination conspiracy",
      "great replacement theory",
    ],
    "Classic Antisemitic Tropes": [
      "blood libel",
      "Jewish control of media",
      "Jewish control of banks or financial system",
      "Protocols of the Elders of Zion",
    ],
    "Holocaust & Historical Violence": [
      "Holocaust denial or distortion",
      "pogrom or mob violence against Jews",
    ],
    "Israel-Related Antisemitism": [
      "Israel genocide accusation",
      "Zionist occupation",
      "Israeli apartheid",
    ],
    "Conflict & Escalation": ["October 7th Hamas attack"],
  };

  async getTopicBreakdown(
    startDate?: string,
    endDate?: string
  ): Promise<TopicBreakdownItem[]> {
    try {
      const now = new Date();
      const from =
        startDate ||
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = endDate || now.toISOString();

      const topics: TopicBreakdownItem[] = [];

      for (const [topic, topicKeywords] of Object.entries(
        DashboardService.TOPIC_KEYWORD_MAP
      )) {
        const result = (await this.elasticsearchService.search({
          index: "posts",
          size: 0,
          query: {
            bool: {
              filter: [
                { range: { created_at: { gte: from, lte: to } } },
                { terms: { "keywords.keyword": topicKeywords } },
              ],
            },
          },
          aggs: {
            total_views: { sum: { field: "views" } },
          },
        })) as unknown as EsSearchResponse;

        const totalRaw = result.hits?.total;
        const postCount =
          typeof totalRaw === "number"
            ? totalRaw
            : (totalRaw as { value: number })?.value || 0;
        const aggs = result.aggregations as
          | { total_views: EsValueAgg }
          | undefined;
        const totalViews = Math.round(aggs?.total_views?.value || 0);

        topics.push({ topic, totalViews, postCount, keywords: topicKeywords });
      }

      return topics.sort((a, b) => b.totalViews - a.totalViews);
    } catch (error) {
      this.logger.error(
        "Failed to fetch topic breakdown",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getCountries(): Promise<{ country: string; count: number }[]> {
    try {
      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: { exists: { field: "country_of_origin" } },
        aggs: {
          countries: {
            terms: { field: "country_of_origin.keyword", size: 100 },
          },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { countries: EsTermsAgg }
        | undefined;
      const buckets = aggs?.countries?.buckets || [];
      return buckets.map((b) => ({
        country: this.normalizeCountry(b.key),
        count: b.doc_count,
      }));
    } catch (error) {
      this.logger.error(
        "Failed to fetch countries",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getSources(): Promise<{ name: string; count: number }[]> {
    const tryField = async (
      field: string
    ): Promise<{ name: string; count: number }[]> => {
      try {
        const result = (await this.elasticsearchService.search({
          index: "posts",
          size: 0,
          aggs: {
            sources: { terms: { field, size: 100 } },
          },
        })) as unknown as EsSearchResponse;

        const aggs = result.aggregations as
          | { sources: EsTermsAgg }
          | undefined;
        const buckets = aggs?.sources?.buckets || [];
        return buckets.map((b) => ({
          name: b.key,
          count: b.doc_count,
        }));
      } catch {
        return [];
      }
    };

    try {
      let sources = await tryField("channel.username.keyword");
      if (!sources.length) sources = await tryField("author.username.keyword");
      if (!sources.length) sources = await tryField("author.name.keyword");
      return sources;
    } catch (error) {
      this.logger.error(
        "Failed to fetch sources",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
    }
  }

  async getLanguages(): Promise<
    { code: string; name: string; count: number }[]
  > {
    try {
      const result = (await this.elasticsearchService.search({
        index: "posts",
        size: 0,
        query: { exists: { field: "language" } },
        aggs: {
          languages: { terms: { field: "language.keyword", size: 50 } },
        },
      })) as unknown as EsSearchResponse;

      const aggs = result.aggregations as
        | { languages: EsTermsAgg }
        | undefined;
      const buckets = aggs?.languages?.buckets || [];

      return buckets
        .map((b) => ({
          code: b.key,
          name: resolveLanguage(b.key, "").name,
          count: b.doc_count,
        }))
        .filter((l) => l.code !== "und");
    } catch (error) {
      this.logger.error(
        "Failed to fetch languages",
        error instanceof Error ? error.stack : error
      );
      throw new ServiceUnavailableException(
        "Elasticsearch service is unavailable"
      );
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

      const data: unknown[][] = await res.json();
      // data[0] is an array of segments; each segment[0] is translated text
      const segments: unknown[] = Array.isArray(data?.[0]) ? data[0] : [];
      const translatedText = segments
        .map((seg) => (Array.isArray(seg) ? (seg[0] as string) : ""))
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
      throw new ServiceUnavailableException(
        "Translation service is unavailable"
      );
    }
  }

  async semanticSearch(
    query: string,
    page = 1,
    pageSize = 20
  ): Promise<{
    items: SemanticSearchItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (!query?.trim()) {
      throw new BadRequestException("query parameter is required");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Semantic search is not configured — GEMINI_API_KEY is missing"
      );
    }

    // Step 1: Embed the query text via Gemini embedding API (must match pipeline: gemini-embedding-2, 768 dims)
    const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
    const dims = parseInt(process.env.GEMINI_EMBEDDING_DIMS || "768", 10);
    const embeddingResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text: query.trim() }] },
          outputDimensionality: dims,
        }),
      }
    );

    if (!embeddingResponse.ok) {
      const errBody = await embeddingResponse.text();
      this.logger.error(`Gemini embedding API error: ${errBody}`);
      throw new ServiceUnavailableException(
        "Failed to generate query embedding"
      );
    }

    interface GeminiEmbeddingResponse {
      embedding?: { values: number[] };
    }

    const embeddingData: GeminiEmbeddingResponse =
      await embeddingResponse.json();
    const queryVector: number[] | undefined = embeddingData?.embedding?.values;
    if (!queryVector?.length) {
      throw new ServiceUnavailableException(
        "Empty embedding returned from Gemini"
      );
    }

    const fromOffset = (page - 1) * pageSize;
    // Step 2: Run purely semantic kNN search with a minimum score threshold
    const result = (await this.elasticsearchService.search({
      index: "posts",
      from: fromOffset,
      size: pageSize,
      min_score: 0.55,
      knn: {
        field: "text_vector",
        query_vector: queryVector,
        k: Math.max(fromOffset + pageSize, 50),
        num_candidates: Math.max((fromOffset + pageSize) * 10, 500),
      },
      _source: { excludes: ["text_vector"] },
    })) as unknown as EsSearchResponse;

    const hits = result.hits?.hits || [];
    const items: SemanticSearchItem[] = hits.map((hit) => {
      const s = hit._source;
      const toStr = (v: unknown): string => {
        if (v == null) return "";
        if (typeof v === "string") return v;
        if (Array.isArray(v)) return v.join(", ");
        if (typeof v === "object") {
          const obj = v as Record<string, unknown>;
          return (
            String(obj.username || obj.name || obj.title || "") ||
            JSON.stringify(v)
          );
        }
        return String(v);
      };
      const toArr = (v: unknown): string[] =>
        Array.isArray(v)
          ? v.map((x: unknown) =>
              typeof x === "object" && x !== null
                ? String(
                    (x as Record<string, unknown>).username ||
                      (x as Record<string, unknown>).name ||
                      x
                  )
                : String(x)
            )
          : v
            ? [String(v)]
            : [];
      const toNum = (v: unknown): number => {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        return Number.isFinite(n) ? n : 0;
      };
      const rawCountry = toStr(s.country_of_origin);
      return {
        postId: toStr(s.post_id) || hit._id,
        author: toStr(s.author) || "Unknown",
        platform: toStr(s.platform) || "unknown",
        textContent: toStr(s.text_content),
        country: rawCountry ? this.normalizeCountry(rawCountry) : null,
        createdAt: (s.created_at as string) ?? null,
        antisemitismScore:
          s.antisemitism_score == null ? null : toNum(s.antisemitism_score),
        sentiment: s.sentiment ? toStr(s.sentiment) : null,
        keywords: toArr(s.keywords),
        hashtags: toArr(s.hashtags),
        ihraLabels: toArr(s.ihra_labels),
        mentions: toArr(s.mentions),
        url: s.url ? toStr(s.url) : null,
        language: s.language ? String(s.language) : null,
        channel: s.channel ? toStr(s.channel) : null,
        likes: toNum(s.likes),
        shares: toNum(s.shares),
        commentsCount: toNum(s.comments_count),
        views: toNum(s.views),
        similarityScore: hit._score ?? 0,
      };
    });

    const totalRaw = result.hits?.total;
    const total =
      typeof totalRaw === "number"
        ? totalRaw
        : (totalRaw as { value: number })?.value || 0;
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
