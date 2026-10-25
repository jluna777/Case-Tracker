using CaseTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CaseTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Case> Cases => Set<Case>();
    public DbSet<CaseNote> Notes => Set<CaseNote>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<CaseStatus>().HaveConversion<string>();
        builder.Properties<Priority>().HaveConversion<string>();
        builder.Properties<Category>().HaveConversion<string>();
        builder.Properties<NoteKind>().HaveConversion<string>();

        // SQLite doesn't store DateTimeKind. Without this, dates come back Unspecified and
        // serialize without a trailing "Z", so browsers would read UTC times as local.
        builder.Properties<DateTime>().HaveConversion<UtcConverter>();
    }

    private class UtcConverter() : ValueConverter<DateTime, DateTime>(
        v => v,
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
}
