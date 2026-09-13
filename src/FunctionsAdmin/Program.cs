using Cloud5mins.ShortenerTools.FunctionsAdmin;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.AddAzureTableServiceClient("strTables");
builder.ConfigureFunctionsWebApplication();
builder.UseMiddleware<AdminAuthorizationMiddleware>();

builder.Services.AddSingleton<AdminAuthorizationService>();

builder.Build().Run();
