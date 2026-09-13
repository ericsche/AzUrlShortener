using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using System.Net;

namespace Cloud5mins.ShortenerTools.FunctionsAdmin;

public sealed class AdminAuthorizationMiddleware(
    AdminAuthorizationService authorizationService) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var request = await context.GetHttpRequestDataAsync();
        if (request is null)
        {
            await next(context);
            return;
        }

        var result = authorizationService.Authorize(request);
        if (result == AuthorizationResult.Authorized)
        {
            await next(context);
            return;
        }

        var statusCode = result == AuthorizationResult.Forbidden
            ? HttpStatusCode.Forbidden
            : HttpStatusCode.Unauthorized;

        var response = request.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(new
        {
            Message = statusCode == HttpStatusCode.Forbidden
                ? "The UrlAdmin role is required."
                : "Authentication is required."
        });
        context.GetInvocationResult().Value = response;
    }
}
