# Security responsibilities

The redirect Function remains anonymous because browsers must be able to follow
short links. Administration operations are hosted by the separate API and are
protected by Microsoft Entra ID.

The SharePoint Framework web part uses `AadHttpClient` to obtain a delegated
access token for the signed-in SharePoint or Teams user. The API requires:

- the `access_as_user` delegated scope;
- the `admin` app role;
- an allowed SharePoint origin configured through CORS.

Assign `admin` to a security or Microsoft 365 group. Distribution lists do
not emit the `roles` claim and will result in HTTP 403 responses.

Never embed a Function key, client secret, or bearer token in the SPFx bundle.
The API continues to use managed identity for Azure Storage access.
