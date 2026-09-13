using Azure.Data.Tables;
using Cloud5mins.ShortenerTools.Core.Domain;
using Cloud5mins.ShortenerTools.Core.Messages;
using Cloud5mins.ShortenerTools.Core.Service;
using Cloud5mins.ShortenerTools.Core.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Cloud5mins.ShortenerTools.FunctionsAdmin;

// Easy Auth authenticates requests before the worker runs; middleware enforces UrlAdmin.
public sealed class AdminFunctions
{
    private readonly ILogger<AdminFunctions> _logger;
    private readonly UrlServices _urlServices;
    private readonly string _customDomain;

    public AdminFunctions(
        TableServiceClient tableServiceClient,
        IConfiguration configuration,
        ILogger<AdminFunctions> logger)
    {
        _logger = logger;
        _urlServices = new UrlServices(logger, new AzStrorageTablesService(tableServiceClient));
        _customDomain = configuration["CustomDomain"] ?? "https://amvcc.com";
    }

    [Function("UrlList")]
    public async Task<HttpResponseData> UrlList(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "UrlList")]
        HttpRequestData request)
    {
        try
        {
            var result = await _urlServices.List(_customDomain);
            return await JsonResponse(request, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlCreate")]
    public async Task<HttpResponseData> UrlCreate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlCreate")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<ShortRequest>(request);
            var result = await _urlServices.Create(input, _customDomain);
            return await JsonResponse(request, HttpStatusCode.Created, result);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlUpdate")]
    public async Task<HttpResponseData> UrlUpdate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlUpdate")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<ShortUrlEntity>(request);
            var result = await _urlServices.Update(input, _customDomain);
            return await JsonResponse(request, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlArchive")]
    public async Task<HttpResponseData> UrlArchive(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlArchive")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<ShortUrlEntity>(request);
            await _urlServices.Archive(input);
            return request.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlClickStatsByDay")]
    public async Task<HttpResponseData> UrlClickStatsByDay(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlClickStatsByDay")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<UrlClickStatsRequest>(request);
            var result = await _urlServices.ClickStatsByDay(input, _customDomain);
            return await JsonResponse(request, HttpStatusCode.OK, result);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlDataImport")]
    public async Task<HttpResponseData> UrlDataImport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlDataImport")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<UrlDetails>(request);
            await _urlServices.ImportUrlDataAsync(input);
            return request.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    [Function("UrlClickStatsImport")]
    public async Task<HttpResponseData> UrlClickStatsImport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "UrlClickStatsImport")]
        HttpRequestData request)
    {
        try
        {
            var input = await ReadRequiredBody<List<ClickStatsEntity>>(request);
            await _urlServices.ImportClickStatsAsync(input);
            return request.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            return await ErrorResponse(request, ex);
        }
    }

    private async Task<HttpResponseData> ErrorResponse(HttpRequestData request, Exception exception)
    {
        _logger.LogError(exception, "The administration request failed.");

        var (statusCode, message) = exception switch
        {
            ShortenerToolException shortenerException =>
                (shortenerException.StatusCode, shortenerException.Message),
            JsonException =>
                (HttpStatusCode.BadRequest, "The request body contains invalid JSON."),
            _ =>
                (HttpStatusCode.InternalServerError, "An unexpected error was encountered.")
        };

        return await JsonResponse(
            request,
            statusCode,
            new DetailedBadRequest { Message = message });
    }

    private static async Task<T> ReadRequiredBody<T>(HttpRequestData request)
    {
        return await request.ReadFromJsonAsync<T>()
            ?? throw new ShortenerToolException(
                HttpStatusCode.BadRequest,
                "A request body is required.");
    }

    private static async Task<HttpResponseData> JsonResponse<T>(
        HttpRequestData request,
        HttpStatusCode statusCode,
        T value)
    {
        var response = request.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(value);
        return response;
    }
}
