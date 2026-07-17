import type { Bracket } from "@/types/apiTypes";
import type { LeagueInfoType, TableDataType, UserType } from "@/types/types";
import { formatOrdinal as formatDefinedOrdinal } from "@/lib/format";

export type EspnTeamSide = {
  teamId?: number;
  totalPoints?: number;
  pointsByScoringPeriod?: Record<string, number>;
};

export type EspnPlayoffMatchup = {
  id: number;
  matchupPeriodId: number;
  playoffTierType: string;
  winner?: "HOME" | "AWAY" | "UNDECIDED";
  home?: EspnTeamSide;
  away?: EspnTeamSide;
};

export type FinalPlacement = UserType & {
  rosterId: number;
  placement: number;
};

export const formatOrdinal = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return "-";
  return formatDefinedOrdinal(value);
};

const matchRosterId = (
  rosterId: number,
  league: LeagueInfoType,
  placement: number
): FinalPlacement => {
  const roster = league.rosters.find((item) => item.rosterId === rosterId);
  const user = roster
    ? league.users.find((item) => item.id === roster.id)
    : undefined;

  return {
    id: user?.id ?? String(rosterId),
    name: user?.name ?? "Unknown Team",
    username: user?.username ?? "Unknown Team",
    avatar: user?.avatar ?? "",
    avatarImg: user?.avatarImg ?? "",
    rosterId,
    placement,
  };
};

export const getEspnWinnerId = (matchup: EspnPlayoffMatchup) => {
  if (matchup.winner === "HOME") return matchup.home?.teamId;
  if (matchup.winner === "AWAY") return matchup.away?.teamId;
  return undefined;
};

export const getEspnLoserId = (matchup: EspnPlayoffMatchup) => {
  if (matchup.winner === "HOME") return matchup.away?.teamId;
  if (matchup.winner === "AWAY") return matchup.home?.teamId;
  return undefined;
};

const getEspnFinalMatchups = (matchups: EspnPlayoffMatchup[]) => {
  const completedMatchups = matchups.filter((matchup) =>
    Boolean(getEspnWinnerId(matchup) && getEspnLoserId(matchup))
  );
  const finalPeriod = completedMatchups.reduce(
    (max, matchup) => Math.max(max, matchup.matchupPeriodId),
    0
  );

  return completedMatchups
    .filter((matchup) => matchup.matchupPeriodId === finalPeriod)
    .sort((a, b) => a.id - b.id);
};

const getNextOpenPlacement = (
  usedPlacements: Set<number>,
  totalRosters: number
) => {
  for (let placement = 1; placement <= totalRosters; placement += 1) {
    if (!usedPlacements.has(placement)) return placement;
  }
  return totalRosters;
};

const getEspnFinalPlacements = (
  league: LeagueInfoType,
  tableData: TableDataType[]
) => {
  const result: FinalPlacement[] = [];
  const placedRosterIds = new Set<number>();
  const usedPlacements = new Set<number>();
  const totalRosters = league.totalRosters || tableData.length;
  const playoffTeams = league.playoffTeams || Math.max(2, tableData.length / 2);
  const espnWinnersBracket =
    (league.espnWinnersBracket ?? []) as EspnPlayoffMatchup[];
  const espnLosersBracket =
    (league.espnLosersBracket ?? []) as EspnPlayoffMatchup[];
  const espnMainBracket = espnWinnersBracket.filter(
    (matchup) => matchup.playoffTierType === "WINNERS_BRACKET"
  );
  const espnConsolationBracket = espnWinnersBracket.filter(
    (matchup) => matchup.playoffTierType === "WINNERS_CONSOLATION_LADDER"
  );
  const espnLoserMainBracket = espnLosersBracket.filter(
    (matchup) => matchup.playoffTierType === "LOSERS_BRACKET"
  );
  const espnLoserConsolationBracket = espnLosersBracket.filter(
    (matchup) => matchup.playoffTierType === "LOSERS_CONSOLATION_LADDER"
  );

  const addPlacement = (rosterId: number | undefined, placement: number) => {
    if (rosterId == null || placedRosterIds.has(rosterId)) return;

    result.push(matchRosterId(rosterId, league, placement));
    placedRosterIds.add(rosterId);
    usedPlacements.add(placement);
  };

  const addMatchupPlacement = (
    matchup: EspnPlayoffMatchup,
    winnerPlacement: number
  ) => {
    addPlacement(getEspnWinnerId(matchup), winnerPlacement);
    addPlacement(getEspnLoserId(matchup), winnerPlacement + 1);
  };

  getEspnFinalMatchups(espnMainBracket).forEach((matchup) => {
    addMatchupPlacement(matchup, 1);
  });
  getEspnFinalMatchups(espnConsolationBracket).forEach((matchup, index) => {
    addMatchupPlacement(matchup, 3 + index * 2);
  });
  getEspnFinalMatchups([
    ...espnLoserMainBracket,
    ...espnLoserConsolationBracket,
  ]).forEach((matchup, index) => {
    addMatchupPlacement(matchup, playoffTeams + 1 + index * 2);
  });

  tableData.forEach((user) => {
    if (!placedRosterIds.has(user.rosterId)) {
      addPlacement(user.rosterId, getNextOpenPlacement(usedPlacements, totalRosters));
    }
  });

  return result.sort((a, b) => a.placement - b.placement);
};

const getSleeperFinalPlacements = (
  league: LeagueInfoType,
  tableData: TableDataType[]
) => {
  const result: FinalPlacement[] = [];
  const totalRosters = league.totalRosters || tableData.length;
  const playoffType = league.playoffType;
  const winnersBracket = league.winnersBracket ?? [];
  const losersBracket = league.losersBracket ?? [];
  const bracketType = losersBracket.length > 4;

  const addPlacement = (rosterId: number, placement: number) => {
    if (result.some((item) => item.rosterId === rosterId)) return;
    result.push(matchRosterId(rosterId, league, placement));
  };

  winnersBracket.forEach((matchup: Bracket) => {
    if (matchup.p === 1) {
      addPlacement(matchup.w, 1);
      addPlacement(matchup.l, 2);
    } else if (matchup.p === 3) {
      addPlacement(matchup.w, 3);
      addPlacement(matchup.l, 4);
    } else if (matchup.p === 5) {
      addPlacement(matchup.w, 5);
      addPlacement(matchup.l, 6);
    }
  });

  if (playoffType === 1) {
    losersBracket.forEach((matchup: Bracket) => {
      if (!bracketType) {
        if (matchup.p === 1) {
          addPlacement(matchup.w, totalRosters - 3);
          addPlacement(matchup.l, totalRosters - 2);
        } else if (matchup.p === 3) {
          addPlacement(matchup.w, totalRosters - 1);
          addPlacement(matchup.l, totalRosters);
        }
      } else if (matchup.p === 1) {
        addPlacement(matchup.w, totalRosters - 5);
        addPlacement(matchup.l, totalRosters - 4);
      } else if (matchup.p === 3) {
        addPlacement(matchup.w, totalRosters - 3);
        addPlacement(matchup.l, totalRosters - 2);
      } else if (matchup.p === 5) {
        addPlacement(matchup.w, totalRosters - 1);
        addPlacement(matchup.l, totalRosters);
      }
    });
  } else {
    losersBracket.forEach((matchup: Bracket) => {
      if (matchup.p === 1) {
        addPlacement(matchup.w, totalRosters);
        addPlacement(matchup.l, totalRosters - 1);
      } else if (matchup.p === 3) {
        addPlacement(matchup.w, totalRosters - 2);
        addPlacement(matchup.l, totalRosters - 3);
      } else if (matchup.p === 5) {
        addPlacement(matchup.w, totalRosters - 4);
        addPlacement(matchup.l, totalRosters - 5);
      }
    });
  }

  tableData.forEach((user) => {
    if (!result.find((placement) => placement.rosterId === user.rosterId)) {
      addPlacement(user.rosterId, Math.ceil(totalRosters / 2));
    }
  });

  return result.sort((a, b) => a.placement - b.placement);
};

export const getFinalPlacements = (
  league: LeagueInfoType,
  tableData: TableDataType[]
) => {
  if (league.status !== "complete") return [];

  if (
    league.platform === "espn" &&
    [...(league.espnWinnersBracket ?? []), ...(league.espnLosersBracket ?? [])]
      .length > 0
  ) {
    return getEspnFinalPlacements(league, tableData);
  }

  return getSleeperFinalPlacements(league, tableData);
};
