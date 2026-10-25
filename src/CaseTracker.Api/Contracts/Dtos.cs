using CaseTracker.Api.Models;

namespace CaseTracker.Api.Contracts;

public record CaseSummary(
    int Id, string Title, string Customer, Category Category, Priority Priority, CaseStatus Status,
    string? Assignee, DateTime CreatedAt, DateTime DueAt, bool IsOverdue)
{
    public static CaseSummary From(Case c, DateTime nowUtc) => new(
        c.Id, c.Title, c.Customer, c.Category, c.Priority, c.Status,
        c.Assignee, c.CreatedAt, c.DueAt, CaseStatusRules.IsOverdue(c.Status, c.DueAt, nowUtc));
}

public record CaseDetail(
    int Id, string Title, string Customer, Category Category, Priority Priority, CaseStatus Status,
    string? Assignee, DateTime CreatedAt, DateTime DueAt, bool IsOverdue,
    string? Description, string CreatedBy, DateTime? ResolvedAt, DateTime? ClosedAt,
    IReadOnlyList<CaseStatus> AllowedNextStatuses, bool CanReopen, List<CaseNoteDto> Notes)
{
    public static CaseDetail From(Case c, DateTime nowUtc) => new(
        c.Id, c.Title, c.Customer, c.Category, c.Priority, c.Status,
        c.Assignee, c.CreatedAt, c.DueAt, CaseStatusRules.IsOverdue(c.Status, c.DueAt, nowUtc),
        c.Description, c.CreatedBy, c.ResolvedAt, c.ClosedAt,
        CaseStatusRules.GetNextStatuses(c.Status), CaseStatusRules.CanReopen(c.Status),
        c.Notes.OrderBy(n => n.CreatedAt).ThenBy(n => n.Id).Select(CaseNoteDto.From).ToList());
}

// Named with a Dto suffix to avoid clashing with the CaseNote entity; the JSON shape is the spec's CaseNote.
public record CaseNoteDto(int Id, NoteKind Kind, string? Author, string Body, DateTime CreatedAt)
{
    public static CaseNoteDto From(CaseNote n) => new(n.Id, n.Kind, n.Author, n.Body, n.CreatedAt);
}

public record QueueSummary(int Open, int Overdue, int WaitingOnCustomer, int ResolvedToday);

// Everything is nullable so missing fields reach validation instead of silently defaulting
// (a missing priority would otherwise bind as High, the enum's first value).
public record CreateCaseRequest(
    string? Title, string? Customer, Category? Category, Priority? Priority,
    string? Assignee, string? Description, string? Actor);

public record ChangeStatusRequest(CaseStatus? Status, string? Actor);

public record ReopenRequest(string? Actor);

public record AddNoteRequest(string? Body, string? Actor);
