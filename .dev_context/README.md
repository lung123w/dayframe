# .dev_context — living repo context (owner: `df-lead`)

- `ARCHITECTURE.md` — runtime shape, component hierarchy, state ownership, the five main user flows, storage conventions, known traps.
- `DATA_MODEL.md` — every SQLite table/column, the data migrations, migration policy, live-DB drift, known data defects.
- `ROUTE_MAP.md` — the UI view list and every REST mount/verb/period parameter.
- `DECISION_LOG.md` — append-only ADRs, UI conventions (CONV), team policies (POL), open items.

**Rule A — read before you write.** Before writing specs, DB migrations or code, read the relevant file here so the work fits the current architecture instead of regressing it. If a file is missing, stale or contradicts the code, say so in your task comment.

**Rule B — update before Done.** Before a task is marked Done, the affected files here must reflect any new schema, route, component, state owner or period rule your task added. A task that changes the data model, routes or architecture without updating this directory is incomplete — and all changes here ship like any other code: feature branch + PR.

Cite real files/lines and commits, never intentions. Say which source you verified against (code at a commit, or the live `data/app.db`) — they are not always the same document (see `DECISION_LOG.md` ADR-010).
