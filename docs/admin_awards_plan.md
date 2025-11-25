# Admin Area for Seasonal Awards – Implementation Plan

## Goals
- Provide an admin-only UI to manage five seasonal awards (Award I–V).
- Allow editing: display title, informal label, tooltip definition/criteria, and winner (owner).
- Persist data so site can render awards and tooltips for end users.
- Add nav entry to reach admin area (access control can be stubbed now, hardened later).

## Data Model & Storage
- Award fields: `id` (Award I–V), `title`, `informalLabel`, `definition`, `winnerOwnerId`.
- Source of truth: start with local JSON or store module (per existing state pattern) with API stubs; keep structure compatible with future backend persistence.
- Create TypeScript interfaces/types for awards to reuse across admin UI and display components.

## UI Surface
- Route: `/admin/awards` added to router. Basic nav link labeled “Admin: Awards” visible for now.
- Layout: table or stacked cards listing Award I–V with edit controls.
- Form controls per award: text inputs for `title` and `informalLabel`, textarea for `definition`, select for `winner` populated from owners list (if available; otherwise free-text fallback).
- Tooltip preview: lightweight preview component showing how title + tooltip render.
- Save controls: per-row “Save” (preferred) plus optional “Save All”.
- Validation: required `title`; warn if definition missing; enforce max lengths (e.g., title 60 chars, label 80, definition 500).

## State & Logic
- Fetch initial awards data from existing store/api (or seed defaults if none).
- Local edit state per award; dirty tracking to enable/disable Save.
- Form submission updates shared store and persists via API stub (Promise-based to allow async UX).
- Handle loading and error states; show inline success toast/snackbar or badge.

## Tooltip Definitions
- Add helper to centralize tooltip copy source (shared util or store selector) so the public seasonal awards component reads from same data the admin edits.
- Ensure Markdown/italic support in definition text (if markdown already used, keep consistent); otherwise allow basic emphasis by storing raw text and letting renderer handle italics.

## Access Control (placeholder)
- Gate admin route behind a simple feature flag/env check or mock boolean in store.
- Include TODO to replace with real auth (e.g., session/role check) later.

## Integration Points
- Update existing seasonal awards display component to pull from the new awards source (types shared) and render tooltip definitions.
- Ensure winner display uses updated `winnerOwnerId` -> owner name mapping; add helper if mapping exists elsewhere.
- Add nav link near existing navigation components; visually distinct but not dominant.

## Testing & QA
- Unit/logic tests: data mapper/helpers for awards, validation, and tooltip formatter.
- Component tests: admin form saves, dirty state reset, tooltip preview matches saved definition.
- Manual QA checklist: load admin page, edit all fields, save single award, save all, reload page to confirm persistence, verify public awards view shows updates and tooltips on hover.

## Work Breakdown (execution order)
1) Add shared types and seed data/storage for awards (five defaults).  
2) Wire store/api stubs for read/write with async shape and error cases.  
3) Add admin route, container view, and nav link.  
4) Build form UI with validation, dirty tracking, and per-row save + save-all.  
5) Add tooltip preview and connect to shared tooltip renderer/logic.  
6) Integrate seasonal awards display to use new data and tooltips.  
7) Add feature flag placeholder for admin visibility.  
8) Tests + manual QA script; adjust copy/UX polish.  
