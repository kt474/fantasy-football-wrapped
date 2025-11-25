# Fantasy Football Wrapped — Site Refinement & Improvement Guide

Use this as a playbook for tightening the information architecture, navigation, and feature delivery of the site. It reflects the current build (Home page with tabbed modules, separate Rosters and Player Stats routes, and auxiliary pages like Contact/Privacy/Changelog) and proposes a structured path forward.

## Current Experience Snapshot
- Entry points: Header nav links to Home, Rosters, Player Stats; About modal, GitHub shortcut, dark mode toggle, and a setting to show usernames. Contact/Privacy/Changelog sit on their own routes.
- Home layout: Hero + league input, saved league chips/cards, and 10 tabbed modules that all share a single data set (Overview, Standings, Power Rankings, Expected Wins, Manager Efficiency, Playoffs, Weekly Report, Start/Sit, Draft, League History). Tabs persist in localStorage, and a default league loads when present.
- Feature behaviors (tabbed):
  - Overview → league settings, playoff/waiver details, roster slot breakdown, season status, and a 2025-specific payout tracker that auto-fills when data exists.
  - Standings → sortable league table (record, points for/against, record vs. all, median record), weekly median-aware records, trends, manager efficiency snippets, weekly high scores, and standings chart.
  - Power Rankings → blended ranking data, projections, and team ranking breakout.
  - Expected Wins → expected wins cards, two charts, schedule strength, and schedule analysis.
  - Manager Efficiency → efficiency card, ranking trend graph, transactions chart, trades, waivers.
  - Playoffs → odds percentages and bracket.
  - Weekly Report → AI summaries (requires configured API keys); Start/Sit → player news feed; Draft → draft recap/grades; League History → prior leagues and trends.
- Separate routes: `/players` (player search, season + weekly lines, deep links from rosters) and `/rosters` (roster switcher with per-player season stats and links to player pages). Both borrow scoring/seasons from the active league when present.
- Data/state: Sleeper is the primary source; heavy use of localStorage for caching, tab state, and league persistence. Auto-refresh attempts every 24h per league; most errors surface as alerts at the app shell level.

## Observations & Opportunities
- Discoverability: Most functionality is hidden inside Home tabs; only Rosters and Player Stats are first-level routes. New users may not realize there are 10 modules beyond the hero/table.
- Orientation: No step-by-step onboarding for grabbing a Sleeper league ID; the About modal carries messaging but isn’t a true getting-started flow. Payout tracker copy is locked to 2025.
- IA cohesion: Start/Sit (news) and Draft/History live alongside analytics tabs, creating a mixed mental model of "analytics vs. utilities." Weekly Reports and Current Trends depend on external AI/news keys with limited affordances when keys are missing.
- State handling: LocalStorage-driven refresh logic is fragile (e.g., undefined leagueId in URL, relying on full refetch per 24h). Error alerts are global and transient; modules lack inline empty/loading/error states in places.
- Performance/UX: Large table layouts and dense cards stack in one view; charts and tables can be overwhelming on mobile. No sticky tab nav or quick anchors to jump between modules.
- Content consistency: Meta titles/descriptions exist for only a few routes; tabbed modules share a single page title/description. Copy and badges are not always aligned to scoring format (e.g., showing PPR assumptions).

## Proposed Information Architecture
- Top-level navigation
  - Home (League Hub): League input, saved leagues, high-level overview tiles, and CTA to deeper modules.
  - Insights/Standings: Core standings, weekly highs, trends, charts.
  - Rankings & Projections: Power rankings, projection overlays, team ranking views.
  - Schedule Luck: Expected wins, schedule strength, schedule analysis.
  - Roster Management: Efficiency, lineup vs. potential, transactions/trades/waivers.
  - Playoffs: Odds + bracket.
  - Draft & History: Draft recap/grades and league history rollups.
  - Reports: Weekly report + any AI summaries.
  - Tools: Player Stats Explorer, Rosters, Start/Sit news.
- Secondary navigation
  - Add a sticky subnav or segmented controls within each section for charts/cards vs. tables; keep tabs only where intra-section toggles make sense.
  - Surface a lightweight global “Add/Swap League” affordance in the header (not just inside the Home hero).

## UX & Content Improvements
- Onboarding: Add a short “Get your Sleeper league ID” helper with steps, screenshots, and a test ID. Offer a demo league switcher rather than auto-loading only the default.
- Visibility: Promote key modules from Home (tiles linking to Standings/Rankings/Schedule Luck/Roster Mgmt). Show badges describing data sources (Sleeper, AI) and last update time.
- Empty/error handling: Inline module-level empty states for missing data or missing API keys (Weekly Report/Start-Sit/Projections). Keep global alerts for network failures but pair with contextual messaging.
- Mobile ergonomics: Compress table columns for small screens (priority columns only, expandable drawer for detail), and add sticky tab/subnav for long scroll sections.
- Copy & labeling: Standardize scoring terminology (Standard/Half-PPR/PPR/custom) and ensure tabs/cards show the scoring context. Refresh payout tracker to be season-agnostic or inject season/year text dynamically.
- Sharing & deep links: Keep querystring leagueId and add deep links for tab/section states so users can share a specific view.

## Data & Technical Improvements
- Data lifecycle: Centralize data fetching (league, points, projections, AI feeds) with explicit cache windows and background refresh; avoid silent localStorage corruption when IDs are undefined.
- API key awareness: Detect missing AI/news keys and render callouts with setup instructions instead of empty modules. Gate requests until keys exist to avoid noisy errors.
- Performance: Memoize tableData creation per league/week; lazy-load heavy chart components when their section is visible. Consider skeletons for charts, not just tables.
- State cleanup: Normalize currentLeagueId handling (block "undefined" in URL, clear dependent localStorage keys together) and expose a manual refresh control per league card.

## Delivery Plan (phased)
- Phase 1: IA and navigation
  - Ship dedicated routes/sections for the major modules above; keep redirects from legacy tab URLs if needed.
  - Add header-level league switcher and “Add league” entry point.
  - Implement sticky section nav within long pages.
- Phase 2: UX/content polish
  - Add onboarding helper for league ID, demo league selection, and empty/error states per module.
  - Update payout tracker and copy to be season-aware; standardize scoring labels and status chips.
  - Improve mobile table layouts and expose quick filters (e.g., sort presets: record/points/luckiest/unluckiest).
- Phase 3: Data/tech hardening
  - Centralize fetch/caching, add background refresh with toasts, and harden URL/localStorage parsing.
  - Add feature flags for AI/news/projections and render setup prompts when disabled.
  - Lazy-load charts, memoize table calculations, and measure bundle impact.

## Quick Wins to Tackle First
- Add a “Where to find your league ID” helper + demo league toggle on Home.
- Provide inline empty/error messaging for Weekly Report, Start/Sit news, and Projections when keys or data are missing.
- Make the tab bar sticky on Home and add jump links to key modules.
- Move the league selector toggle into the header so it’s reachable from all routes.
- Make payout tracker copy season-agnostic and hide it when season/year data is unknown.
