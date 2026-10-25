# CLAUDE.md

Case Tracker: a small take-home interview project. The full spec is in `docs/SPEC.md`; designs are in `docs/design/`. The spec wins wherever it disagrees with a design.

## How to work
- Build one milestone at a time. Stop after each one and summarize what changed in 3–5 bullets.
- Don't start the next milestone until I approve.
- Don't add features beyond the spec or anything listed as out of scope.
- If the spec is unclear, ask before guessing.

## Milestones
1. Solution scaffold: Api, Web, and Tests projects; the single-host setup; the `/api` 404 catch-all and SPA fallback.
2. Domain: enums, entities, and `CaseStatusRules` with the full xUnit test suite passing.
3. EF Core `AppDbContext`, startup seed (relative to now), and all API endpoints with ProblemDetails errors.
4. React app: the Cases dashboard (summary cards, filters in the URL, table, empty state).
5. Case detail: status menu, reopen, inline status errors, timeline, and add note.
6. New case form with the live due-date preview.
7. Repo README with run instructions, then a pass through the acceptance checklist in SPEC §12.

## Code style
- Simple and readable over clever. No abstractions the spec doesn't call for: no repositories, services layer, MediatR, or generic helpers.
- Keep files small and named as in the spec's layout.
- Business rules live only in `CaseStatusRules`. Endpoints stay thin.
- Use `TimeProvider` for "now". Never call `DateTime.Now` or `DateTime.UtcNow` directly.
- React: function components, `useState`/`useEffect` per page, and Context only for the acting agent. No state libraries or UI component libraries.
- One `styles.css` using the spec's CSS variables.

## Comments and docs
- Comment only the why, never the what.
- Keep markdown short: bullets, no filler, no repeating the spec.
- The repo README holds run instructions plus these interview sections: assumptions, cuts and tradeoffs, known bugs, AI usage, what I'd improve with more time, and how this maps to D365.

## Tests
- xUnit tests for `CaseStatusRules` and the due-date logic only, as listed in the spec.
- Run `dotnet test` before saying a milestone is done.

## Done means
- It builds, the tests pass, and the milestone's items in the spec's acceptance checklist work.
- Mention known bugs or shortcuts in your summary rather than hiding them.