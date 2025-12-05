# Implementation Audit — Fantasy Football Wrapped

## Scope
- Reviewed frontend architecture and flows across `src/views/Home.vue`, `src/views/Stats.vue`, `src/views/Players.vue`, `src/views/Rosters.vue`, `src/api/api.ts`, `src/api/statsPage.ts`, `src/api/helper.ts`, and supporting docs (`docs/FEATURES.md`, `docs/SITE_REFINEMENT_GUIDE.md`, `docs/stats_page_plan.md`, `docs/team_stats_plan.md`).
- Focused on how the site currently pulls Sleeper data, assembles league views, and delivers the new Stats/Player rankings experience.

## How it works today (overview)
- Vue 3 + Pinia SPA with Tailwind UI. Header routes to Home (tabbed modules), Rosters, Player Stats, League Stats, and admin utilities.
- Home bootstraps league data via `getData` (`src/api/api.ts`): fetches league meta, rosters, brackets, weekly matchups, transactions, trades/waivers, and avatars. Data is cached in `localStorage` per league; auto-refresh triggers after 24h.
- Tabbed Home modules reuse the loaded league data for standings, projections, expected wins, roster management, playoffs, AI summaries, draft recap, and history.
- Rosters view (`src/views/Rosters.vue`) pulls per-player season stats via `getStats` for the selected roster.
- Player Stats view (`src/views/Players.vue`) searches `players/nfl`, fetches season + weekly stats per player.
- New League Stats view (`src/views/Stats.vue`) calls `loadStatsData` (`src/api/statsPage.ts`) to fetch league context, `players/nfl`, draft picks, and per-week matchups, then derives season ranks by position, draft-round ranks, and per-player aggregates with starter-only toggle and week range filters.

## Findings and friction points

### Data fetching, caching, and performance
- Duplicate heavy player directory fetches: `searchPlayers` (`src/api/api.ts`) and `fetchPlayersDirectory` (`src/api/statsPage.ts`) each download `https://api.sleeper.com/players/nfl` separately; no shared cache or persistence, causing repeated multi-MB downloads per session and route.
- Unbounded caches with stale data risk: `leagueCache`, `draftMapCache`, and `matchupCache` in `src/api/statsPage.ts` never expire. If Sleeper backfills scores or draft data changes, UI continues to serve stale results until reload, with no manual refresh control on the Stats page.
- Expensive bootstrap every time `getData` runs: Home’s loader (`src/views/Home.vue`) calls `getData` for each saved league; `getData` fans out to weekly matchups, transactions for every week, and avatar fetches (`src/api/api.ts`). There is no TTL per resource, no partial reuse across tabs, and no backpressure if multiple leagues exist.
- Per-player stat fetches on Rosters: `Rosters.vue` calls `getStats` for each rostered player in parallel with no memoization or batching, which can generate tens of network calls on every roster switch and repeats when toggling rosters or leagues.
- Stats page week range always re-fetches matchups even when already in cache; there is no lazy add/remove of weeks or prefetch. A large range means N parallel requests per Apply click with no abort if the user changes the range mid-flight.
- No aborts or retries: All fetches are fire-and-forget; rapid league switches or tab changes can race and overwrite state with out-of-order responses.

### Data correctness and consistency
- Draft/season averages in the Stats page divide by `weeksLoaded.length` (`src/views/Stats.vue:170`) instead of games played/started, so teams with bye weeks or injuries show suppressed averages relative to actual usage.
- Player ownership is sticky to first occurrence: `loadStatsData` assigns `ownerId/ownerName` once per `playerId` and never updates on trades (`src/api/statsPage.ts`), so traded players display under the wrong manager in Player/Draft ranks.
- Fantasy point source mismatch: Stats uses matchup `players_points` only; other pages use `getStats` season totals. If matchup points diverge from Sleeper stat endpoints or custom scoring (e.g., bonuses), the same player can show different totals across pages.
- Week range clamp relies on `lastScoredWeek` from league settings (`src/api/statsPage.ts`) without validating against the in-season NFL state; in-progress weeks can slip into calculations if Sleeper reports a leg but points aren’t final (noted as a needed guard in `docs/team_stats_plan.md`).
- Player directory normalization is partial (`normalizePosition` in `src/api/statsPage.ts` folds IDP into DEF only). Position groups used elsewhere (e.g., K) are excluded from Stats filters, so totals for Kickers disappear from season/draft ranks.
- Projection/proxy endpoints (`getProjections`, `fetchProjectionsBatch` in `src/api/api.ts`) assume `VITE_PROJECTION_API` is present; when unset, the batch helper can call `/api/projections` on the same origin and silently warn, but no UI error surfaces.

### UX and information architecture
- Filter ergonomics: Stats week range requires manual typing and Apply; no quick presets (e.g., “Last 4”, “Playoffs”), no disabled inputs past last scored week, and no persisted filters when navigating away.
- Table mobility: Wide tables (Standings, Rosters, Stats) rely on horizontal scroll without column prioritization or stacked mobile layouts; expansion triggers by row click plus inline buttons can be hard to hit on touch devices.
- Loading/error feedback is thin: Stats shows a single “Loading…” line; failures set a generic error string with no retry affordance. Rosters/Players lack per-row skeletons or partial success states.
- Context visibility: Active season/scoring context is not consistently surfaced outside the hero banners. Links from Stats to Rosters/Players drop users into other pages without retaining the week range or filters.
- Navigation fragmentation: Home tabs + header links + Stats page create multiple entry points, but there is no sticky subnav or jump links inside long Home tab content (noted as a gap in `docs/SITE_REFINEMENT_GUIDE.md`).

### Reliability, observability, and maintainability
- Heavy computations (e.g., 10k simulations for expected wins in `src/api/helper.ts:createTableData`) run on every `getData` call with no memoization or perf guards.
- No tests cover the new Stats aggregation layer; regressions in starter-only math, draft-round grouping, or week clamping would go unnoticed.
- LocalStorage usage is brittle: corrupted `leagueInfo` or mismatched `currentLeagueId` states trigger generic toasts, but there is no atomic reset or schema validation. The enforced default league path doesn’t clear stale cached weeks/drafts in the new Stats caches.

## Recommendations and remediation steps

1) **Unify data fetching and caching**
   - Create a shared Sleeper client with per-resource caches (league meta, players directory, matchups per week, drafts) keyed by `{leagueId, season}` and TTLs (e.g., 1h for matchups, 24h for players/draft). Persist the players directory in IndexedDB/localStorage to avoid multi-MB re-downloads across routes.
   - Add request coalescing and `AbortController` support so rapid filter changes or league switches cancel in-flight calls.
   - Reuse cached league data for Stats where possible (rosters/users already fetched in `getData`), and fetch only missing weekly slices instead of re-pulling the full range on every Apply.

2) **Fix Stats accuracy and completeness**
   - Compute draft/season averages using games played/started per player, not `weeksLoaded.length`; surface both total and per-game metrics in `src/views/Stats.vue`.
   - Track player ownership per week when aggregating (`src/api/statsPage.ts`) so trades transfer correctly; store `{week, ownerId}` with weekly stats and choose owner based on the most recent week in range.
   - Normalize positions consistently (include K, handle multi-pos) and align grouping with the rest of the app. Add a K option in Stats filters or explicitly hide it with an empty-state note.
   - Optionally recompute fantasy points from raw stats + league scoring (`scoringSettings`) to align with other pages and guard against Sleeper matchup discrepancies.
   - Clamp week ranges against both `lastScoredWeek` and the current NFL state; show the clamped value to the user to avoid silently discarding input.

3) **Optimize high-volume views (Rosters/Players/Stats)**
   - Introduce a per-player stats cache keyed by `{playerId, season, scoringType}` to reuse results between Rosters and Player pages; batch requests when possible.
   - For Stats week range changes, incrementally fetch only newly added weeks and reuse cached results for overlapping ranges. Surface a “Loading weeks X, Y” chip-level loader for clarity.
   - Add basic retry/backoff and user-facing errors for projection/news/trends endpoints when env vars are missing.

4) **UX and IA polish**
   - Add preset week chips (Season, Last 4, Playoffs) and disable invalid week inputs; persist filter state per tab in localStorage so navigating away doesn’t reset selections.
   - Improve mobile table layouts with stacked rows or column prioritization; make row expansion affordances larger and consistent (row click or chevron, not both).
   - Add sticky subnav/jump links for long Home tab content and a consistent context bar (season, scoring, last updated) across Rosters/Players/Stats.
   - When deep linking from Stats to Rosters/Players, pass along relevant context (playerId, rosterId, week range) so the target view reflects the source filter.

5) **Reliability, observability, and tests**
   - Add unit tests for `loadStatsData` aggregations (starter-only sums, draft-round grouping, trade ownership, week clamping) and for `createTableData` to lock expected wins math.
   - Instrument fetch durations and failure counts; surface a “last refreshed” timestamp per data set (league meta, matchups, players directory) with a manual refresh control.
   - Harden LocalStorage handling with schema validation and an atomic “reset to default league” action that also clears in-memory caches in `src/api/statsPage.ts`.

## Next steps to execute
1. Stand up the shared Sleeper client + caches (players, matchups, drafts) and wire Stats/Players/Rosters to it.
2. Correct Stats averages and ownership handling; extend position filters to include K or explicitly message exclusions.
3. Add week presets, persisted filters, and improved loading/error states on the Stats page.
4. Introduce per-player stats cache for Rosters/Players and batch fetches where possible.
5. Add targeted tests around the new Stats aggregation logic and `createTableData`, plus a lightweight telemetry/refresh indicator.
