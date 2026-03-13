import type { FantasyProvider, ProviderLeagueRef } from "./types";
import { getEspnLeague, getEspnLeagueBundle } from "../espnApi";

export const espnProvider: FantasyProvider = {
  async validateLeague(ref: ProviderLeagueRef) {
    if (ref.provider !== "espn" || !ref.season) {
      return null;
    }

    const league = await getEspnLeague(ref.leagueId, ref.season);
    return league.name ? league : null;
  },
  async getLeagueBundle(ref: ProviderLeagueRef) {
    if (!ref.season) {
      throw new Error("ESPN league loads require a season.");
    }

    return getEspnLeagueBundle(ref.leagueId, ref.season);
  },
};
