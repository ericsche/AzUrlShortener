
import { UrlApiClient } from '../UrlApiClient';

export interface IShortUrlProps {
  isDarkTheme: boolean;
  apiClient: UrlApiClient;
}

export interface IUrlInfo {
  url: string;
  activeUrl: string;
  title: string;
  shortUrl: string;
  clicks: number;
  isArchived?: boolean;
  schedulesPropertyRaw?: string;
  schedules: unknown[];
  partitionKey: string;
  rowKey: string;
  timestamp?: string;
  eTag?: unknown;
  createdDate?: string;
}

export interface IShortUrlRequest {
  vanity: string;
  url: string;
  title: string;
  schedules: unknown[];
}
