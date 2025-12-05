# Team Stats + Data Strategy Plan

## Goals
- Avoid redundant fetches for stable data (draft, scoring settings) and reuse cached stats across UI states.
- Redesign Team Sortable Stats into two subviews: Season Ranks and Draft Ranks with expandable rows and robust filters.

## Data Strategy (backend/process)
- Stable data cache:
  - Draft info (draft_id, picks player_id→round/slot/owner) is season-stable; cache by league_id+season with long TTL (or persist to local JSON/store). Warm once at app load.
  - Scoring settings are season-stable; cache by league_id+season; only refetch on manual refresh or season change.
- Weekly data cache:
  - Matchups per week (starters + players_points) cached by league_id+week. Reuse for aggregations.
  - Player directory cached once per session; key by season if you need historical positions.
  - Optional: weekly raw stats endpoint only if recomputing points; otherwise rely on matchup players_points for speed.
- Aggregation layer:
  - Build per-week starter log: roster_id, starters[], players_points map.
  - Build per-team per-position aggregates: sum starter points per position across week range.
  - Build per-team per-draft-round aggregates: starters joined to draft map; sum points per selected rounds; keep player lists for expansion.
  - Expose reusable selectors for filters (position, rounds, starter-only toggle).

## UI: Team Sortable Stats
- Surface: single “Team Stats” page with tabs:
  - Season Ranks (position-based starter ranks)
  - Draft Ranks (round-based starter ranks)
- Shared controls:
  - Week range picker (start/end), position filter, starter-only toggle (default on).
  - For Draft Ranks: multi-select rounds (include/exclude), position filter, starter-only toggle.

### Season Ranks table
- Columns: Team, Record, QB Rank, RB Rank, WR Rank, TE Rank, DEF Rank.
- Sortable by any positional rank column or team name.
- Row expansion:
  - Show up to top 4 scoring starters per position (respecting current week range and starter-only setting).
  - Display player name, points, avg, draft round badge.

### Draft Ranks table
- Columns: Team, Selected Rounds (summary), Total Points, Avg, (optional) Rank.
- Filters: multi-select rounds, position filter, starter-only toggle.
- Sorting: Total, Avg, Rank, Team.
- Row expansion:
  - List included players matching filters with draft round, position, total points, PPG.

## Suggested Implementation Steps
1) Data layer
   - Add caches for scoring settings and draft picks keyed by league_id+season.
   - Ensure matchup/week cache reused across filters; add helper to fetch week range once.
   - Extend aggregation helpers to return:
     - Per-team per-position totals + top N players for expansion.
     - Per-team per-round totals + matching players for expansion.
2) UI wiring
   - Create Team Stats page with tabs (Season Ranks, Draft Ranks) and shared filter bar.
   - Build sortable tables with expandable rows (reuse existing table styles).
   - Add round multi-select and starter-only checkbox; wire to aggregations.
3) Testing/QA
   - Unit tests for aggregation helpers (position totals, round totals, starter-only flag).
   - Smoke test UI: sort interactions, filters, expansions, week range changes.
4) Performance
   - Debounce filter changes; avoid refetching cached weeks/draft/settings.
   - Lazy-load additional weeks if range expands; show loading chips per fetch.

## New Adjustments (to implement now)
- Week range guard: clamp end week to the league’s last scored week (exclude in-progress week 14 from calculations) even if manually typed.
- Linkability:
  - Team/manager names link to the Rosters view, preselecting that roster if possible.
  - Player names link to the Player Stats page with `playerId` query.
- UX tweaks:
  - Row expansion by clicking the row (not just the button).
  - Column-header sorting for tables (toggle asc/desc) instead of dropdowns.

## Player Sortable Stats (new tab) – Plan
- Data: Reuse matchup + player directory + draft map caches; aggregate per-player totals across the selected week range with starter-only toggle; include owner/team, position, draft round, weeks started/played, total/avg points.
- Optional detail: keep per-week entries (week number, points, started flag) for row expansion.
- UI:
  - Add a “Players” tab to the Stats page.
  - Filters: position, draft round (all/rounds/UD), starter-only, name search (simple substring), week range already shared.
  - Table columns: Player, Pos, Team, Draft, Owner, Total, Avg, Starts. Clickable headers for sorting; row click expands to show weekly line items.
  - Links: player name → Player Stats page.
- Implementation steps:
  1) Extend `loadStatsData` to emit per-player aggregates and (compact) per-week logs keyed by playerId.
  2) Add a player tab in `Stats.vue` with filters, header sorting, search, and expandable weekly rows.
  3) Reuse shared week range/starter-only filters; ensure draft/position filters apply to player tab.
  4) Light QA: sort toggles, filters, expansion, week range clamping.

## Player Ranks UX refinements (new)
- Add team/manager filter dropdown to Player Ranks.
- Polish filter bar layout: grouped controls, clearer labels, compact chips/buttons for rounds and positions, inline search.
- Table styling: tighter padding, zebra stripes or hover emphasis, clearer header affordances for sort (icons/underline), badges for draft round/position.
- Wrap the rounds filter chips inside an expandable dropdown to reduce clutter (applies wherever round chips appear).
