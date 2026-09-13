import { AadHttpClient, HttpClientResponse } from '@microsoft/sp-http';
import { IShortUrlRequest, IUrlInfo } from './components/IShortUrlProps';

type JsonObject = { [key: string]: unknown };

export class UrlApiClient {
  public constructor(
    private readonly client: AadHttpClient,
    private readonly baseUrl: string
  ) {}

  public async getUrls(): Promise<IUrlInfo[]> {
    const response = await this.client.get(
      this.getUrl('/api/UrlList'),
      AadHttpClient.configurations.v1
    );
    const payload = await this.readJson<JsonObject>(response);
    const urlList = payload.urlList ?? payload.UrlList;

    if (!Array.isArray(urlList)) {
      throw new Error('The API returned an invalid URL list.');
    }

    return urlList.map(item => this.normalizeUrl(item as JsonObject));
  }

  public async createUrl(request: IShortUrlRequest): Promise<void> {
    await this.post('/api/UrlCreate', request);
  }

  public async updateUrl(url: IUrlInfo): Promise<void> {
    await this.post('/api/UrlUpdate', url);
  }

  public async archiveUrl(url: IUrlInfo): Promise<void> {
    await this.post('/api/UrlArchive', url);
  }

  private async post(path: string, body: unknown): Promise<void> {
    const response = await this.client.post(
      this.getUrl(path),
      AadHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    await this.ensureSuccess(response);
  }

  private getUrl(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}${path}`;
  }

  private async readJson<T>(response: HttpClientResponse): Promise<T> {
    await this.ensureSuccess(response);
    return response.json() as Promise<T>;
  }

  private async ensureSuccess(response: HttpClientResponse): Promise<void> {
    if (response.ok) {
      return;
    }

    let message = `${response.status} ${response.statusText}`.trim();
    try {
      const payload = await response.json() as JsonObject;
      const apiMessage = payload.message ?? payload.Message;
      if (typeof apiMessage === 'string' && apiMessage.length > 0) {
        message = apiMessage;
      }
    } catch {
      // Keep the HTTP status when the response has no JSON error body.
    }

    throw new Error(message);
  }

  private normalizeUrl(source: JsonObject): IUrlInfo {
    const get = (camelCase: string, pascalCase: string): unknown =>
      source[camelCase] ?? source[pascalCase];

    return {
      url: String(get('url', 'Url') ?? ''),
      activeUrl: String(get('activeUrl', 'ActiveUrl') ?? ''),
      title: String(get('title', 'Title') ?? ''),
      shortUrl: String(get('shortUrl', 'ShortUrl') ?? ''),
      clicks: Number(get('clicks', 'Clicks') ?? 0),
      isArchived: Boolean(get('isArchived', 'IsArchived') ?? false),
      schedulesPropertyRaw: String(get('schedulesPropertyRaw', 'SchedulesPropertyRaw') ?? ''),
      schedules: Array.isArray(get('schedules', 'Schedules'))
        ? get('schedules', 'Schedules') as unknown[]
        : [],
      partitionKey: String(get('partitionKey', 'PartitionKey') ?? ''),
      rowKey: String(get('rowKey', 'RowKey') ?? ''),
      timestamp: String(get('timestamp', 'Timestamp') ?? ''),
      eTag: source.etag ?? get('eTag', 'ETag'),
      createdDate: String(get('createdDate', 'CreatedDate') ?? '')
    };
  }
}
