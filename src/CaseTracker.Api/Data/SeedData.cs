using CaseTracker.Api.Models;

namespace CaseTracker.Api.Data;

// Times are relative to startup so the demo always has two overdue cases and one due within 2 hours.
public static class SeedData
{
    public static void Seed(AppDbContext db, TimeProvider time)
    {
        var now = time.GetUtcNow().UtcDateTime;
        var zone = time.LocalTimeZone;
        var todayFloor = TimeZoneInfo.ConvertTimeToUtc(time.GetLocalNow().Date, zone).AddMinutes(5);

        // Keeps the "resolved today" cases on today's date even right after midnight, without going past now.
        DateTime ResolvedToday(TimeSpan ago)
        {
            var at = now - ago;
            if (at < todayFloor) at = todayFloor;
            return at > now ? now : at;
        }

        Case Add(int id, string title, string customer, Category category, Priority priority,
            string assignee, string createdBy, DateTime createdAt, string description)
        {
            var c = new Case
            {
                Id = id,
                Title = title,
                Customer = customer,
                Category = category,
                Priority = priority,
                Status = CaseStatus.New,
                Assignee = assignee,
                Description = description,
                CreatedBy = createdBy,
                CreatedAt = createdAt,
                DueAt = CaseStatusRules.CalculateDue(priority, createdAt),
            };
            SystemNote(c, createdAt, CaseStatusRules.CreatedNote(createdBy, priority, c.DueAt, zone));
            db.Cases.Add(c);
            return c;
        }

        // ---- Open cases ----

        var c1047 = Add(1047, "Sales orders stopped posting to ERP", "Prairie Valve & Pump",
            Category.Integration, Priority.High, "John", "Amy", now - T(29, 15),
            "Since about 8:40 AM, sales orders created in D365 Sales are no longer appearing in the ERP. The warehouse team has 23 orders they can’t pick. No errors are visible in D365. Customer contact: Lena Ortiz, IT Manager.");
        AgentNote(c1047, c1047.CreatedAt + T(0, 7), "Amy",
            "Lena confirmed the last order that reached the ERP was SO-88412 at 8:36 AM. Nothing changed on their side this morning.");
        // Seed-only text: reassignment isn't a feature.
        SystemNote(c1047, c1047.CreatedAt + T(0, 50), "Assignee changed from Amy to John by Amy");
        Move(c1047, CaseStatus.InProgress, "John", c1047.CreatedAt + T(1, 16));
        AgentNote(c1047, c1047.CreatedAt + T(2, 33), "John",
            "Integration log shows 401 Unauthorized from the ERP endpoint starting 8:37 AM. Looks like the service account password was rotated. Asked their IT for the new credential.");
        AgentNote(c1047, now - T(5, 35), "John",
            "Still no credential from IT. Called their ops manager, who is chasing it now. Orders will replay automatically once auth works.");

        var c1044 = Add(1044, "Member renewal flow sends duplicate emails", "Great Lakes Planning Assn.",
            Category.PowerAutomate, Priority.High, "Amy", "Amy", now - T(26, 50),
            "Members who renew through the portal get the confirmation email two or three times. Started after last week’s flow update.");
        AgentNote(c1044, c1044.CreatedAt + T(0, 20), "Amy",
            "Customer sent three examples from this morning. All three members renewed through the portal, not by phone.");

        var c1049 = Add(1049, "Case routing rules skip the Tier 2 queue", "Harborview Mutual Insurance",
            Category.CustomerService, Priority.High, "Sam", "Sam", now - T(22, 30),
            "Cases that should escalate to the Tier 2 queue stay in Tier 1. Supervisors noticed this morning when SLA warnings started firing.");
        Move(c1049, CaseStatus.InProgress, "Sam", c1049.CreatedAt + T(0, 40));
        AgentNote(c1049, c1049.CreatedAt + T(3, 10), "Sam",
            "Rules route correctly for Email cases but skip Tier 2 for Web cases. The Web origin condition was dropped in the last solution import.");

        var c1042 = Add(1042, "Opportunity sync failing after field mapping change", "Lakeshore Community Foundation",
            Category.D365Sales, Priority.High, "Amy", "Amy", now - T(4, 10),
            "Opportunities created since Monday’s field mapping change aren’t syncing to the marketing platform. The sync job reports a schema mismatch.");
        Move(c1042, CaseStatus.InProgress, "Amy", c1042.CreatedAt + T(0, 25));
        AgentNote(c1042, c1042.CreatedAt + T(1, 48), "Amy",
            "The sync fails on the renamed Region field. Asked their admin whether to restore the old field or change the mapping.");
        Move(c1042, CaseStatus.WaitingOnCustomer, "Amy", c1042.CreatedAt + T(1, 50));

        Add(1051, "Quote PDF template missing company logo", "Midwest Fastener Co.",
            Category.D365Sales, Priority.Medium, "John", "John", now - T(25, 25),
            "The quote PDF renders without the company logo since the template was edited. Reps are sending unbranded quotes.");

        var c1046 = Add(1046, "Approval flow times out on large attachments", "Keystone Mechanical Contractors",
            Category.PowerAutomate, Priority.Medium, "Sam", "Sam", now - T(5, 30),
            "Approval requests with large attachments time out and never reach the approver. Smaller attachments go through fine.");
        Move(c1046, CaseStatus.InProgress, "Sam", c1046.CreatedAt + T(0, 30));
        AgentNote(c1046, c1046.CreatedAt + T(2, 0), "Sam",
            "Runs fail when the approval step copies attachments over 20 MB to SharePoint. Testing a link instead of a copy.");

        Add(1050, "Add “Preferred contact” field to case form", "Harborview Mutual Insurance",
            Category.CustomerService, Priority.Low, "Amy", "Amy", now - T(2, 0),
            "Customer wants a required Preferred contact choice (Phone, Email, Text) on the case form for new cases.");

        var c1043 = Add(1043, "Nightly donor import shows encoding errors", "Lakeshore Community Foundation",
            Category.Integration, Priority.Low, "John", "John", now - T(0, 30),
            "Donor names with accents show as garbled characters after the nightly import. About 40 records are affected each night.");
        Move(c1043, CaseStatus.InProgress, "John", c1043.CreatedAt + T(0, 8));
        AgentNote(c1043, c1043.CreatedAt + T(0, 20), "John",
            "Garbled accents point to the export file’s encoding. Asked their IT to send last night’s file so we can check it.");
        Move(c1043, CaseStatus.WaitingOnCustomer, "John", c1043.CreatedAt + T(0, 22));

        // ---- Resolved / closed cases ----

        var c1038 = Add(1038, "Safety training sign-up form not creating contacts", "Keystone Mechanical Contractors",
            Category.PowerAutomate, Priority.Medium, "Sam", "Sam", now - T(76, 30),
            "Sign-ups submitted through the safety training form are saved, but no contact record is created in D365. Started after the form was updated on Oct 16.");
        var resolved1038 = now - T(46, 48);
        Move(c1038, CaseStatus.InProgress, "Sam", c1038.CreatedAt + T(3, 12));
        AgentNote(c1038, resolved1038 - T(0, 2), "Sam",
            "The new “Certification type” field was mapped to a choice column that doesn’t exist, so the flow’s Create row step failed silently. Fixed the mapping and replayed 41 sign-ups.");
        Move(c1038, CaseStatus.Resolved, "Sam", resolved1038);
        AgentNote(c1038, now - T(0, 19), "Sam", "Customer confirmed new sign-ups are creating contacts. Closing.");
        Move(c1038, CaseStatus.Closed, "Sam", now - T(0, 18));

        var c1039 = Add(1039, "Lead scoring flow skips new web leads", "Midwest Fastener Co.",
            Category.PowerAutomate, Priority.Medium, "Amy", "Amy", now - T(30, 0),
            "New leads from the website form aren’t getting a lead score. Leads entered by hand score normally.");
        var resolved1039 = ResolvedToday(T(1, 30));
        Move(c1039, CaseStatus.InProgress, "Amy", c1039.CreatedAt + T(1, 0));
        AgentNote(c1039, resolved1039 - T(0, 5), "Amy",
            "The trigger filtered on lead source “Website”, but the new form sends “Web”. Updated the filter and rescored 12 leads.");
        Move(c1039, CaseStatus.Resolved, "Amy", resolved1039);

        var c1040 = Add(1040, "Email-to-case creates duplicate cases", "Harborview Mutual Insurance",
            Category.CustomerService, Priority.High, "Amy", "Amy", now - T(20, 0),
            "Every email sent to the support mailbox creates two identical cases.");
        var resolved1040 = ResolvedToday(T(3, 0));
        Move(c1040, CaseStatus.InProgress, "Amy", c1040.CreatedAt + T(0, 30));
        AgentNote(c1040, resolved1040 - T(0, 10), "Amy",
            "Two email-to-case rules were active for the same mailbox after the migration. Turned off the old one and merged the 9 duplicates.");
        Move(c1040, CaseStatus.Resolved, "Amy", resolved1040);

        var c1041 = Add(1041, "Invoice sync rejects zero-dollar lines", "Prairie Valve & Pump",
            Category.Integration, Priority.Low, "Sam", "Sam", now - T(50, 0),
            "Invoices with a zero-dollar line, like free samples, fail to sync to the ERP.");
        var resolved1041 = ResolvedToday(T(5, 0));
        Move(c1041, CaseStatus.InProgress, "Sam", c1041.CreatedAt + T(2, 0));
        AgentNote(c1041, resolved1041 - T(0, 15), "Sam",
            "The ERP rejects lines with a zero amount. Added a step that skips them and re-sent the 6 failed invoices.");
        Move(c1041, CaseStatus.Resolved, "Sam", resolved1041);

        var c1045 = Add(1045, "Dashboard chart shows wrong fiscal year", "Great Lakes Planning Assn.",
            Category.D365Sales, Priority.Low, "John", "John", now - TimeSpan.FromDays(10),
            "The pipeline dashboard groups revenue by calendar year instead of their July–June fiscal year.");
        var resolved1045 = now - TimeSpan.FromDays(7);
        Move(c1045, CaseStatus.InProgress, "John", c1045.CreatedAt + T(4, 0));
        AgentNote(c1045, resolved1045 - T(0, 10), "John",
            "The chart grouped by calendar year. Switched it to the fiscal year field and confirmed with their finance lead.");
        Move(c1045, CaseStatus.Resolved, "John", resolved1045);
        Move(c1045, CaseStatus.Closed, "John", now - TimeSpan.FromDays(6));

        var c1048 = Add(1048, "Contact merge loses phone numbers", "Lakeshore Community Foundation",
            Category.CustomerService, Priority.Medium, "John", "John", now - TimeSpan.FromDays(4),
            "Merging duplicate contacts drops the phone numbers from the record being merged in.");
        var resolved1048 = now - TimeSpan.FromDays(3);
        Move(c1048, CaseStatus.InProgress, "John", c1048.CreatedAt + T(2, 0));
        AgentNote(c1048, resolved1048 - T(0, 10), "John",
            "The merge kept only the primary record’s phone fields. Restored the lost numbers from audit history for the 14 affected contacts.");
        Move(c1048, CaseStatus.Resolved, "John", resolved1048);
        Move(c1048, CaseStatus.Closed, "John", now - TimeSpan.FromDays(2));

        db.SaveChanges();
    }

    private static TimeSpan T(int hours, int minutes) => new(hours, minutes, 0);

    private static void Move(Case c, CaseStatus to, string actor, DateTime at)
    {
        SystemNote(c, at, CaseStatusRules.StatusChangedNote(c.Status, to, actor));
        c.Status = to;
        if (to == CaseStatus.Resolved) c.ResolvedAt = at;
        if (to == CaseStatus.Closed) c.ClosedAt = at;
    }

    private static void SystemNote(Case c, DateTime at, string body) =>
        c.Notes.Add(new CaseNote { Kind = NoteKind.System, Body = body, CreatedAt = at });

    private static void AgentNote(Case c, DateTime at, string author, string body) =>
        c.Notes.Add(new CaseNote { Kind = NoteKind.Agent, Author = author, Body = body, CreatedAt = at });
}
