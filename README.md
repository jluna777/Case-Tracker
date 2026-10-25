# Case Tracker

A small support case tracker: a dashboard, a case detail page with status rules and notes, and a new case form. ASP.NET Core 10, EF Core SQLite, React + TypeScript (Vite) and, xUnit.

## Run it

Prerequisites: .NET 10 SDK and Node 24 (LTS).

```bash
# build the frontend into the API's wwwroot, then run everything on one host
cd src/CaseTracker.Web && npm install && npm run build
cd ../CaseTracker.Api && dotnet run          # → http://localhost:5001

# tests (from the repo root)
dotnet test
```

- The database is recreated and reseeded on every startup, relative to the current time, so the demo always has the same dashboard: 8 open, 2 overdue, 2 waiting, 3 resolved today.
- There's no login. Pick the agent in the header's "Acting as" menu; it's remembered in the browser.

## Cuts and tradeoffs

- Tests cover `CaseStatusRules` and due dates only. There are no integration tests at the moment.
- The database is dropped and recreated on startup (`EnsureCreated`), with no migrations. Fine for a demo, not for real data.
- The summary counts overdue cases in memory so `IsOverdue` stays the single definition. Fine at this size; a real dashboard would push it into SQL.
- The "Due date passed" timeline entry is added by the frontend at `dueAt`, not stored, so no background job is needed.
- The new-case due-date preview repeats the 24/72/120 hours in `types.ts`. The server is still authoritative.
- No state or UI libraries: `useState`/`useEffect` per page and Context for the acting agent only.

## Known bugs

- An invalid enum string in a request body (e.g. `"status": "Bogus"`) returns ASP.NET's generic "Failed to read parameter" 400 instead of a friendly message. The UI never sends one.
- Two agents changing the same case at the same moment: the last write wins. The stale-page check covers the common case, but there's no concurrency token.
- "Resolved today" and the created-note due date use the server's time zone; the UI formats in the browser's. They match when both run on the same machine.
- "‹ Cases" goes to `/`, so dashboard filters are lost when coming back from a case.
- Adding a note returns 201 without a `Location` header (there's no single-note route).

## What I'd improve with more time

- A create an account / login flow.
- A row version on `Case` so concurrent edits fail cleanly instead of overwriting.
- Explicit time zones (store the agent's zone, or make the server and UI agree on one).
- Keep filters when returning to the dashboard.
- Friendlier errors for malformed request bodies.

## AI usage

- Built with Claude Code in the terminal, one milestone at a time, following `docs/SPEC.md`, the designs in `docs/design/`, and the rules in `CLAUDE.md`.
- For each milestone, Claude proposed a plan and raised spec ambiguities; I made the calls, then reviewed the code and the browser checks before approving.
- I approved every commit message before it was committed.
- Claude ran the builds and tests and checked each page in a real browser with Playwright.
