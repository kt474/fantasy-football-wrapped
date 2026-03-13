import type {
  FantasyProviderId,
  LeagueInfoType,
  UserLeagueListItem,
} from "@/types/types";
import type { LeagueOriginal } from "@/types/apiTypes";

type LeagueIdentity = {
  provider?: FantasyProviderId;
  leagueId: string;
  leagueKey?: string;
};

export const DEFAULT_FANTASY_PROVIDER: FantasyProviderId = "sleeper";

export const buildLeagueKey = (
  provider: FantasyProviderId,
  leagueId: string
) => `${provider}:${leagueId}`;

export const normalizeLeagueIdentity = <T extends LeagueIdentity>(
  league: T,
  fallbackProvider: FantasyProviderId = DEFAULT_FANTASY_PROVIDER
): T & { provider: FantasyProviderId; leagueKey: string } => {
  const provider = league.provider ?? fallbackProvider;
  const leagueKey = league.leagueKey ?? buildLeagueKey(provider, league.leagueId);

  return {
    ...league,
    provider,
    leagueKey,
  };
};

export const normalizeLeagueInfo = (
  league: LeagueInfoType
): LeagueInfoType => normalizeLeagueIdentity(league);

export const normalizeLeagueOriginal = (
  league: LeagueOriginal
): LeagueOriginal => normalizeLeagueIdentity(league);

export const normalizeUserLeagueListItem = (
  league: UserLeagueListItem
): UserLeagueListItem & { provider: FantasyProviderId } => ({
  ...league,
  provider: league.provider ?? DEFAULT_FANTASY_PROVIDER,
});

export const resolveLeagueKey = (
  leagues: LeagueInfoType[],
  leagueIdOrKey: string
) => {
  if (leagueIdOrKey.includes(":")) {
    return leagueIdOrKey;
  }

  const matchedLeague = leagues.find((league) => league.leagueId === leagueIdOrKey);
  return matchedLeague?.leagueKey ?? buildLeagueKey(DEFAULT_FANTASY_PROVIDER, leagueIdOrKey);
};
