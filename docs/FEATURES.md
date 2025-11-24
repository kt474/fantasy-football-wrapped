# Fantasy Football Wrapped Feature Guide

Snapshot of the main user-facing modules, what they do, and when they were last updated. Update entries whenever behavior or data sources change.

## Standings
- What it does: Displays league table with wins/losses/ties, points for/against, record vs. all, and median record; sortable by column. Also shows weekly median-aware records and rankings.
- Data: `leagueInfo` from Sleeper (`getData` → `createTableData`), starter/bench points per week (`getWeeklyPoints`).
- Key UI: `components/standings/Table.vue`.
- Last updated: 2025-11-24.

## Weekly Fireworks (Weekly High Scores)
- What it does: Highlights the highest starter score for each completed week with team/roster context.
- Data: Same weekly points as Standings (`tableData.points`).
- Key UI: `components/standings/WeeklyHighScores.vue`.
- Last updated: 2025-11-24.

## Power Rankings
- What it does: Ranks teams using blended scoring (average, high/low, win percentage) plus roster projections.
- Data: `createTableData` output, projection data when available (`addProjectionData`).
- Key UI: `components/power_rankings/PowerRankingData.vue`, `components/power_rankings/Projections.vue`, `components/power_rankings/TeamRanking.vue`.
- Last updated: 2025-11-24.

## Expected Wins & Schedule Strength
- What it does: Estimates expected wins vs. random schedules, variance, and strength of schedule with charts.
- Data: `createTableData` derived metrics, weekly scores, median scoring flag.
- Key UI: `components/expected_wins/ExpectedWinsCard.vue`, `ExpectedWinsChart.vue`, `ExpectedWinsChart2.vue`, `ScheduleStrength.vue`, `ScheduleAnalysis.vue`.
- Last updated: 2025-11-24.

## Manager Efficiency
- What it does: Measures lineup efficiency vs. potential points; shows ranking trends and transaction activity.
- Data: Roster potential points, transaction counts (`getTotalTransactions`, `getWaiverMoves`).
- Key UI: `components/roster_management/ManagementCard.vue`, `TransactionsChart.vue`, `Trades.vue`, `Waivers.vue`, `RankingGraph.vue`.
- Last updated: 2025-11-24.

## Playoffs
- What it does: Shows playoff bracket, odds, and percentages (when available).
- Data: Sleeper winners/losers brackets, `addPlayoffOdds`.
- Key UI: `components/playoffs/Playoffs.vue`, `PlayoffPercentages.vue`.
- Last updated: 2025-11-24.

## Weekly Report & Previews
- What it does: Generates AI summaries of weekly matchups and previews (if API keys configured).
- Data: Sleeper matchups per week plus external AI endpoints (`VITE_WEEKLY_REPORT`, `VITE_WEEKLY_PREVIEW`).
- Key UI: `components/weekly_report/WeeklyReport.vue`.
- Last updated: 2025-11-24.

## Draft Recap
- What it does: Displays draft grades, picks, and metadata when available.
- Data: Sleeper draft data (`addDraftPicks`, `addDraftMetadata`, `addDraftGrades`).
- Key UI: `components/draft/Draft.vue`.
- Last updated: 2025-11-24.

## League History
- What it does: Shows historical performance and prior league links.
- Data: `previousLeagues` from Sleeper plus cached league info.
- Key UI: `components/league_history/LeagueHistory.vue`.
- Last updated: 2025-11-24.

## Current Trends & Player News
- What it does: AI-generated trends, plus player news feed in Start/Sit.
- Data: `addCurrentTrends`, player news endpoint (`VITE_PLAYER_NEWS`).
- Key UI: `components/standings/CurrentTrends.vue`, `components/start_sit/PlayerNews.vue`.
- Last updated: 2025-11-24.
