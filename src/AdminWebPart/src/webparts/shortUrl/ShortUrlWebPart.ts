import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'ShortUrlWebPartStrings';
import ShortUrl from './components/ShortUrl';
import { IShortUrlProps } from './components/IShortUrlProps';
import { UrlApiClient } from './UrlApiClient';

export interface IShortUrlWebPartProps {
  apiBaseUrl: string;
  apiResourceUri: string;
}

export default class ShortUrlWebPart extends BaseClientSideWebPart<IShortUrlWebPartProps> {
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

  protected onPropertyPaneFieldChanged(
    propertyPath: string,
    oldValue: unknown,
    newValue: unknown
  ): void {
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
    this.configureApiClient()
      .then(() => this.render())
      .catch(error => {
        this._apiClient = undefined;
        this._configurationError = error instanceof Error ? error.message : strings.ConfigurationRequired;
        this.render();
      });
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

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('apiBaseUrl', {
                  label: strings.ApiBaseUrlFieldLabel
                }),
                PropertyPaneTextField('apiResourceUri', {
                  label: strings.ApiResourceUriFieldLabel
                })
              ]
            }
          ]
        }
      ]
    };
  }

  private async configureApiClient(): Promise<void> {
    const apiBaseUrl = this.properties.apiBaseUrl?.trim();
    const apiResourceUri = this.properties.apiResourceUri?.trim();

    if (!apiBaseUrl || !apiResourceUri || apiResourceUri.indexOf('REPLACE-WITH') >= 0) {
      this._apiClient = undefined;
      this._configurationError = strings.ConfigurationRequired;
      return;
    }

    try {
      const client = await this.context.aadHttpClientFactory.getClient(apiResourceUri);
      this._apiClient = new UrlApiClient(client, apiBaseUrl);
      this._configurationError = undefined;
    } catch (error) {
      this._apiClient = undefined;
      this._configurationError = error instanceof Error ? error.message : strings.ConfigurationRequired;
    }
  }
}
