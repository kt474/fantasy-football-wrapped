# ESPN Support Implementation Plan

This plan is scoped to this codebase as it exists today. The goal is to add ESPN as a second fantasy provider without forking the app into a "Sleeper path" and an "ESPN path" everywhere.

## Objectives

- Keep the existing UI working for Sleeper while ESPN is added incrementally.
- Introduce a provider abstraction at the API boundary, not throughout the component tree.
- Ship a usable ESPN MVP quickly: public league import, standings, rosters, and weekly scores.
- Defer private ESPN leagues and advanced features until the foundation is stable.

## Current Architecture Notes

These files are the main seams:

- `src/api/sleeperApi.ts`
  - Mixes raw Sleeper fetches and normalization into app-level shapes.
- `src/api/api.ts`
  - Builds the normalized `LeagueInfoType` object used by the rest of the app.
- `src/types/types.ts`
  - Defines the normalized shapes consumed by most UI components.
- `src/composables/useLeagueInput.ts`
  - Assumes all league input flows are Sleeper-specific.
- `src/store/store.ts`
  - Uses `leagueId` as the unique identity for leagues.
- `src/views/Home.vue`
  - Restores league state from route params and local storage using `leagueId`.

Important constraint:

- Most components already depend on normalized shapes like `LeagueInfoType`, `RosterType`, `UserType`, and `weeklyPoints`.
- That means the right first move is to stabilize those internal contracts and route all providers into them.

## Recommended Delivery Order

### 1. Add provider identity to the normalized model

Goal:

- Make provider part of league identity before ESPN data exists.

Files:

- `src/types/types.ts`
- `src/types/apiTypes.ts`
- `src/store/store.ts`
- `src/views/Home.vue`
- `src/App.vue`
- `src/components/layout/LeagueSwitcher.vue`

Changes:

- Add a provider type:
  - `type FantasyProviderId = "sleeper" | "espn";`
- Add `provider: FantasyProviderId` to `LeagueInfoType`.
- Add a derived stable key for league identity:
  - `leagueKey = "${provider}:${leagueId}"`
- Stop assuming `leagueId` is globally unique.
- Update store lookups and persistence to key by `leagueKey`.
- Keep `leagueId` for provider-native API calls only.

Why first:

- This avoids collisions and painful rewrites later.
- It also lets local storage and routing support multiple providers cleanly.

Acceptance criteria:

- Existing Sleeper leagues still restore from storage.
- Current league selection works using `leagueKey`.
- No component breaks from the extra `provider` field.

### 2. Extract a provider interface

Goal:

- Move app orchestration away from direct Sleeper calls.

Files:

- New file: `src/api/providers/types.ts`
- New file: `src/api/providers/sleeperProvider.ts`
- `src/api/api.ts`
- `src/api/sleeperApi.ts`

Changes:

- Define a provider contract that returns normalized app data, not raw vendor payloads.
- Suggested interface:

```ts
export type ProviderLeagueRef = {
  provider: "sleeper" | "espn";
  leagueId: string;
  season?: string;
};

export interface FantasyProvider {
  validateLeague(ref: ProviderLeagueRef): Promise<LeagueOriginal | null>;
  getLeagueBundle(ref: ProviderLeagueRef): Promise<LeagueInfoType>;
  getUserLeagues?(usernameOrUserId: string, season: string): Promise<UserLeagueListItem[]>;
}
```

- Move current Sleeper orchestration in `getData()` behind `sleeperProvider.getLeagueBundle()`.
- Leave low-level Sleeper fetch helpers in `src/api/sleeperApi.ts`.
- Make `src/api/api.ts` dispatch by provider instead of calling Sleeper directly.

Why this shape:

- The rest of the app mostly wants a fully normalized league bundle.
- ESPN raw payloads are structurally different enough that trying to share transport-level methods will create more branching than it removes.

Acceptance criteria:

- `getData()` still works for Sleeper through the new provider adapter.
- No user-visible behavior changes yet.

### 3. Separate normalized types from Sleeper-specific raw types

Goal:

- Make it obvious which types are internal contracts and which are vendor payloads.

Files:

- `src/types/types.ts`
- `src/types/apiTypes.ts`
- New file: `src/types/providers/sleeper.ts`
- New file: `src/types/providers/espn.ts`

Changes:

- Keep app-facing normalized types in `src/types/types.ts`.
- Move Sleeper raw response types out of `apiTypes.ts` into `src/types/providers/sleeper.ts`.
- Add ESPN raw response types in `src/types/providers/espn.ts` as the ESPN implementation begins.
- Reduce the ambiguity around names like `LeagueOriginal`, `Roster`, and `User`.

Acceptance criteria:

- Provider adapters import provider-specific raw types from provider-specific files.
- Shared business logic imports only normalized types where possible.

### 4. Add an ESPN provider MVP

Goal:

- Support loading a public ESPN league and rendering the core standings experience.

Files:

- New file: `src/api/espnApi.ts`
- New file: `src/api/providers/espnProvider.ts`
- `src/types/providers/espn.ts`
- `src/api/api.ts`

Scope for MVP:

- Validate public ESPN league input.
- Fetch league metadata.
- Fetch teams and managers.
- Fetch rosters.
- Fetch matchup schedule and weekly scores.
- Normalize into:
  - `LeagueInfoType`
  - `RosterType[]`
  - `UserType[]`
  - `PointsType[]`

Explicitly out of scope for MVP:

- Username-based league discovery
- Draft grades
- Waiver/trade detail parity
- Historical previous-league chaining
- Private league auth

Implementation notes:

- Return `provider: "espn"` in the normalized league.
- Use ESPN-native team/member IDs internally only while mapping.
- Populate unsupported fields with safe defaults, not fake parity.
- If ESPN cannot provide a field for MVP:
  - `previousLeagueId: null`
  - `draftId: ""`
  - `waivers: []`
  - `trades: []`
  - `transactions: {}`

Acceptance criteria:

- A public ESPN league can be loaded into the store.
- The main standings/table view renders without provider-specific conditionals.

### 5. Update league input UX for provider selection

Goal:

- Let users choose Sleeper or ESPN without overloading the current Sleeper form.

Files:

- `src/composables/useLeagueInput.ts`
- `src/components/shared/LeagueInputForm.vue`
- `src/components/layout/Dialog.vue`
- `src/components/home/Intro.vue`

Changes:

- Add provider selection to the form:
  - Sleeper
  - ESPN
- Keep current Sleeper flows:
  - League ID
  - Username
- Add ESPN MVP flow:
  - League ID
  - Season
- Validation rules should branch at the provider level, not inside every submit path.
- Store the selected provider in local storage along with input preferences.

Acceptance criteria:

- Users can load a Sleeper league exactly as before.
- Users can load a public ESPN league using provider + league ID + season.

### 6. Fix persistence and routing around provider-aware league keys

Goal:

- Prevent collisions and broken restores when both providers are supported.

Files:

- `src/views/Home.vue`
- `src/App.vue`
- `src/store/store.ts`
- `src/components/layout/LeagueSwitcher.vue`

Changes:

- Store `currentLeagueKey` instead of only `currentLeagueId`.
- Persist full league objects including `provider`.
- Route query should eventually include provider information.
- Recommended route format:
  - `?provider=sleeper&leagueId=123`
  - `?provider=espn&leagueId=456&season=2025`

Minimum acceptable fallback:

- If route only contains `leagueId`, default to Sleeper for backward compatibility.

Acceptance criteria:

- Switching between a Sleeper league and an ESPN league works reliably.
- Refresh and restore do not lose provider context.

### 7. Add asset helpers to remove Sleeper CDN assumptions

Goal:

- Stop hardcoding Sleeper image URLs throughout the UI.

Files:

- New file: `src/lib/assets.ts`
- Multiple components that render player/team avatars

Initial likely call sites:

- `src/components/roster_management/Waivers.vue`
- `src/components/weekly_report/WeeklyReport.vue`
- `src/components/weekly_report/WeeklyPreview.vue`
- `src/components/wrapped/Wrapped.vue`
- `src/components/trade_lab/TradeLab.vue`
- `src/components/start_sit/PlayerNews.vue`

Changes:

- Create helper functions such as:
  - `getPlayerImageUrl(provider, playerId)`
  - `getTeamLogoUrl(provider, teamAbbrOrId)`
- For ESPN MVP, use a fallback image strategy if clean assets are not available yet.
- Avoid spreading provider-specific URL logic in templates.

Acceptance criteria:

- Components render images through helpers instead of directly using Sleeper CDN URLs.
- ESPN leagues do not crash image rendering.

### 8. Add provider capability flags for unsupported features

Goal:

- Prevent incomplete ESPN parity from creating broken screens.

Files:

- New file: `src/api/providers/capabilities.ts`
- Relevant feature components

Changes:

- Define provider capabilities, for example:

```ts
export const providerCapabilities = {
  sleeper: {
    usernameLookup: true,
    trades: true,
    waivers: true,
    draft: true,
    leagueHistory: true,
  },
  espn: {
    usernameLookup: false,
    trades: false,
    waivers: false,
    draft: false,
    leagueHistory: false,
  },
} as const;
```

- Use capability gates in a few strategic places instead of letting features fail deep in the stack.

Acceptance criteria:

- Unsupported ESPN features are hidden or clearly marked unavailable.
- Core pages remain usable.

### 9. Add fixtures and normalization tests before expanding ESPN features

Goal:

- Make the provider boundary safe to evolve.

Files:

- `test/api-fallbacks.test.js`
- New file: `test/espnProvider.test.js`
- New fixtures directory if needed

Tests to add:

- ESPN public league normalization
- Team/member mapping into `UserType[]`
- Weekly matchup normalization into `PointsType[]`
- Missing field handling
- Provider-aware store identity behavior

Acceptance criteria:

- ESPN provider logic is covered by fixture-based tests.
- Sleeper regression tests still pass.

## Suggested Milestones

### Milestone 1: No user-visible ESPN support yet

Deliverables:

- `provider` added to normalized models
- provider interface introduced
- Sleeper migrated onto provider interface
- persistence/store updated to use `leagueKey`

This is the most important architecture milestone.

### Milestone 2: ESPN public league MVP

Deliverables:

- ESPN provider implementation
- provider-aware input form
- standings/table works for ESPN
- provider-aware route and persistence

At this point the app can claim ESPN support in a limited sense.

### Milestone 3: UX cleanup and compatibility

Deliverables:

- image/asset helpers
- capability gating
- graceful empty states for unsupported ESPN features

### Milestone 4: Advanced ESPN features

Deliverables:

- draft support if feasible
- transactions/trades/waivers if feasible
- historical league support if feasible
- private league backend flow if desired

## Concrete First PR

If breaking this into a first implementation PR, I would do only this:

1. Add `FantasyProviderId` and `provider` to normalized league models.
2. Add `leagueKey` helpers and update store selection logic.
3. Introduce `FantasyProvider` interface.
4. Wrap current Sleeper `getData()` logic inside `sleeperProvider`.
5. Keep all user behavior the same.

That PR will feel "invisible", but it creates the seam that makes ESPN support realistic instead of messy.

## Known Risks

- Many components assume Sleeper-specific player image URLs.
- Some features assume Sleeper-only data richness:
  - draft metadata
  - transaction structures
  - previous league chains
- Local storage currently persists league objects without provider-aware identity.
- ESPN private league access likely requires a backend proxy and auth cookies, which should not be mixed into the initial MVP.

## Recommendation on Scope

Do not aim for full ESPN parity first.

Start with:

- public ESPN league input
- standings
- rosters
- weekly scores

Then prove the provider architecture works. Everything else gets easier once that foundation is in place.
