using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();
// Unknown API routes must 404 as API errors, not fall through to the SPA's index.html.
app.Map("/api/{**rest}", () => Results.NotFound());
// Client-side routes like /cases/1047 need index.html on refresh.
app.MapFallbackToFile("index.html");

app.Run();
