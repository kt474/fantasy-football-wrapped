# Fantasy Football Wrapped

Detailed analysis and insights for Sleeper fantasy football leagues.

Current features:

- Comprehensive standings and AI generated league news/current trends  
- Power rankings and roster rankings 
- Pre-season and in season projections
- Expected wins and strength of schedule (measuring luck)
- Roster management stats, trade rankings, and waiver wire moves
- Roster explorer with per-player fantasy stats and click-through to weekly breakdowns
- League overview tab with roster/scoring/playoff settings and a 2025 payout tracker
- Playoff projections
- AI generated weekly reports, summary of matchups and top/bottom performers from each week
- Weekly high score tracker for each played week (top starter score per week)
- Player stats explorer (search any NFL player for season/weekly fantasy points)
- Draft grades and recap
- League history stats

See `docs/FEATURES.md` for a feature-by-feature guide and last updated dates.

## Contributing 

### Getting started
Fork this repository and then clone the fork. To run the project locally, you'll need Node.js and npm installed. 

```bash
  git clone https://github.com/kt474/fantasy-football-wrapped.git
  cd fantasy-football-wrapped
  npm install
  npm run dev
```
None of the environment variables are required to get the project running locally but some features like the AI generated summaries are hidden behind an API. 

#### Running with the Awards admin API
- Install the Vercel CLI if you want the `/api/awards` function locally: `npm install -g vercel`
- Ensure `.env.local` includes `VITE_AWARDS_API_URL=http://localhost:3000`
- Start the app with the API available: `vercel dev`
  - If you instead run `npm run dev`, the awards API won’t be available; point `VITE_AWARDS_API_URL` at a deployed URL in that case.
- Admin endpoints require Cloudflare Access for both reads and writes. If you need local dev without an interactive Access login, set `ADMIN_API_PROXY_TARGET` to your deployed URL and add `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` (service token) so the Vite dev proxy forwards requests with the token server-side.

### Technologies
It would also be helpful to familiarize yourself with the technologies used in this project:

- Framework: Vue 3 and Typescript 
- UI: Flowbite and Tailwind CSS
- State managment: Pinia 
### Pull Request Process

1. Look through the open issues and find one you would like to work on (or create your own issues!) 
2. Create a new branch for your feature/fix
3. Make your changes
4. Submit a pull request

## Acknowledgements

- [Sleeper API](https://docs.sleeper.com/)
- [Avatars](https://getavataaars.com/)

## Contact

Please report any issues or request new features in the [issues](https://github.com/kt474/fantasy-football-wrapped/issues) tab
