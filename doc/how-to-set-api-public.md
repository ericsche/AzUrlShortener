# Administration API security

The administration API has public HTTPS ingress because the SharePoint
Framework web part calls it from the user's browser. Public ingress does not
make the operations anonymous.

The API validates Microsoft Entra access tokens and requires both:

- delegated scope `access_as_user`;
- app role `UrlAdmin`.

The deployment also restricts browser calls with CORS to
`AZURE_SHAREPOINT_ORIGIN`, for example `https://contoso.sharepoint.com`.

Configure the Entra tenant and API application before deployment:

```powershell
azd env set AZURE_ENTRA_TENANT_ID <tenant-id>
azd env set AZURE_API_CLIENT_ID <api-application-client-id>
azd env set AZURE_SHAREPOINT_ORIGIN https://contoso.sharepoint.com
```

Do not use Function keys in the web part. The SPFx `AadHttpClient` obtains a
token for the configured API resource without storing a credential in browser
code.
