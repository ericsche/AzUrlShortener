declare interface IShortUrlWebPartStrings {
  PropertyPaneDescription: string;
  BasicGroupName: string;
  ApiBaseUrlFieldLabel: string;
  ApiResourceUriFieldLabel: string;
  ConfigurationRequired: string;
}

declare module 'ShortUrlWebPartStrings' {
  const strings: IShortUrlWebPartStrings;
  export = strings;
}
