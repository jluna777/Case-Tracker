# Case Tracker

A support case tracker: a dashboard, a case detail page with status rules and notes, and a new case form. ASP.NET Core 10, EF Core SQLite, React + TypeScript (Vite) and, xUnit.

## Screenshots

**Dashboard**

![Dashboard](docs/screenshots/Case%20Tracker%20Dashboard.PNG)

**Case detail**

![Case detail page](docs/screenshots/Case%20Tracker%20Detail%20Page.PNG)

**New case form**

![New case form](docs/screenshots/Case%20Tracker%20New%20Case.PNG)

**Invalid status change**

![Invalid status change](docs/screenshots/Case%20Tracker%20Invalid%20State.PNG)

**Dashboard filters**

![Dashboard filters](docs/screenshots/Case%20Tracker%20Filters.PNG)

**Architecture**

![Architecture](docs/screenshots/Case%20Tracker%20Architecture.png)

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
- There's no login. Pick the user in the header's "Acting as" menu; it's remembered in the browser.