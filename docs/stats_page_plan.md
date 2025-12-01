# Stats Page (Sleeper-Only) – Implementation Plan

## Goals
- Deliver sortable rankings for Players and Teams using only free Sleeper API data for the known league.
- Player view: most points by position, most points by draft round, typical fantasy filters (week range, position, draft round, search), sortable columns.
- Team view (manager): started-only totals by position group and by draft round; sortable with same filters; handle multiple leagues/seasons if needed.
- Target context: league_id `1257507151190958081`, season `2025`, season_type `regular`, roster spots `QB RB RB WR WR TE FLEX FLEX DEF BN x6`.

## Sleeper Data You’ll Use (all free)
- League meta: `GET /v1/league/{league_id}` – scoring/roster settings, season. Use `1257507151190958081` (2025 regular).
- League managers: `GET /v1/league/{league_id}/users` – owners for display.
- Rosters: `GET /v1/league/{league_id}/rosters` – roster_id ↔ owner_id, keepers.
- Drafts: `GET /v1/league/{league_id}/drafts` → draft_id list; `GET /v1/draft/{draft_id}/picks` – map player_id → draft round/slot/owner. Draft_id for 2025: `1257507152126279680`.
- Weekly matchups: `GET /v1/league/{league_id}/matchups/{week}` – starters array per roster, players_points map, opponent roster_id.
- Player directory: `GET /v1/players/nfl` – static player metadata (position, team, status).
- Weekly player stats: `GET /v1/stats/nfl/{season_type}/{season}/{week}` (e.g., `regular/2025/3`) – raw stats per player. Use league scoring_settings to compute fantasy points if you don’t trust the matchup points field.
- League discovery (optional for UX): `GET /v1/user/{username}/leagues/nfl/{season}` to list leagues.

## Derived Data Structures
- Player draft map: `player_id -> {round, pick_no, drafted_by_owner_id?}` from draft picks; fill undrafted as `round=null`.
- Started lineup log: for each week/roster_id, capture `starters[]` from matchups plus `players_points`; attach owner_id via rosters list.
- Player weekly stats: merge `/stats` with player directory; compute fantasy points via scoring_settings; keep per-week and season total.
- Position grouping helper: normalize Sleeper positions to groups (e.g., WR, RB, TE, QB, K, DEF; handle multi-pos like RB/WR if present).

## Player View Calculations
- Most points by position: sum per-player points across selected weeks; group by position; allow total and average per game/started weeks.
- Most points by draft round: use draft map to tag each player with round, then aggregate points per player; include filter to hide undrafted.
- Typical filters/sorts: week range, season type (regular/post), position/group, draft round, owner/team, min games played, sort by total/average/median.

## Team (Manager) View Calculations
- Started-only aggregation: for each roster_id and week, use matchups `starters` plus `players_points`; sum only starters.
- Combined points by position group: aggregate starters’ points per roster across week range by normalized position group.
- Combined points by draft round: join starters to draft map; sum starters’ points grouped by round.
- Include per-week breakdowns for drilldowns and tie-breaking; allow sorting by totals/averages and by specific position groups.

## Scoring Settings (1257507151190958081, 2025)
- Passing: `pass_yd 0.04`, `pass_td 4`, `pass_int -1`, `pass_2pt 2`.
- Rushing: `rush_yd 0.1`, `rush_td 6`, `rush_2pt 2`.
- Receiving: `rec 0.5` (half PPR), `rec_yd 0.1`, `rec_td 6`, `rec_2pt 2`.
- Turnovers/other: `fum_lost -2`, `fum 0`, `ff 0`, `fum_rec 2`, `fum_rec_td 6`, `st_ff 0`, `st_fum_rec 0`.
- Kicking: `fgm_0_19 0`, `fgm_20_29 0`, `fgm_30_39 0`, `fgm_40_49 0`, `fgm_50_59 0`, `fgm_60p 0`, `fgmiss 0`, `xpm 0`, `xpmiss 0`.
- Defense/special teams: `sack 1`, `int 2`, `def_td 6`, `def_st_td 6`, `st_td 6`, `blk_kick 3`, `safe 4`, `def_pass_def 0.25`, `tkl_loss 0.5`, `def_3_and_out 0.25`, `def_4_and_stop 0.5`, `def_2pt 4`.
- Points/yardage allowed: `pts_allow 0`, `pts_allow_0 0`, `pts_allow_1_6 0`, `pts_allow_7_13 0`, `pts_allow_14_20 -1`, `pts_allow_21_27 -2`, `pts_allow_28_34 -3`, `pts_allow_35p -4`; yards allowed bands: `yds_allow_0_100 0`, `yds_allow_100_199 0`, `yds_allow_200_299 0`, `yds_allow_300_349 0`, `yds_allow_350_399 -1`, `yds_allow_400_449 -2`, `yds_allow_450_499 -3`, `yds_allow_500_549 -4`, `yds_allow_550p -5`, `yds_allow 0`.

## Data Flow & Caching
- Fetch once per load:
  - league, users, rosters, drafts → pick map, player directory.
  - stats per week and matchups per week for selected season/week range; cache by key `{season_type, season, week}`.
- Reuse cached stats when changing sort/filter; avoid refetching player directory unless season changes.
- Consider background prefetch of all weeks up to current week; or lazy-load weeks on demand with a loading state.

## Edge Cases to Handle
- Undrafted players (waivers) → tag as `round: null` and allow filter to include/exclude.
- Multi-draft leagues (keepers) → multiple draft_ids; build map from the correct season’s draft.
- Position eligibility changes → rely on `/players` latest position; store week-level position if you prefer consistency.
- Bye weeks / zero-point starts → count as games started; keep zero scores in aggregates.
- Scoring discrepancies → prefer recomputing fantasy points from `/stats` + scoring_settings for consistency across views.

## Work Breakdown (high-level)
1) Document data contracts: TS interfaces for league, matchup, draft pick, player, derived aggregates.
2) Build Sleeper client module with functions for the endpoints above and simple in-memory cache.
3) Implement transformers:
   - draft pick → player draft map
   - matchups → started lineup log
   - stats + scoring_settings → fantasy points per player/week
4) Aggregation functions:
   - Player: totals/averages by position and by draft round
   - Team: started-only totals by position group and draft round
   - Shared sorting/filtering helpers
5) UI scaffolding: two tabs (Player/Team), filter bar (season/week range, position, draft round, search), sortable table component.
6) Wire data to UI with loading/error states; add drilldown rows for per-week detail.
7) Tests: unit tests for transformers and aggregations (starter-only sums, draft round joins, scoring calc); integration test for API shape mocks.
8) Performance/UX polish: debounce search, cache bust strategy per season, empty states for missing data.
