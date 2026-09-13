# Functions Admin

This .NET 10 isolated Azure Functions app hosts the authenticated administration
API for ShortUrlV2. The public redirect remains in `FunctionsLight`.

All HTTP triggers use `AuthorizationLevel.Anonymous` because Azure Easy Auth
validates the bearer token before the Functions worker runs. The worker
middleware then requires the `UrlAdmin` app role from the
`X-MS-CLIENT-PRINCIPAL` header.

## Deploy

Requires Azure CLI and Azure Functions Core Tools.

```powershell
.\Deploy-Flex.ps1
```

The script provisions or updates:

- Flex Consumption Function App `amvcc-urlshort-admin-flex`;
- .NET 10 isolated runtime with 2,048 MB instances and scale-to-zero;
- system-assigned managed identity;
- `Storage Table Data Contributor` access to `amvccurlshortnerb834`;
- CORS for `https://amvcc.sharepoint.com`;
- Easy Auth using the dedicated `AMVCC URL Shortener API` registration.

The deployed API base URL is:

```text
https://amvcc-urlshort-admin-flex.azurewebsites.net
```
