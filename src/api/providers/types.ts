import type { LeagueOriginal } from "@/types/apiTypes";
import type {
  FantasyProviderId,
  LeagueInfoType,
  UserLeagueListItem,
} from "@/types/types";

export type ProviderLeagueRef = {
  provider: FantasyProviderId;
  leagueId: string;
  season?: string;
};

export interface FantasyProvider {
  validateLeague(ref: ProviderLeagueRef): Promise<LeagueOriginal | null>;
  getLeagueBundle(ref: ProviderLeagueRef): Promise<LeagueInfoType>;
  getUserLeagues?(
    usernameOrUserId: string,
    season: string
  ): Promise<UserLeagueListItem[]>;
}
