# Cloudflare Pages + D1/KV rollout plan

Goal: deploy the Vite frontend to Cloudflare Pages and replace the Vercel awards file API with a Cloudflare Pages Function backed by durable storage (D1 or KV).

## 1) Frontend deployment prep
- Ensure `npm run build` succeeds locally (Vite).
- Add an SPA fallback for Pages: `public/_redirects` created with `/*   /index.html   200`.
- Remove or gate `@vercel/analytics` in `src/App.vue` (swap to Cloudflare Web Analytics or disable if `import.meta.env.VITE_VERCEL_ANALYTICS !== "true"`).
- Confirm all `VITE_*` calls point to reachable HTTPS URLs and have CORS that allows the Pages domain.
- Note current awards client expects same-origin `/api/awards` (see `src/api/awardsClient.ts`); keep that path in the Pages Function.

## 2) Choose storage: D1 vs KV
- D1: structured, SQL, good for awards array with owner IDs/amounts; supports queries/updates. Best choice here.
- KV: simpler key-value; fine for a single JSON blob. Use if you want minimum setup.
Plan assumes D1; note a KV alternative where relevant.

## 3) Provision Cloudflare resources
- Create a Pages project from GitHub repo.
- Set build command `npm run build`, output `dist`.
- Create a D1 database (e.g., `ffw-awards`) and a binding (e.g., `DB`).
- (Optional) Create a KV namespace (e.g., `FFW_AWARDS_KV`) and binding (e.g., `AWARDS_KV`) if you prefer KV.
- Add Pages environment variables for runtime: `VITE_AWARDS_API_URL` (your Pages Functions base, e.g., `https://<project>.pages.dev/api/awards`), plus any other `VITE_*` endpoints you want enabled.

## 4) Data model + migration (D1)
- Table: `awards` with columns: `id TEXT PRIMARY KEY`, `title TEXT`, `informalLabel TEXT`, `definition TEXT`, `amount INTEGER`, `winnerOwnerId TEXT NULL`, `winnerNameOverride TEXT NULL`, `updatedAt TEXT DEFAULT CURRENT_TIMESTAMP`.
- Seed with current defaults on first deploy using a migration script.
- Migration file example (sql) added as `migrations/0001_awards.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS awards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    informalLabel TEXT NOT NULL,
    definition TEXT NOT NULL,
    amount INTEGER NOT NULL,
    winnerOwnerId TEXT,
    winnerNameOverride TEXT,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  ```

## 5) Pages Function shape (`functions/api/awards.ts`)
- Handler: respond to `GET` and `PUT`.
- GET: fetch all awards from D1 ordered by `id`, return `{ awards }`.
- PUT: validate payload `{ awards: Award[] }`, upsert each award, return `{ awards }`.
- CORS: `Access-Control-Allow-Origin: *` (or restrict to your Pages domain).
- Types: reuse existing award shape from `api/awards.ts` (id/title/informalLabel/definition/amount/winnerOwnerId/winnerNameOverride).
- D1 binding: `env.DB.prepare(...).all()` for reads; `batch` or `prepare` for upserts.
- KV alternative: `GET`/`PUT` a single `awards.json` value via `env.AWARDS_KV.get/put` with JSON parse/stringify.
- Implementation stub (D1) added at `functions/api/awards.ts`:
  ```ts
  // functions/api/awards.ts
  import type { Env } from "hono";
  import type { SeasonalAward } from "../../src/api/types"; // or copy types locally

  const defaultAwards: SeasonalAward[] = [/* same defaults as api/awards.ts */];

  export const onRequest: PagesFunction<{ DB: D1Database }> = async ({ request, env }) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

    try {
      if (request.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM awards ORDER BY id").all<SeasonalAward>();
        const awards = results?.length ? results : defaultAwards;
        return Response.json({ awards }, { headers: corsHeaders });
      }

      if (request.method === "PUT") {
        const body = await request.json();
        const awards = Array.isArray(body?.awards) ? (body.awards as SeasonalAward[]) : null;
        if (!awards) return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400, headers: corsHeaders });

        const stmt = env.DB.prepare(
          "INSERT INTO awards (id,title,informalLabel,definition,amount,winnerOwnerId,winnerNameOverride,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,datetime('now')) ON CONFLICT(id) DO UPDATE SET title=excluded.title, informalLabel=excluded.informalLabel, definition=excluded.definition, amount=excluded.amount, winnerOwnerId=excluded.winnerOwnerId, winnerNameOverride=excluded.winnerNameOverride, updatedAt=datetime('now')"
        );
        await env.DB.batch(
          awards.map((a) =>
            stmt.bind(a.id, a.title, a.informalLabel, a.definition, a.amount, a.winnerOwnerId ?? null, a.winnerNameOverride ?? null)
          )
        );
        return Response.json({ awards }, { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405, headers: corsHeaders });
    } catch (error) {
      console.error("Awards API error", error);
      return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500, headers: corsHeaders });
    }
  };
  ```
- KV stub (if chosen):
  ```ts
  // functions/api/awards.ts
  export const onRequest: PagesFunction<{ AWARDS_KV: KVNamespace }> = async ({ request, env }) => {
    const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,PUT,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (request.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method === "GET") {
      const awards = (await env.AWARDS_KV.get("awards", "json")) ?? defaultAwards;
      return Response.json({ awards }, { headers: corsHeaders });
    }
    if (request.method === "PUT") {
      const body = await request.json();
      const awards = Array.isArray(body?.awards) ? body.awards : null;
      if (!awards) return new Response(JSON.stringify({ message: "Invalid payload" }), { status: 400, headers: corsHeaders });
      await env.AWARDS_KV.put("awards", JSON.stringify(awards));
      return Response.json({ awards }, { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405, headers: corsHeaders });
  };
  ```

## 6) Wire the frontend
- Update `VITE_AWARDS_API_URL` in Pages environment to the new function URL (`/api/awards`).
- Ensure `src/api/awardsClient.ts` uses that env (already does); no code change required if the path stays the same.
- Verify admin gating (`VITE_ENABLE_ADMIN_AWARDS`) remains enabled as desired.

## 7) Local dev parity
- Add a `wrangler.toml` for local functions:
  - `pages_build_output_dir = "dist"`
  - Bindings: `[[d1_databases]] binding = "DB" database_name = "ffw-awards" database_id = "<id>"`
  - Optional KV binding.
- Run `npm run build` then `npx wrangler pages dev dist --d1 DB=<id>` to test functions locally, or use `wrangler pages dev` with `--local` to bypass account.

## 11) Post-deploy checklist (do this after completing steps above)
- Replace placeholder IDs in `wrangler.toml` with real D1 (and optional KV) IDs after provisioning.
- In Cloudflare Pages settings, add the D1 binding name `DB` (and optional `AWARDS_KV`) and set `VITE_AWARDS_API_URL=/api/awards`.
- Deploy via Pages (GitHub hook or manual) and run the migration: `npx wrangler d1 execute <db-name> --file migrations/0001_awards.sql --remote`.
- Seed awards once (optional): send a `PUT` to `/api/awards` with the default awards array to populate the table.
- Smoke-test on the Pages URL: load site, hit awards admin, save, refresh to confirm persistence, and verify CORS is clean.

## 8) Deploy sequence
- Commit the new function, migrations, `_redirects`, and wrangler config.
- Push to GitHub; let Pages build/deploy.
- After deploy, run migration: `npx wrangler d1 execute <db-name> --file migrations/0001_awards.sql --remote`.
- Seed data: run a one-time script or use a `PUT` call with the default awards array.
- Smoke-test: open Pages URL, exercise awards admin, verify persistence across reloads and cold starts.

## 9) Ops/observability
- Set CORS appropriately once the final domain is known.
- Add basic logging in the function; keep it minimal to avoid noise.
- Consider rate limiting if awards admin is public; otherwise keep admin behind `VITE_ENABLE_ADMIN_AWARDS=false` in prod.

## 10) Optional: KV-only path
- Skip D1; use KV binding `AWARDS_KV`.
- GET: `const json = await env.AWARDS_KV.get("awards", "json") || defaultAwards;`
- PUT: `await env.AWARDS_KV.put("awards", JSON.stringify(awards));`
- Trade-off: no partial updates/queries; all-or-nothing JSON blob, but simplest setup.
