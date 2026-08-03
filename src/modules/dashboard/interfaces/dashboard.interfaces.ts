export interface ThreatTrendItem {
  date: string;
  avgScore: number;
}

export interface SentimentDistributionItem {
  sentiment: string;
  count: number;
}

export interface TopKeywordItem {
  keyword: string;
  count: number;
}

export interface GeographicDistributionItem {
  country: string;
  count: number;
  percentage?: number;
}

export interface DashboardStats {
  totalPosts: number;
  newPosts: number;
  newPostsChange: number;
  flaggedPosts: number;
  flaggedPostsChange: number;
  totalViews: number;
  totalViewsChange: number;
  activeSources: number;
  avgViewsPerPost: number;
  avgThreatScore: number;
}

export interface IhraCategoryItem {
  label: string;
  count: number;
}

export interface TopicBreakdownItem {
  topic: string;
  totalViews: number;
  postCount: number;
  keywords: string[];
}

export interface ActivityTrendItem {
  date: string;
  views: number;
  posts: number;
}

export interface TopSourceItem {
  rank: number;
  name: string;
  handle: string;
  posts: number;
  views: number;
}

export interface MostViewedItem {
  source: string;
  handle: string;
  views: number;
  date: string | null;
  category: string;
  preview: string;
  postId: string;
  platform: string;
  country: string | null;
  channel: string | null;
  language: string | null;
  antisemitismScore: number | null;
  keywords: string[];
  hashtags: string[];
  ihraLabels: string[];
  mentions: string[];
  likes: number;
  shares: number;
  commentsCount: number;
  url: string | null;
}

export interface TopAuthorItem {
  author: string;
  count: number;
  percentage: number;
}

export interface PostItem {
  postId: string;
  author: string;
  platform: string;
  textContent: string;
  country: string | null;
  createdAt: string | null;
  antisemitismScore: number | null;
  sentiment: string | null;
  keywords: string[];
  hashtags: string[];
  ihraLabels: string[];
  mentions: string[];
  url: string | null;
  language: string | null;
  channel: string | null;
  likes: number;
  shares: number;
  commentsCount: number;
  views: number;
}

export interface PostSearchResult {
  items: PostItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
