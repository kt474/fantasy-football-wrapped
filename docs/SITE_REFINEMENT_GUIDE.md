# Fantasy Football Wrapped — Site Refinement & Improvement Guide

This playbook is optimized for **one known league** (yours). Priority is depth, speed, and multi-season continuity (past + future seasons). Public/generalized polish is a far-future idea and should not influence near-term choices beyond keeping doors open.

## Current Experience Snapshot (single-league lens)
- Entry points: Header links (Home, Rosters, Player Stats) plus About modal, GitHub link, dark mode toggle, and username toggle. Contact/Privacy/Changelog live separately.
- Home layout: Hero + league input, saved league cards, and 10 tabbed modules sharing the active league’s data (Overview, Standings, Power Rankings, Expected Wins, Manager Efficiency, Playoffs, Weekly Report, Start/Sit, Draft, League History). Tabs persist in localStorage; a default league loads when configured.
- Feature behaviors (tabbed):
  - Overview → league settings, playoff/waiver details, roster slots, season status, 2025 payout tracker (auto-fills when data exists).
  - Standings → sortable league table (record, points for/against, record vs. all, median record), trends, manager efficiency snippets, weekly high scores, standings chart.
  - Power Rankings → blended ranking data, projections, team ranking breakout.
  - Expected Wins → expected wins cards, charts, schedule strength/analysis.
  - Manager Efficiency → efficiency card, ranking trend graph, transactions chart, trades, waivers.
  - Playoffs → odds percentages + bracket.
  - Weekly Report → AI summaries (API key gated); Start/Sit → player news feed; Draft → draft recap/grades; League History → prior leagues and trends.
- Separate routes: `/players` (search + season/weekly lines, deep links from rosters) and `/rosters` (roster switcher with per-player season stats). Both reuse active league scoring/season when present.
- Data/state: Sleeper is primary; heavy localStorage for caching, tab state, league persistence. Auto-refresh tries every 24h per league; most errors surface as shell-level alerts.

## Observations & Opportunities (for your league)
- Discoverability: Core analytics live behind tabs; only Rosters and Player Stats are first-level routes. You know your league, so discovery matters more for speed (jumping to the right module) than for onboarding strangers.
- Multi-season continuity: League History exists but the UI and copy are season-agnostic. Payout tracker is 2025-specific, and cross-season records/awards aren’t first-class.
- State handling: LocalStorage-driven refresh is brittle (undefined leagueId guardrails, silent corruption risk). For a single league, we can be stricter: assert the known league ID, clear bad state, and refresh deterministically.
- Performance/UX: Dense tables/charts in one scroll; mobile can be overwhelming. Sticky navigation and sectional anchors would make recurring use faster.
- Content consistency: Limited meta titles/descriptions and inconsistent scoring labels. Context (scoring, season, week) should be explicit on every module for quick validation.
- AI/news dependencies: Weekly Reports/Current Trends/Start-Sit rely on external keys; when absent, the experience is empty. For personal use, these can be stubbed or clearly flagged without generic upsell.

## Proposed Information Architecture (single-league focus)
- Top-level navigation
  - Home (League Hub): League status, quick actions, shortcuts to key modules.
  - Standings & Insights: Standings, weekly highs, trends, charts.
  - Rankings & Projections: Power rankings, projections, team ranking views.
  - Schedule Luck: Expected wins, schedule strength, schedule analysis.
  - Roster Management: Efficiency, lineup vs. potential, transactions/trades/waivers.
  - Playoffs: Odds + bracket.
  - Draft & History: Draft recap/grades and league history rollups (season picker + all-time records).
  - Reports: Weekly report + AI summaries (when enabled).
  - Tools: Player Stats Explorer, Rosters, Start/Sit news.
- Secondary navigation
  - Sticky subnav within long pages (jump to tables/charts/cards).
  - Global “Swap League”/refresh affordance in the header (even if primarily one league, keep the control visible and quick).

## Near-Term Improvements (prioritized for your league)
- Multi-season spine
  - Add a season switcher and surface the active season in headers/badges across modules.
  - Elevate League History into an “All-Time” recordbook: champions, runner-up, points for/against leaders, streaks, draft value hits, and payouts per season.
  - Make the payout tracker season-aware (configurable year, amounts, and bonuses) and hide it when data is missing.
- Speed and navigation
  - Sticky tab/subnav on Home; add jump links to sections used most (Standings, Expected Wins, Power Rankings).
  - Quick actions on Home to open Rosters, Player Stats, or Playoffs directly with the current league context.
- Data quality and resilience
  - Enforce the known league ID: block "undefined" states, reset caches atomically, and add a manual refresh control per league card.
  - Memoize `tableData` per season/week and lazy-load heavy charts only when visible.
  - Add inline empty/error states for AI/news/projections modules when keys are absent; allow manual refresh/retry.
- Context clarity
  - Standardize scoring labels (Standard/Half-PPR/PPR/custom) and show season/week in module headers.
  - Annotate data freshness (last fetched) and data sources (Sleeper, AI) on key cards.
- Mobile ergonomics
  - Column prioritization on tables (collapse secondary stats behind expandable rows on small screens).
  - Keep filters/sorts visible (or floating) for quick toggling on phones.

## Data & Technical Improvements (single-league emphasis)
- Fetch/caching: Centralize league fetch with explicit cache TTLs; background refresh with a toast, not silent overwrites. Persist per-season caches separately to avoid cross-season bleed.
- State hygiene: When URL/localStorage is invalid, hard-reset to the known league ID and clear dependent keys together.
- Feature flags: AI/news/projections gated behind explicit flags; render setup prompts or stubs when disabled.
- Performance: Lazy-load chart bundles, memoize computed table data, and measure bundle size; consider preloading the current season’s player directory for faster Player Stats lookups.

## Delivery Plan (phased, near term)
- Phase 1: Navigation and context
  - Add sticky subnav on Home; add quick links to core modules.
  - Surface season + scoring badges on headers; add a season switcher where relevant.
  - Guardrails for league ID/localStorage (hard reset to known league when invalid).
- Phase 2: Multi-season + data quality
  - Build all-time recordbook view; season-aware payout tracker; per-season caches.
  - Inline empty/error states for AI/news/projections; manual refresh controls.
- Phase 3: Performance and polish
  - Lazy-load charts, memoize table data, and optimize mobile table views.
  - Add data freshness indicators and background refresh toasts.

## Far-Future (public/general use, deprioritized)
- Broader onboarding, generic “add your league” flows, and discoverability for new users.
- SEO/meta polish across routes, public sharing links, and demo leagues.
- Privacy/consent workflows and per-user settings for shared environments.

## Quick Wins to Tackle Now
- Add sticky tab/subnav on Home with jump links to Standings, Power Rankings, Expected Wins.
- Add season + scoring badges on module headers; add a season switcher that drives League History, payout tracker, and table contexts.
- Guard against "undefined" leagueId: hard reset caches and URL to the known league when detected; add a manual refresh button on league cards.
- Inline empty/error messaging (with retry) for Weekly Report, Start/Sit, and Projections when keys/data are missing.
- Convert payout tracker to season-aware config and hide when data isn’t available.
