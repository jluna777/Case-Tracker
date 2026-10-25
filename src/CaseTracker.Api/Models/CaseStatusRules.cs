using System.Globalization;

namespace CaseTracker.Api.Models;

public static class CaseStatusRules
{
    // An array rather than a method so EF can translate OpenStatuses.Contains(c.Status) to SQL.
    public static readonly CaseStatus[] OpenStatuses =
        [CaseStatus.New, CaseStatus.InProgress, CaseStatus.WaitingOnCustomer];

    private static readonly Dictionary<CaseStatus, CaseStatus[]> NextStatuses = new()
    {
        [CaseStatus.New] = [CaseStatus.InProgress],
        [CaseStatus.InProgress] = [CaseStatus.WaitingOnCustomer, CaseStatus.Resolved],
        [CaseStatus.WaitingOnCustomer] = [CaseStatus.InProgress, CaseStatus.Resolved],
        [CaseStatus.Resolved] = [CaseStatus.Closed],
        [CaseStatus.Closed] = [],
    };

    public static IReadOnlyList<CaseStatus> GetNextStatuses(CaseStatus from) => NextStatuses[from];

    public static bool CanMove(CaseStatus from, CaseStatus to) => NextStatuses[from].Contains(to);

    // Checks run in the spec's precedence order, so e.g. Closed → Closed reports "already Closed".
    public static string? GetMoveError(CaseStatus from, CaseStatus to)
    {
        if (CanMove(from, to)) return null;
        if (from == to) return $"Case is already {to.Label()}.";
        if (from == CaseStatus.Closed) return "Closed cases must be reopened before work can continue.";
        if (from == CaseStatus.Resolved) return "Resolved cases must be reopened before work can continue.";
        if (to == CaseStatus.Closed) return "Resolve the case before closing it.";
        return $"Can't move a case from {from.Label()} to {to.Label()}.";
    }

    public static bool CanReopen(CaseStatus from) => from is CaseStatus.Resolved or CaseStatus.Closed;

    public static string? GetReopenError(CaseStatus from) =>
        CanReopen(from) ? null : "Only Resolved or Closed cases can be reopened.";

    public static string? GetNoteError(CaseStatus status) =>
        status == CaseStatus.Closed ? "Closed cases must be reopened before notes can be added." : null;

    // Calendar hours, not business hours.
    public static DateTime CalculateDue(Priority priority, DateTime createdAtUtc) => priority switch
    {
        Priority.High => createdAtUtc.AddHours(24),
        Priority.Medium => createdAtUtc.AddHours(72),
        Priority.Low => createdAtUtc.AddHours(120),
        _ => throw new ArgumentOutOfRangeException(nameof(priority)),
    };

    // Waiting on Customer still counts: the clock keeps running while we wait.
    public static bool IsOverdue(CaseStatus status, DateTime dueAtUtc, DateTime nowUtc) =>
        OpenStatuses.Contains(status) && nowUtc > dueAtUtc;

    // The due time is baked into stored text, so it uses server local time rather than each viewer's.
    public static string CreatedNote(string actor, Priority priority, DateTime dueAtUtc, TimeZoneInfo localZone)
    {
        var dueLocal = TimeZoneInfo.ConvertTimeFromUtc(dueAtUtc, localZone);
        return $"Case created by {actor} · priority {priority} · due {dueLocal.ToString("ddd, MMM d, h:mm tt", CultureInfo.InvariantCulture)}";
    }

    public static string StatusChangedNote(CaseStatus from, CaseStatus to, string actor) =>
        $"Status changed from {from.Label()} to {to.Label()} by {actor}";

    public static string ReopenedNote(CaseStatus from, string actor) =>
        $"Case reopened by {actor} ({from.Label()} → {CaseStatus.InProgress.Label()})";
}
