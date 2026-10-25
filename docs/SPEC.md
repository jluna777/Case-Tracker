# Case Tracker — Build Spec

A lightweight support case tracker for a consulting firm's managed-services clients. Small take-home project: it should be clean, simple, and buildable in a few hours.

The visual reference is in `design/` (HTML + PNG). This document is the source of truth for **behavior, data, and API**. Where the design and this spec disagree, follow this spec.

---

## 1. Stack and shape

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, built with Vite, React Router |
| Backend | ASP.NET Core Web API using **Minimal APIs** (latest LTS SDK installed; .NET 8+) |
| Domain logic | `CaseStatusRules`: a static class with no EF/HTTP dependencies |
| Data | EF Core + SQLite (`cases.db`), seeded on startup |
| Tests | xUnit project testing `CaseStatusRules` and the due-date calculation |
| Styling | One plain CSS file with CSS variables (tokens in §9). No UI component library. |

**Hosting: single host.** `vite build` outputs into the API's `wwwroot`. ASP.NET Core serves the React app and the API from the same origin, so there's no CORS setup and no hardcoded API URL. One `dotnet run` runs everything.

### Solution layout

```
CaseTracker/
├─ CaseTracker.slnx
├─ README.md                      ← how to run (see §11)
├─ src/
│  ├─ CaseTracker.Api/
│  │  ├─ Program.cs
│  │  ├─ Models/        Case.cs, CaseNote.cs, Enums.cs, CaseStatusRules.cs
│  │  ├─ Data/          AppDbContext.cs, SeedData.cs
│  │  ├─ Endpoints/     CaseEndpoints.cs       (static class, MapCaseEndpoints extension)
│  │  ├─ Contracts/     Dtos.cs               (request/response records)
│  │  └─ wwwroot/       ← React build output (gitignored)
│  └─ CaseTracker.Web/
│     ├─ vite.config.ts
│     └─ src/
│        ├─ main.tsx, App.tsx, api.ts, types.ts, format.ts, styles.css
│        ├─ context/AgentContext.tsx
│        ├─ pages/      CasesPage.tsx, CaseDetailPage.tsx, NewCasePage.tsx
│        └─ components/ Header, SummaryCards, Filters, CaseTable, EmptyState,
│                       StatusPill, PriorityLabel, Avatar, StatusMenu, Timeline, AddNote
└─ tests/
   └─ CaseTracker.Tests/
      ├─ CaseStatusRulesTests.cs
      └─ DueDateTests.cs
```

Keep the domain classes inside the API project (no separate class library) unless it becomes awkward for the test project to reference them. A project reference from Tests to Api is fine.

---

## 2. Domain model

### Enums (stored as strings in SQLite, serialized as strings in JSON)

| Enum | Values | UI label |
|---|---|---|
| `CaseStatus` | `New`, `InProgress`, `WaitingOnCustomer`, `Resolved`, `Closed` | New, In Progress, Waiting on Customer, Resolved, Closed |
| `Priority` | `High`, `Medium`, `Low` | same |
| `Category` | `D365Sales`, `CustomerService`, `PowerAutomate`, `Integration` | D365 Sales, Customer Service, Power Automate, Integration |
| `NoteKind` | `Agent`, `System` | |

"Open" means `New`, `InProgress`, or `WaitingOnCustomer`.

### `Case`

| Field | Type | Notes |
|---|---|---|
| `Id` | int | Seed uses explicit IDs 1038–1051; new cases continue from 1052 |
| `Title` | string | required, max 120 |
| `Customer` | string | must be one of the customers in §8 |
| `Category` | Category | required |
| `Priority` | Priority | required |
| `Status` | CaseStatus | new cases start as `New` |
| `Assignee` | string? | `Amy`, `John`, `Sam`, or null (Unassigned) |
| `Description` | string? | max 2000 |
| `CreatedBy` | string | agent name |
| `CreatedAt` | DateTime (UTC) | |
| `DueAt` | DateTime (UTC) | set once at creation from priority (§3) |
| `ResolvedAt` | DateTime? (UTC) | set when status becomes Resolved; cleared on reopen |
| `ClosedAt` | DateTime? (UTC) | set when status becomes Closed; cleared on reopen |
| `Notes` | List&lt;CaseNote&gt; | |

> **SQLite gotcha:** EF Core's SQLite provider can't `ORDER BY` a `DateTimeOffset` column. Store timestamps as `DateTime` in UTC.

### `CaseNote`

| Field | Type | Notes |
|---|---|---|
| `Id` | int | |
| `CaseId` | int | FK |
| `Kind` | NoteKind | `Agent` = typed by a person; `System` = automatic entry |
| `Author` | string? | agent name for Agent notes; null for System |
| `Body` | string | required, max 2000 |
| `CreatedAt` | DateTime (UTC) | |

### Agents

There's no authentication. The header's **"Acting as"** picker chooses the current agent: `Amy` (default), `John`, `Sam`. Every write request sends `actor` in its body, and the server validates it against that list. The selection persists in `localStorage`.

---

## 3. Business rules (all in `CaseStatusRules`)

### Due date

```
CalculateDue(priority, createdAtUtc):
  High   → createdAt + 24 hours
  Medium → createdAt + 72 hours  (3 days)
  Low    → createdAt + 120 hours (5 days)
```
These are calendar hours, not business hours. The due date is fixed at creation; there's no priority editing in scope.

### Overdue

```
IsOverdue(status, dueAtUtc, nowUtc) = status is Open AND nowUtc > dueAtUtc
```
Resolved and Closed cases are never overdue. Waiting on Customer cases **can** be overdue: the clock keeps running. The comparison is strict (`>`).

Use `TimeProvider` (registered as `TimeProvider.System`) wherever "now" is needed, so tests can use a fake clock.

### Status transitions

| From | Allowed next statuses (PATCH /status) | Reopen allowed |
|---|---|---|
| New | In Progress | no |
| In Progress | Waiting on Customer, Resolved | no |
| Waiting on Customer | In Progress, Resolved | no |
| Resolved | Closed | **yes** → In Progress |
| Closed | *(none)* | **yes** → In Progress |

**Reopen** is a separate action (`POST /reopen`), not a status. It moves a Resolved or Closed case to In Progress and clears `ResolvedAt`/`ClosedAt`. `DueAt` is not changed, so a reopened case may immediately show as overdue. That's intentional.

### Rule methods

```csharp
public static class CaseStatusRules
{
    IReadOnlyList<CaseStatus> GetNextStatuses(CaseStatus from);
    bool CanMove(CaseStatus from, CaseStatus to);
    string? GetMoveError(CaseStatus from, CaseStatus to);   // null when allowed
    bool CanReopen(CaseStatus from);                        // Resolved or Closed
    DateTime CalculateDue(Priority priority, DateTime createdAtUtc);
    bool IsOverdue(CaseStatus status, DateTime dueAtUtc, DateTime nowUtc);
}
```

### Error messages (exact text; shown inline in the UI)

| Situation | Message |
|---|---|
| `to == from` | `Case is already {Label}.` |
| from Closed (any target) | `Closed cases must be reopened before work can continue.` |
| from Resolved to anything but Closed | `Resolved cases must be reopened before work can continue.` |
| to Closed from an open status | `Resolve the case before closing it.` |
| any other disallowed move | `Can't move a case from {FromLabel} to {ToLabel}.` |
| reopen from an open status | `Only Resolved or Closed cases can be reopened.` |
| add note to a Closed case | `Closed cases must be reopened before notes can be added.` |

### Automatic system notes (written by the server)

| Event | Body |
|---|---|
| Case created | `Case created by {actor} · priority {Priority} · due {DueAt as "ddd, MMM d, h:mm tt"}` (server local time) |
| Status changed | `Status changed from {FromLabel} to {ToLabel} by {actor}` |
| Reopened | `Case reopened by {actor} ({FromLabel} → In Progress)` |

The **"Due date passed · case is now overdue"** entry in the design is **not stored**. The frontend inserts it into the timeline at `dueAt` when `isOverdue` is true. That avoids a background job.

---

## 4. API

Base path `/api`. JSON with string enums (`JsonStringEnumConverter`) and camelCase properties. Errors use **ProblemDetails** (`Results.Problem` / `Results.ValidationProblem`); the UI shows the `detail` text.

| Method & route | Body | Success | Errors |
|---|---|---|---|
| `GET /api/cases?status=&priority=&category=` | – | 200 `CaseSummary[]` sorted by `dueAt` ascending | 400 bad filter value |
| `GET /api/cases/summary` | – | 200 `{ open, overdue, waitingOnCustomer, resolvedToday }` | |
| `GET /api/cases/{id}` | – | 200 `CaseDetail` | 404 |
| `POST /api/cases` | `CreateCaseRequest` | 201 `CaseDetail` + `Location` header | 400 validation |
| `PATCH /api/cases/{id}/status` | `{ status, actor }` | 200 `CaseDetail` | 400 rule error (message from §3), 404 |
| `POST /api/cases/{id}/reopen` | `{ actor }` | 200 `CaseDetail` | 400, 404 |
| `POST /api/cases/{id}/notes` | `{ body, actor }` | 201 `CaseNote` | 400 empty body or Closed case, 404 |

**Filters.** `status` accepts `open` (the default when omitted, meaning New + In Progress + Waiting on Customer), `all`, or any `CaseStatus` value. `priority` and `category` are optional.

**Summary.** The summary is **queue-wide and ignores filters**. `resolvedToday` counts cases whose `ResolvedAt` falls on today's date in server local time. Cases that are Closed now but were resolved today still count.

### DTOs

```ts
CaseSummary {
  id, title, customer, category, priority, status, assignee: string | null,
  createdAt, dueAt, isOverdue: boolean
}
CaseDetail extends CaseSummary {
  description: string | null, createdBy, resolvedAt, closedAt,
  allowedNextStatuses: CaseStatus[],   // from CaseStatusRules.GetNextStatuses
  canReopen: boolean,
  notes: CaseNote[]                    // oldest first
}
CaseNote { id, kind: 'Agent' | 'System', author: string | null, body, createdAt }
CreateCaseRequest {
  title, customer, category, priority, assignee: string | null,
  description: string | null, actor
}
```
All timestamps are ISO-8601 UTC. The frontend formats them in the browser's local time.

### Program.cs essentials

```csharp
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite("Data Source=cases.db"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();
// Recreate + seed on every startup so the demo data (including overdue cases) is always fresh.
using (var scope = app.Services.CreateScope()) { /* EnsureDeleted, EnsureCreated, SeedData.Seed(db, now) */ }

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGroup("/api").MapCaseEndpoints();
app.Map("/api/{**rest}", () => Results.NotFound());   // unknown API routes → 404, never index.html
app.MapFallbackToFile("index.html");                    // client-side routes (/cases/1047 on refresh)
```

Pin the API to `http://localhost:5001` in `launchSettings.json`. Use HTTP only, so no dev certificate is needed.

---

## 5. Frontend

### Routes

| Path | Page |
|---|---|
| `/` | `CasesPage`: dashboard / queue |
| `/cases/new` | `NewCasePage` |
| `/cases/:id` | `CaseDetailPage` |

### Cases page (`design/01-cases.html`, `05-empty-state.html`)
- Header: logo + "Case Tracker", and on the right an "Acting as" avatar + select.
- Page header: date/time line (e.g. `Thursday, Oct 22 · 2:30 PM`), H1 **Cases**, and a primary **New case** button linking to `/cases/new`.
- 4 summary cards from `/api/cases/summary`: Open, Overdue (red treatment), Waiting on Customer, Resolved Today.
- Filter bar: three chip-style selects (Status: All open / each status / All; Priority; Category) and a count on the right (`8 cases · sorted by due date`). Keep filters in the URL query string so Back works. When any filter is active, its chip gets the active style and a **Clear filters** link appears.
- Table columns: **Case** (title in bold, with `#id · customer` underneath), Category, Priority (colored dot + label), Status (pill), Assignee (avatar + name), Due. Clicking a row title opens the case.
- Overdue rows: row background `--overdue-row`. The Due cell reads `Overdue 5h 15m` in red, with the absolute time underneath.
- Empty state (0 results): keep the summary cards and table header, then the centered icon, "No cases match these filters", a helper sentence, and **Clear filters** + **New case** buttons.

### Due cell formatting (`format.ts`)
| Case | Line 1 | Line 2 |
|---|---|---|
| overdue | `Overdue {h}h {m}m` (red, bold) | `Today, 9:15 AM` / `Oct 21, 9:15 AM` |
| due today | `Today, 4:00 PM` (bold) | `in 1h 30m` (amber if < 24h) |
| due tomorrow | `Tomorrow, 10:20 AM` | `in 19h 50m` |
| later | `Sat, Oct 24, 1:05 PM` | `in 2 days` |

### Case detail page (`design/02-case-detail.html`)
- Back link "‹ Cases".
- Header card: `#1047 · Customer`, title (H1), priority pill, status pill, and an overdue badge when overdue (`Overdue by 5h 15m · was due today 9:15 AM`).
- Two columns that stack on narrow screens. Left: Description card, then the Notes timeline card. Right: Details card.
- **Status control** (top of the right card): a button showing the current status. It opens a menu titled `Move from {current} to` that lists only `allowedNextStatuses`, plus **Reopen case** when `canReopen` is true. The footer reads "Only allowed next statuses are shown." Selecting an option calls PATCH (or POST /reopen), then re-renders with the returned `CaseDetail`.
- Details list: Priority, Customer, Category, Assignee, Created (+ "by X"), Due (red when overdue, with helper text like `24h from creation (High)`).
- Timeline, oldest first:
  - **Agent notes**: avatar, name, timestamp, and the body in a light rounded card.
  - **System notes**: a small round gray icon, one line of gray text, and the timestamp on the right.
  - **Virtual overdue entry**: red icon and text, inserted at `dueAt` when overdue.
- **Add note** box at the bottom: textarea, "Posting as {agent}", and an **Add note** button. Disable the button when the textarea is empty. When the case is Closed, disable the box with the placeholder "Reopen the case to add notes" and the helper "Notes are locked while a case is Closed".

### Invalid status change (`design/03-invalid-status.html`)
This happens when the page is stale. For example, another agent closed the case after you opened it, and you then pick a move that's no longer allowed. When PATCH returns 400:
- Give the status control a red border.
- Show an inline error panel directly under it, with the server `detail` in bold red (e.g. **"Closed cases must be reopened before work can continue."**) and one line of context underneath.
- Show the actions **Reopen case** (primary, only if the refreshed case `canReopen`) and **Dismiss**.
- Refetch the case so the header, pills, and timeline show the real current state.

### New case page (`design/04-new-case.html`)
- Fields: Title*, Customer* (select), Category* (select), Priority* (three radio buttons: High / Medium / Low, each with a colored dot), Assignee (Unassigned / Amy / John / Sam), Description (textarea).
- Helper under Priority, updated live: `Due Fri, Oct 23 at 2:30 PM · 24 hours from now (High)`, with the legend `High = 24 hours · Medium = 3 days · Low = 5 days`. The client computes this as a preview only; the server is authoritative.
- Default the priority to Medium and the assignee to the acting agent.
- Buttons: **Cancel** (back to `/`) and **Create case** (POST, then navigate to `/cases/{id}`). Show server validation errors under the matching fields.

---

## 6. Seed data

Seed relative to **startup time (`now`)** so the demo always shows two overdue cases and one due within 2 hours. Customers, agents, and text match the design.

### Open cases (8)

| ID | Title | Customer | Category | Priority | Status | Assignee | Created |
|---|---|---|---|---|---|---|---|
| 1047 | Sales orders stopped posting to ERP | Prairie Valve & Pump | Integration | High | In Progress | John | now − 29h15m → **overdue 5h15m** |
| 1044 | Member renewal flow sends duplicate emails | Great Lakes Planning Assn. | Power Automate | High | New | Amy | now − 26h50m → **overdue 2h50m** |
| 1049 | Case routing rules skip the Tier 2 queue | Harborview Mutual Insurance | Customer Service | High | In Progress | Sam | now − 22h30m (due in 1h30m) |
| 1042 | Opportunity sync failing after field mapping change | Lakeshore Community Foundation | D365 Sales | High | Waiting on Customer | Amy | now − 4h10m |
| 1051 | Quote PDF template missing company logo | Midwest Fastener Co. | D365 Sales | Medium | New | John | now − 25h25m |
| 1046 | Approval flow times out on large attachments | Keystone Mechanical Contractors | Power Automate | Medium | In Progress | Sam | now − 5h30m |
| 1050 | Add "Preferred contact" field to case form | Harborview Mutual Insurance | Customer Service | Low | New | Amy | now − 2h |
| 1043 | Nightly donor import shows encoding errors | Lakeshore Community Foundation | Integration | Low | Waiting on Customer | John | now − 30m |

### Resolved / closed (6)

| ID | Title | Customer | Category | Priority | Status | Assignee | Timing |
|---|---|---|---|---|---|---|---|
| 1038 | Safety training sign-up form not creating contacts | Keystone Mechanical Contractors | Power Automate | Medium | Closed | Sam | created now − 76h30m, resolved now − 46h48m, closed now − 18m |
| 1039 | Lead scoring flow skips new web leads | Midwest Fastener Co. | Power Automate | Medium | Resolved | Amy | created now − 30h, resolved **today** |
| 1040 | Email-to-case creates duplicate cases | Harborview Mutual Insurance | Customer Service | High | Resolved | Amy | created now − 20h, resolved **today** |
| 1041 | Invoice sync rejects zero-dollar lines | Prairie Valve & Pump | Integration | Low | Resolved | Sam | created now − 50h, resolved **today** |
| 1045 | Dashboard chart shows wrong fiscal year | Great Lakes Planning Assn. | D365 Sales | Low | Closed | John | created now − 10d, resolved now − 7d, closed now − 6d |
| 1048 | Contact merge loses phone numbers | Lakeshore Community Foundation | Customer Service | Medium | Closed | John | created now − 4d, resolved now − 3d, closed now − 2d |

For the three "resolved today" cases, use `ResolvedAt = max(now − {1h30m, 3h, 5h}, startOfTodayLocal + 5 min)`, so they always count as today even if the app starts just after midnight.

Expected summary right after startup: **Open 8 · Overdue 2 · Waiting on Customer 2 · Resolved Today 3**.

### Seeded timelines

Every case gets a "Case created by …" system note at `CreatedAt`, plus status-change system notes matching its current status. Copy these two timelines exactly from the designs:

**#1047** (description: *"Since about 8:40 AM, sales orders created in D365 Sales are no longer appearing in the ERP. The warehouse team has 23 orders they can't pick. No errors are visible in D365. Customer contact: Lena Ortiz, IT Manager."*)
1. System, created by Amy
2. Agent, Amy (+7m): "Lena confirmed the last order that reached the ERP was SO-88412 at 8:36 AM. Nothing changed on their side this morning."
3. System (+50m): "Assignee changed from Amy to John by Amy" (seed-only text; reassignment isn't a feature)
4. System (+1h16m): "Status changed from New to In Progress by John"
5. Agent, John (+2h33m): "Integration log shows 401 Unauthorized from the ERP endpoint starting 8:37 AM. Looks like the service account password was rotated. Asked their IT for the new credential."
6. Agent, John (now − 5h35m): "Still no credential from IT. Called their ops manager, who is chasing it now. Orders will replay automatically once auth works."

**#1038** (description: *"Sign-ups submitted through the safety training form are saved, but no contact record is created in D365. Started after the form was updated on Oct 16."*)
1. System, created by Sam
2. System: "Status changed from New to In Progress by Sam"
3. Agent, Sam: "The new 'Certification type' field was mapped to a choice column that doesn't exist, so the flow's Create row step failed silently. Fixed the mapping and replayed 41 sign-ups."
4. System: "Status changed from In Progress to Resolved by Sam"
5. Agent, Sam (now − 19m): "Customer confirmed new sign-ups are creating contacts. Closing."
6. System (now − 18m): "Status changed from Resolved to Closed by Sam"

For the other cases, write 0–2 short, realistic agent notes in the same voice.

---

## 7. Tests (xUnit)

`CaseStatusRulesTests`
- `[Theory]` over every allowed pair → `CanMove` is true and `GetMoveError` is null.
- `[Theory]` over representative disallowed pairs → `CanMove` is false, with the exact messages from §3 (Closed → In Progress, Resolved → In Progress, In Progress → Closed, New → Resolved, same status).
- `GetNextStatuses` returns exactly the table in §3 for each status, and Closed returns an empty list.
- `CanReopen` is true only for Resolved and Closed.

`DueDateTests`
- High / Medium / Low add 24h / 72h / 120h.
- `IsOverdue` is true when open and past due; false when exactly at due; false for Resolved and Closed even when past due; true for Waiting on Customer when past due.

Optional stretch: one `WebApplicationFactory` integration test that a bad PATCH returns 400 ProblemDetails with the expected `detail`.

---

## 8. Reference lists

- **Agents:** Amy, John, Sam
- **Customers:** Great Lakes Planning Assn., Harborview Mutual Insurance, Keystone Mechanical Contractors, Lakeshore Community Foundation, Midwest Fastener Co., Prairie Valve & Pump
- Keep these as constants in both the API (for validation) and the frontend (for selects). There's no lookup endpoint.

---

## 9. Design tokens

Font: **Inter** (Google Fonts; weights 400/500/600/700), with `system-ui, sans-serif` as the fallback. Base size 14px.

```css
:root {
  --bg: #F8FAFC;           --surface: #FFFFFF;
  --border: #E2E8F0;       --border-subtle: #F1F5F9;
  --text: #0F172A;         --text-2: #334155;     --muted: #64748B;
  --accent: #4F46E5;       --accent-hover: #4338CA; --accent-soft: #EEF2FF; --accent-ring: #E0E7FF;
  --danger: #DC2626;       --danger-text: #B91C1C;  --danger-soft: #FEE2E2; --danger-border: #FECACA;
  --overdue-row: #FFF5F5;
  --warn-text: #B45309;    --warn-soft: #FEF3C7;
  --success-text: #047857; --success-soft: #D1FAE5;
  --radius-card: 14px;     --radius-control: 10px;  --radius-pill: 999px;
  --shadow-card: 0 1px 2px rgba(15,23,42,.04), 0 6px 20px rgba(15,23,42,.05);
}
```

| Element | Spec |
|---|---|
| Status pills | New `#EEF2FF/#4338CA`, In Progress `#E0F2FE/#075985`, Waiting `#FEF3C7/#92400E`, Resolved `#ECFDF5/#047857`, Closed `#F1F5F9/#475569` |
| Priority dots | High `#DC2626`, Medium `#D97706`, Low `#94A3B8` |
| Avatars (solid, white initial) | Amy `#6366F1`, John `#0D9488`, Sam `#DB2777` |
| Logo | 32px indigo rounded square with a white ticket, tilted −14°, and an indigo check. Copy the inline SVG from any design file. |
| Icons | Inline 20×20 stroke SVGs (1.7 stroke), copied from the design files |
| Controls | 40–44px tall; buttons have 10px radius; filter selects are pills |

Layout: max content width 1280px, 32px side padding. Pages are fluid: the summary cards use `repeat(auto-fit, minmax(210px, 1fr))`, the table scrolls horizontally on narrow screens, and the detail page's two columns wrap.

---

## 10. Out of scope

Authentication, editing case fields (title, priority, assignee) after creation, reassignment, attachments, search, pagination, email/notifications, real-time updates. Refetch after each mutation; no polling.

---

## 11. Run instructions (put these in the repo README)

```bash
# build the frontend into the API's wwwroot, then run everything on one host
cd src/CaseTracker.Web && npm install && npm run build
cd ../CaseTracker.Api && dotnet run          # → http://localhost:5001

# tests
dotnet test
```

Optional instant reload while editing the UI: run `dotnet run` in one terminal and `npm run dev` in another. Vite's dev server proxies `/api` to `http://localhost:5001`:

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: { outDir: '../CaseTracker.Api/wwwroot', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:5001' } },
});
```

The database is recreated and reseeded on every startup, so the demo state is always the same.

---

## 12. Acceptance checklist

- [ ] `npm run build` then `dotnet run` serves the app at `http://localhost:5001`; refreshing `/cases/1047` loads the app; `/api/nope` returns 404.
- [ ] The dashboard shows Open 8 · Overdue 2 · Waiting 2 · Resolved Today 3; the list is sorted by due date; the 2 overdue rows are highlighted.
- [ ] Filters narrow the list, are reflected in the URL, and show the empty state when nothing matches; the summary cards don't change with filters.
- [ ] The detail page's status menu shows only allowed next statuses (+ Reopen for Resolved/Closed); each change adds a system note.
- [ ] A disallowed PATCH returns 400 with the exact message, shown inline under the status control.
- [ ] Notes can be added (and appear with the acting agent's name); a Closed case blocks notes.
- [ ] A new case gets status New and a due date of +24h/+72h/+120h, previewed live on the form.
- [ ] Switching "Acting as" changes the author on new notes and status changes.
- [ ] `dotnet test` passes.
