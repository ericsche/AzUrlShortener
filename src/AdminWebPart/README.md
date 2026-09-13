# AzUrlShortener Admin Web Part

This SharePoint Framework web part replaces the Razor administration site. It
runs in SharePoint, Microsoft Teams, Outlook, and Microsoft 365 and calls the
AzUrlShortener administration API with the signed-in user's Entra token through
SPFx `AadHttpClient`.

It was consolidated from
[`ericsche/ShortURLAdm`](https://github.com/ericsche/ShortURLAdm) at commit
`ad04dab`.

## Authentication setup

1. Register the API in Microsoft Entra ID and expose the delegated
   `access_as_user` scope.
2. Add an app role named `UrlAdmin` and assign it to the security group allowed
   to manage short URLs.
3. Configure the API deployment with:
   - `AZURE_ENTRA_TENANT_ID`
   - `AZURE_API_CLIENT_ID`
   - `AZURE_SHAREPOINT_ORIGIN`, for example
     `https://contoso.sharepoint.com`
4. In `config/package-solution.json`, make sure the resource name matches the
   Entra enterprise application's display name.
5. Replace `api://REPLACE-WITH-API-CLIENT-ID` in
   `src/webparts/shortUrl/ShortUrlWebPart.manifest.json` with the API Application
   ID URI and set the deployed API URL.

After the `.sppkg` is deployed, approve the pending `access_as_user` API
permission in the SharePoint admin center.

## Build

SPFx 1.20.1 requires Node.js 18.

```powershell
npm ci
npx gulp bundle --ship
npx gulp package-solution --ship
```

The SharePoint package is generated at
`sharepoint\solution\short-url-adm.sppkg`. Teams Toolkit uses
`teamsapp.yml` to package and publish the Teams personal tab.
