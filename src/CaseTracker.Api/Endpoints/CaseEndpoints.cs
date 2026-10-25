using CaseTracker.Api.Contracts;
using CaseTracker.Api.Data;
using CaseTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CaseTracker.Api.Endpoints;

public static class CaseEndpoints
{
    public static RouteGroupBuilder MapCaseEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/cases", ListCases);
        api.MapGet("/cases/summary", GetSummary);
        api.MapGet("/cases/{id:int}", GetCase);
        api.MapPost("/cases", CreateCase);
        api.MapPatch("/cases/{id:int}/status", ChangeStatus);
        api.MapPost("/cases/{id:int}/reopen", Reopen);
        api.MapPost("/cases/{id:int}/notes", AddNote);
        return api;
    }

    private static async Task<IResult> ListCases(
        string? status, string? priority, string? category, AppDbContext db, TimeProvider time)
    {
        IQueryable<Case> query = db.Cases;

        if (string.IsNullOrEmpty(status) || status.Equals("open", StringComparison.OrdinalIgnoreCase))
            query = query.Where(c => CaseStatusRules.OpenStatuses.Contains(c.Status));
        else if (Enum.TryParse(status, true, out CaseStatus s) && Enum.IsDefined(s))
            query = query.Where(c => c.Status == s);
        else if (!status.Equals("all", StringComparison.OrdinalIgnoreCase))
            return BadRequest($"Unknown status filter '{status}'.");

        if (!string.IsNullOrEmpty(priority))
        {
            if (!(Enum.TryParse(priority, true, out Priority p) && Enum.IsDefined(p)))
                return BadRequest($"Unknown priority filter '{priority}'.");
            query = query.Where(c => c.Priority == p);
        }

        if (!string.IsNullOrEmpty(category))
        {
            if (!(Enum.TryParse(category, true, out Category cat) && Enum.IsDefined(cat)))
                return BadRequest($"Unknown category filter '{category}'.");
            query = query.Where(c => c.Category == cat);
        }

        var cases = await query.OrderBy(c => c.DueAt).ThenBy(c => c.Id).ToListAsync();
        var now = time.GetUtcNow().UtcDateTime;
        return Results.Ok(cases.Select(c => CaseSummary.From(c, now)));
    }

    private static async Task<IResult> GetSummary(AppDbContext db, TimeProvider time)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var today = time.GetLocalNow().Date;

        // Counted in memory so IsOverdue stays the single definition of "overdue"; the queue is small.
        var open = await db.Cases
            .Where(c => CaseStatusRules.OpenStatuses.Contains(c.Status))
            .Select(c => new { c.Status, c.DueAt })
            .ToListAsync();
        var resolvedAts = await db.Cases
            .Where(c => c.ResolvedAt != null)
            .Select(c => c.ResolvedAt!.Value)
            .ToListAsync();

        return Results.Ok(new QueueSummary(
            Open: open.Count,
            Overdue: open.Count(c => CaseStatusRules.IsOverdue(c.Status, c.DueAt, now)),
            WaitingOnCustomer: open.Count(c => c.Status == CaseStatus.WaitingOnCustomer),
            ResolvedToday: resolvedAts.Count(r => TimeZoneInfo.ConvertTimeFromUtc(r, time.LocalTimeZone).Date == today)));
    }

    private static async Task<IResult> GetCase(int id, AppDbContext db, TimeProvider time)
    {
        var c = await LoadCase(db, id);
        return c is null ? CaseNotFound(id) : Results.Ok(CaseDetail.From(c, time.GetUtcNow().UtcDateTime));
    }

    private static async Task<IResult> CreateCase(CreateCaseRequest req, AppDbContext db, TimeProvider time)
    {
        var errors = Validate(req);
        if (errors.Count > 0) return Results.ValidationProblem(errors);

        var now = time.GetUtcNow().UtcDateTime;
        var c = new Case
        {
            Title = req.Title!.Trim(),
            Customer = req.Customer!,
            Category = req.Category!.Value,
            Priority = req.Priority!.Value,
            Status = CaseStatus.New,
            Assignee = req.Assignee,
            Description = string.IsNullOrWhiteSpace(req.Description) ? null : req.Description.Trim(),
            CreatedBy = req.Actor!,
            CreatedAt = now,
            DueAt = CaseStatusRules.CalculateDue(req.Priority.Value, now),
        };
        c.Notes.Add(SystemNote(now, CaseStatusRules.CreatedNote(req.Actor!, c.Priority, c.DueAt, time.LocalTimeZone)));

        db.Cases.Add(c);
        await db.SaveChangesAsync();
        return Results.Created($"/api/cases/{c.Id}", CaseDetail.From(c, now));
    }

    private static async Task<IResult> ChangeStatus(int id, ChangeStatusRequest req, AppDbContext db, TimeProvider time)
    {
        if (!IsAgent(req.Actor)) return UnknownActor();
        if (req.Status is not { } to || !Enum.IsDefined(to)) return BadRequest("Status is required.");

        var c = await LoadCase(db, id);
        if (c is null) return CaseNotFound(id);

        var error = CaseStatusRules.GetMoveError(c.Status, to);
        if (error is not null) return BadRequest(error);

        var now = time.GetUtcNow().UtcDateTime;
        c.Notes.Add(SystemNote(now, CaseStatusRules.StatusChangedNote(c.Status, to, req.Actor!)));
        c.Status = to;
        if (to == CaseStatus.Resolved) c.ResolvedAt = now;
        if (to == CaseStatus.Closed) c.ClosedAt = now;

        await db.SaveChangesAsync();
        return Results.Ok(CaseDetail.From(c, now));
    }

    private static async Task<IResult> Reopen(int id, ReopenRequest req, AppDbContext db, TimeProvider time)
    {
        if (!IsAgent(req.Actor)) return UnknownActor();

        var c = await LoadCase(db, id);
        if (c is null) return CaseNotFound(id);

        var error = CaseStatusRules.GetReopenError(c.Status);
        if (error is not null) return BadRequest(error);

        var now = time.GetUtcNow().UtcDateTime;
        c.Notes.Add(SystemNote(now, CaseStatusRules.ReopenedNote(c.Status, req.Actor!)));
        c.Status = CaseStatus.InProgress;
        c.ResolvedAt = null;
        c.ClosedAt = null;

        await db.SaveChangesAsync();
        return Results.Ok(CaseDetail.From(c, now));
    }

    private static async Task<IResult> AddNote(int id, AddNoteRequest req, AppDbContext db, TimeProvider time)
    {
        if (!IsAgent(req.Actor)) return UnknownActor();
        if (string.IsNullOrWhiteSpace(req.Body)) return BadRequest("Note can't be empty.");
        var body = req.Body.Trim();
        if (body.Length > 2000) return BadRequest("Note must be 2000 characters or fewer.");

        var c = await db.Cases.FindAsync(id);
        if (c is null) return CaseNotFound(id);

        var error = CaseStatusRules.GetNoteError(c.Status);
        if (error is not null) return BadRequest(error);

        var note = new CaseNote
        {
            CaseId = id,
            Kind = NoteKind.Agent,
            Author = req.Actor,
            Body = body,
            CreatedAt = time.GetUtcNow().UtcDateTime,
        };
        db.Notes.Add(note);
        await db.SaveChangesAsync();
        // No GET route for a single note, so there's no Location to point at.
        return Results.Created((string?)null, CaseNoteDto.From(note));
    }

    // Keys are camelCase field names so the form can show each error under its input.
    private static Dictionary<string, string[]> Validate(CreateCaseRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(req.Title))
            errors["title"] = ["Title is required."];
        else if (req.Title.Trim().Length > 120)
            errors["title"] = ["Title must be 120 characters or fewer."];

        if (req.Customer is null || !ReferenceData.Customers.Contains(req.Customer))
            errors["customer"] = ["Choose a customer from the list."];

        if (req.Category is not { } category || !Enum.IsDefined(category))
            errors["category"] = ["Category is required."];

        if (req.Priority is not { } priority || !Enum.IsDefined(priority))
            errors["priority"] = ["Priority is required."];

        if (req.Assignee is not null && !IsAgent(req.Assignee))
            errors["assignee"] = ["Assignee must be Amy, John, Sam, or Unassigned."];

        if (req.Description?.Trim().Length > 2000)
            errors["description"] = ["Description must be 2000 characters or fewer."];

        if (!IsAgent(req.Actor))
            errors["actor"] = ["Acting agent must be Amy, John, or Sam."];

        return errors;
    }

    private static Task<Case?> LoadCase(AppDbContext db, int id) =>
        db.Cases.Include(c => c.Notes).FirstOrDefaultAsync(c => c.Id == id);

    private static bool IsAgent(string? name) => name is not null && ReferenceData.Agents.Contains(name);

    private static CaseNote SystemNote(DateTime at, string body) =>
        new() { Kind = NoteKind.System, Body = body, CreatedAt = at };

    private static IResult BadRequest(string detail) => Results.Problem(detail: detail, statusCode: 400);

    private static IResult UnknownActor() => BadRequest("Acting agent must be Amy, John, or Sam.");

    private static IResult CaseNotFound(int id) => Results.Problem(detail: $"Case #{id} was not found.", statusCode: 404);
}
