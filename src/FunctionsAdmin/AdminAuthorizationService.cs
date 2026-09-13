using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Cloud5mins.ShortenerTools.FunctionsAdmin;

public sealed class AdminAuthorizationService
{
    private static readonly HashSet<string> RoleClaimTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "role",
        "roles",
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    };

    private readonly ILogger<AdminAuthorizationService> _logger;
    private readonly string _requiredRole;

    public AdminAuthorizationService(
        IConfiguration configuration,
        ILogger<AdminAuthorizationService> logger)
    {
        _logger = logger;
        _requiredRole = configuration["Authorization:AdminRole"] ?? "UrlAdmin";
    }

    public AuthorizationResult Authorize(HttpRequestData request)
    {
        if (!request.Headers.TryGetValues("X-MS-CLIENT-PRINCIPAL", out var values))
        {
            return AuthorizationResult.Unauthorized;
        }

        try
        {
            var encodedPrincipal = values.Single();
            var json = Encoding.UTF8.GetString(Convert.FromBase64String(encodedPrincipal));
            var principal = JsonSerializer.Deserialize<ClientPrincipal>(json);

            if (principal is null)
            {
                return AuthorizationResult.Unauthorized;
            }

            var hasRole = principal.UserRoles.Contains(_requiredRole, StringComparer.OrdinalIgnoreCase)
                || principal.Claims.Any(claim =>
                    RoleClaimTypes.Contains(claim.Type)
                    && string.Equals(claim.Value, _requiredRole, StringComparison.OrdinalIgnoreCase));

            return hasRole ? AuthorizationResult.Authorized : AuthorizationResult.Forbidden;
        }
        catch (Exception ex) when (ex is FormatException or JsonException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "The Easy Auth client principal header is invalid.");
            return AuthorizationResult.Unauthorized;
        }
    }

    private sealed class ClientPrincipal
    {
        [JsonPropertyName("claims")]
        public List<ClientPrincipalClaim> Claims { get; init; } = [];

        [JsonPropertyName("user_roles")]
        public List<string> UserRoles { get; init; } = [];
    }

    private sealed class ClientPrincipalClaim
    {
        [JsonPropertyName("typ")]
        public string Type { get; init; } = string.Empty;

        [JsonPropertyName("val")]
        public string Value { get; init; } = string.Empty;
    }
}

public enum AuthorizationResult
{
    Authorized,
    Unauthorized,
    Forbidden
}
