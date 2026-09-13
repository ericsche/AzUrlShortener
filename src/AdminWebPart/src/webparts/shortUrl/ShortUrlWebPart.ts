import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'ShortUrlWebPartStrings';
import { ADMIN_API_BASE_URL, ADMIN_API_RESOURCE_URI } from './ApiConfiguration';
import ShortUrl from './components/ShortUrl';
import { IShortUrlProps } from './components/IShortUrlProps';
import { UrlApiClient } from './UrlApiClient';

export default class ShortUrlWebPart extends BaseClientSideWebPart<Record<string, never>> {
  private _isDarkTheme: boolean = false;
  private _apiClient?: UrlApiClient;
  private _configurationError?: string;

  public render(): void {
    let element: React.ReactElement;

    if (!this._apiClient) {
      element = React.createElement(
        'div',
        { role: 'alert' },
        this._configurationError ?? strings.ConfigurationRequired
      );
    } else {
      element = React.createElement<IShortUrlProps>(
        ShortUrl,
        {
          isDarkTheme: this._isDarkTheme,
          apiClient: this._apiClient
        }
      );
    }

    ReactDom.render(element, this.domElement);
  }

  protected async onInit(): Promise<void> {
    await super.onInit();
    await this.configureApiClient();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  private async configureApiClient(): Promise<void> {
    if (ADMIN_API_RESOURCE_URI.indexOf('REPLACE-WITH') >= 0) {
      this._apiClient = undefined;
      this._configurationError = strings.ConfigurationRequired;
      return;
    }

    try {
      const client = await this.context.aadHttpClientFactory.getClient(ADMIN_API_RESOURCE_URI);
      this._apiClient = new UrlApiClient(client, ADMIN_API_BASE_URL);
      this._configurationError = undefined;
    } catch (error) {
      this._apiClient = undefined;
      this._configurationError = error instanceof Error ? error.message : strings.ConfigurationRequired;
    }
  }
}
