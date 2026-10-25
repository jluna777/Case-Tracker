using System.Text.Json.Serialization;
using CaseTracker.Api.Data;
using CaseTracker.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=cases.db"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

// Recreate and reseed on every startup so the demo data (including overdue cases) is always fresh.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureDeleted();
    db.Database.EnsureCreated();
    SeedData.Seed(db, app.Services.GetRequiredService<TimeProvider>());
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGroup("/api").MapCaseEndpoints();
// Unknown API routes must 404 as API errors, not fall through to the SPA's index.html.
app.Map("/api/{**rest}", () => Results.NotFound());
// Client-side routes like /cases/1047 need index.html on refresh.
app.MapFallbackToFile("index.html");

app.Run();
