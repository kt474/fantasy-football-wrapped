<script setup lang="ts">
import FinalPlacements from "./FinalPlacements.vue";
import PlacementFlowChart from "./PlacementFlowChart.vue";
import LeagueSummary from "./LeagueSummary.vue";
import { handleImageFallback as handleImageError } from "@/lib/imageFallback";
import { computed } from "vue";
import { useStore } from "../../store/store";
import {
  fakeWinnersBracket,
  fakeLosersBracket,
  fakeRosters,
  fakeUsers,
  fakePoints,
} from "../../api/fakeLeague";
import { PointsType, TableDataType, UserType } from "../../types/types";
import Card from "../ui/card/Card.vue";
import Separator from "../ui/separator/Separator.vue";
const props = defineProps<{
  tableData: TableDataType[];
}>();
const store = useStore();

type EspnTeamSide = {
  teamId?: number;
  totalPoints?: number;
  pointsByScoringPeriod?: Record<string, number>;
};

type EspnMatchup = {
  id: number;
  matchupPeriodId: number;
  playoffTierType: string;
  winner?: "HOME" | "AWAY" | "UNDECIDED";
  home?: EspnTeamSide;
  away?: EspnTeamSide;
};

type EspnRoundSection = {
  title: string;
  matchups: EspnMatchup[];
};

type EspnRoundDisplay = {
  round: number;
  matchupPeriodId: number;
  title: string;
  sections: EspnRoundSection[];
};

const espnWinnersBracket = computed(() => {
  return (store.leagueInfo[store.currentLeagueIndex]?.espnWinnersBracket ??
    []) as EspnMatchup[];
});

const espnLosersBracket = computed(() => {
  return (store.leagueInfo[store.currentLeagueIndex]?.espnLosersBracket ??
    []) as EspnMatchup[];
});

const espnMainBracket = computed(() => {
  return [...espnWinnersBracket.value]
    .filter((matchup) => matchup.playoffTierType === "WINNERS_BRACKET")
    .sort((a, b) => {
      if (a.matchupPeriodId !== b.matchupPeriodId) {
        return a.matchupPeriodId - b.matchupPeriodId;
      }
      return a.id - b.id;
    });
});

const espnConsolationBracket = computed(() => {
  return [...espnWinnersBracket.value]
    .filter((matchup) => matchup.playoffTierType === "WINNERS_CONSOLATION_LADDER")
    .sort((a, b) => {
      if (a.matchupPeriodId !== b.matchupPeriodId) {
        return a.matchupPeriodId - b.matchupPeriodId;
      }
      return a.id - b.id;
    });
});

const getEspnRoundTitle = (
  matchups: EspnMatchup[],
  roundIndex: number,
  totalRounds: number
) => {
  const isFinalRound = roundIndex === totalRounds - 1;
  const isSemiFinalRound = totalRounds >= 2 && roundIndex === totalRounds - 2;

  if (isFinalRound) {
    return "Championship";
  }
  if (isSemiFinalRound && matchups.length === 2) {
    return "Semifinals";
  }
  if (matchups.length === 4) {
    return "Quarterfinals";
  }
  return `Round ${roundIndex + 1}`;
};

const getEspnMatchupTeamIds = (matchup: EspnMatchup) => {
  return [matchup.home?.teamId, matchup.away?.teamId].filter(
    (teamId): teamId is number => teamId != null
  );
};

const getEspnLoserId = (matchup: EspnMatchup) => {
  if (matchup.winner === "HOME") {
    return matchup.away?.teamId;
  }
  if (matchup.winner === "AWAY") {
    return matchup.home?.teamId;
  }
  return undefined;
};

const getEspnSectionTitle = (
  matchup: EspnMatchup,
  previousMainMatchups: EspnMatchup[],
  previousLadderMatchups: EspnMatchup[]
) => {
  const teamIds = getEspnMatchupTeamIds(matchup);
  const previousMainLosers = new Set(
    previousMainMatchups
      .map((previousMatchup) => getEspnLoserId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );
  const previousLadderWinners = new Set(
    previousLadderMatchups
      .map((previousMatchup) => getEspnWinnerId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );
  const previousLadderLosers = new Set(
    previousLadderMatchups
      .map((previousMatchup) => getEspnLoserId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousMainLosers.has(teamId))
  ) {
    return previousMainMatchups.length === 2 ? "3rd Place" : "Consolation Ladder";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousLadderWinners.has(teamId))
  ) {
    return previousLadderMatchups.length === 2 ? "5th Place" : "Consolation Final";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousLadderLosers.has(teamId))
  ) {
    return previousLadderMatchups.length === 2 ? "7th Place" : "Consolation";
  }

  return "Consolation Ladder";
};

const getEspnLoserSectionTitle = (
  matchup: EspnMatchup,
  previousMainMatchups: EspnMatchup[],
  previousLadderMatchups: EspnMatchup[]
) => {
  const teamIds = getEspnMatchupTeamIds(matchup);
  const previousMainWinners = new Set(
    previousMainMatchups
      .map((previousMatchup) => getEspnWinnerId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );
  const previousMainLosers = new Set(
    previousMainMatchups
      .map((previousMatchup) => getEspnLoserId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );
  const previousLadderWinners = new Set(
    previousLadderMatchups
      .map((previousMatchup) => getEspnWinnerId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );
  const previousLadderLosers = new Set(
    previousLadderMatchups
      .map((previousMatchup) => getEspnLoserId(previousMatchup))
      .filter((teamId): teamId is number => teamId != null)
  );

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousMainLosers.has(teamId))
  ) {
    return "Main Bracket Final";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousMainWinners.has(teamId))
  ) {
    return "Placement Matchup";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousLadderWinners.has(teamId))
  ) {
    return "Placement Matchup";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousLadderLosers.has(teamId))
  ) {
    return "Additional Placement";
  }

  return "Consolation Ladder";
};

const espnWinnerRounds = computed(() => {
  const matchupPeriods = [
    ...new Set(
      [...espnMainBracket.value, ...espnConsolationBracket.value].map(
        (matchup) => matchup.matchupPeriodId
      )
    ),
  ].sort((a, b) => a - b);

  return matchupPeriods.map((matchupPeriodId, index) => {
    const mainMatchups = espnMainBracket.value.filter(
      (matchup) => matchup.matchupPeriodId === matchupPeriodId
    );
    const ladderMatchups = espnConsolationBracket.value.filter(
      (matchup) => matchup.matchupPeriodId === matchupPeriodId
    );
    const previousPeriodId = matchupPeriods[index - 1];
    const previousMainMatchups =
      previousPeriodId == null
        ? []
        : espnMainBracket.value.filter(
            (matchup) => matchup.matchupPeriodId === previousPeriodId
          );
    const previousLadderMatchups =
      previousPeriodId == null
        ? []
        : espnConsolationBracket.value.filter(
            (matchup) => matchup.matchupPeriodId === previousPeriodId
          );
    const sections: EspnRoundSection[] = [];

    if (mainMatchups.length > 0) {
      sections.push({
        title: getEspnRoundTitle(mainMatchups, index, matchupPeriods.length),
        matchups: mainMatchups,
      });
    }

    if (ladderMatchups.length > 0) {
      const sectionMap = new Map<string, EspnMatchup[]>();

      ladderMatchups.forEach((matchup) => {
        const title = getEspnSectionTitle(
          matchup,
          previousMainMatchups,
          previousLadderMatchups
        );
        const currentMatchups = sectionMap.get(title) ?? [];
        currentMatchups.push(matchup);
        sectionMap.set(title, currentMatchups);
      });

      sectionMap.forEach((matchups, title) => {
        sections.push({ title, matchups });
      });
    }

    return {
      round: index + 1,
      matchupPeriodId,
      title:
        sections[0]?.title ??
        `Round ${index + 1}`,
      sections,
    } satisfies EspnRoundDisplay;
  });
});

const espnLoserRounds = computed(() => {
  const matchupPeriods = [
    ...new Set(
      [...espnLoserMainBracket.value, ...espnLoserConsolationBracket.value].map(
        (matchup) => matchup.matchupPeriodId
      )
    ),
  ].sort((a, b) => a - b);

  return matchupPeriods.map((matchupPeriodId, index) => {
    const mainMatchups = espnLoserMainBracket.value.filter(
      (matchup) => matchup.matchupPeriodId === matchupPeriodId
    );
    const ladderMatchups = espnLoserConsolationBracket.value.filter(
      (matchup) => matchup.matchupPeriodId === matchupPeriodId
    );
    const previousPeriodId = matchupPeriods[index - 1];
    const previousMainMatchups =
      previousPeriodId == null
        ? []
        : espnLoserMainBracket.value.filter(
            (matchup) => matchup.matchupPeriodId === previousPeriodId
          );
    const previousLadderMatchups =
      previousPeriodId == null
        ? []
        : espnLoserConsolationBracket.value.filter(
            (matchup) => matchup.matchupPeriodId === previousPeriodId
          );
    const sections: EspnRoundSection[] = [];

    if (mainMatchups.length > 0) {
      sections.push({
        title:
          index === matchupPeriods.length - 1
            ? "Main Bracket Final"
            : `Round ${index + 1}`,
        matchups: mainMatchups,
      });
    }

    if (ladderMatchups.length > 0) {
      const sectionMap = new Map<string, EspnMatchup[]>();

      ladderMatchups.forEach((matchup) => {
        const title = getEspnLoserSectionTitle(
          matchup,
          previousMainMatchups,
          previousLadderMatchups
        );
        const currentMatchups = sectionMap.get(title) ?? [];
        currentMatchups.push(matchup);
        sectionMap.set(title, currentMatchups);
      });

      sectionMap.forEach((matchups, title) => {
        sections.push({ title, matchups });
      });
    }

    return {
      round: index + 1,
      matchupPeriodId,
      title: sections[0]?.title ?? `Round ${index + 1}`,
      sections,
    } satisfies EspnRoundDisplay;
  });
});

const espnLoserMainBracket = computed(() => {
  return [...espnLosersBracket.value]
    .filter((matchup) => matchup.playoffTierType === "LOSERS_BRACKET")
    .sort((a, b) => {
      if (a.matchupPeriodId !== b.matchupPeriodId) {
        return a.matchupPeriodId - b.matchupPeriodId;
      }
      return a.id - b.id;
    });
});

const espnLoserConsolationBracket = computed(() => {
  return [...espnLosersBracket.value]
    .filter((matchup) => matchup.playoffTierType === "LOSERS_CONSOLATION_LADDER")
    .sort((a, b) => {
      if (a.matchupPeriodId !== b.matchupPeriodId) {
        return a.matchupPeriodId - b.matchupPeriodId;
      }
      return a.id - b.id;
    });
});

const winnersBracket = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].winnersBracket
      ? store.leagueInfo[store.currentLeagueIndex].winnersBracket
      : []
    : fakeWinnersBracket;
});

const losersBracket = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].losersBracket
      ? store.leagueInfo[store.currentLeagueIndex].losersBracket
      : []
    : fakeLosersBracket;
});

const totalRosters = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].totalRosters
    : 10;
});

// The logic is different if leagues don't play with the toilet bowl
// 1 = standard losers bracket, 0 = toilet bowl
const playoffType = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].playoffType
    : 0;
});

// check losers bracket type - true means 3 rounds, false means 2 rounds
// sleeper api bracket data is confusing
const bracketType = computed(() => {
  if (store.leagueInfo[store.currentLeagueIndex]) {
    return losersBracket.value.some((obj) => obj["p"] === 5);
  }
  return true;
});

const losersBracketFirstLossTitle = computed(() => {
  if (bracketType.value) {
    return `${totalRosters.value - 3}th Place`;
  }
  return playoffType.value === 0
    ? `${totalRosters.value - 3}th Place`
    : "Last Place";
});

const losersBracketFirstSecondTitle = computed(() => {
  return playoffType.value === 0
    ? `${totalRosters.value - 5}th Place`
    : "Last Place";
});

const getPointsColor = (team1: number, team2: number) => {
  if (playoffType.value === 1) {
    return team1 === team2 ? "" : "text-primary";
  } else {
    return team1 === team2 ? "text-primary" : "";
  }
};

const matchRosterId = (rosterId: number, placement?: number) => {
  const rosters = store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].rosters
    : fakeRosters;
  const users = store.leagueInfo[store.currentLeagueIndex]
    ? store.leagueInfo[store.currentLeagueIndex].users
    : fakeUsers;
  const userId = rosters.find((roster) => roster.rosterId === rosterId);
  if (userId) {
    const userObject = users.find((user) => user.id === userId.id) as
      | UserType
      | undefined;
    if (userObject) {
      return {
        ...userObject,
        placement: placement ?? userObject.placement,
      };
    }
  }
  return {
    id: String(rosterId),
    name: "Unknown Team",
    username: "Unknown Team",
    avatar: "",
    avatarImg: "",
    placement,
  } as UserType;
};

const getPointsScored = (rosterId: number, week: number) => {
  if (!store.leagueInfo[store.currentLeagueIndex]) {
    const pointsArray = fakePoints.find(
      (roster) => roster.rosterId === rosterId
    );
    return pointsArray?.playoffPoints[week - 1];
  }
  const pointsArray = store.leagueInfo[
    store.currentLeagueIndex
  ].weeklyPoints.find((roster: PointsType) => roster.rosterId === rosterId);
  if (!pointsArray) return;
  return pointsArray.points[
    week - 1 + store.leagueInfo[store.currentLeagueIndex].regularSeasonLength
  ];
};

const getRecord = (rosterId: number) => {
  const user = props.tableData.find((val) => val.rosterId === rosterId);
  if (user?.recordByWeek) {
    const numWins = user.recordByWeek.split("W").length - 1;
    const numLosses = user.recordByWeek.split("L").length - 1;
    return `${numWins} - ${numLosses}`;
  }
  return "0-0";
};

const getEspnTeamPoints = (
  team: EspnTeamSide | undefined,
  matchupPeriodId: number
) => {
  if (!team) return 0;
  return (
    team.pointsByScoringPeriod?.[String(matchupPeriodId)] ??
    team.totalPoints ??
    0
  );
};

const getEspnWinnerId = (matchup: EspnMatchup) => {
  if (matchup.winner === "HOME") {
    return matchup.home?.teamId;
  }
  if (matchup.winner === "AWAY") {
    return matchup.away?.teamId;
  }
  return undefined;
};

const getEspnLoserHighlightClass = (matchup: EspnMatchup, teamId?: number) => {
  if (teamId == null) return "";
  const comparisonTeamId = getEspnWinnerId(matchup);
  return comparisonTeamId === teamId ? "text-primary" : "";
};

const finalPlacements = computed(() => {
  if (
    store.leagueInfo.length > 0 &&
    store.leagueInfo[store.currentLeagueIndex] &&
    store.leagueInfo[store.currentLeagueIndex].status != "complete"
  ) {
    return [];
  }
  let result: UserType[] = [];
  winnersBracket.value.forEach((matchup) => {
    if (matchup.p === 1) {
      result.push(matchRosterId(matchup.w, 1));
      result.push(matchRosterId(matchup.l, 2));
    } else if (matchup.p === 3) {
      result.push(matchRosterId(matchup.w, 3));
      result.push(matchRosterId(matchup.l, 4));
    } else if (matchup.p === 5) {
      result.push(matchRosterId(matchup.w, 5));
      result.push(matchRosterId(matchup.l, 6));
    }
  });

  // the logic is backwards if losers bracket is consolation bracket vs toilet bowl
  if (playoffType.value === 1) {
    losersBracket.value.forEach((matchup) => {
      if (!bracketType.value) {
        if (matchup.p === 1) {
          result.push(matchRosterId(matchup.w, totalRosters.value - 3));
          result.push(matchRosterId(matchup.l, totalRosters.value - 2));
        } else if (matchup.p === 3) {
          result.push(matchRosterId(matchup.w, totalRosters.value - 1));
          result.push(matchRosterId(matchup.l, totalRosters.value));
        }
        // do 10 man leagues have 3 playoff rounds in the losers bracket?
        // else if (matchup.p === 5) {
        //   result.push(matchRosterId(matchup.w, totalRosters.value - 1));
        //   result.push(matchRosterId(matchup.l, totalRosters.value));
        // }
      } else {
        if (matchup.p === 1) {
          result.push(matchRosterId(matchup.w, totalRosters.value - 5));
          result.push(matchRosterId(matchup.l, totalRosters.value - 4));
        } else if (matchup.p === 3) {
          result.push(matchRosterId(matchup.w, totalRosters.value - 3));
          result.push(matchRosterId(matchup.l, totalRosters.value - 2));
        } else if (matchup.p === 5) {
          result.push(matchRosterId(matchup.w, totalRosters.value - 1));
          result.push(matchRosterId(matchup.l, totalRosters.value));
        }
      }
    });
  } else {
    losersBracket.value.forEach((matchup) => {
      if (matchup.p === 1) {
        result.push(matchRosterId(matchup.w, totalRosters.value));
        result.push(matchRosterId(matchup.l, totalRosters.value - 1));
      } else if (matchup.p === 3) {
        result.push(matchRosterId(matchup.w, totalRosters.value - 2));
        result.push(matchRosterId(matchup.l, totalRosters.value - 3));
      } else if (matchup.p === 5) {
        result.push(matchRosterId(matchup.w, totalRosters.value - 4));
        result.push(matchRosterId(matchup.l, totalRosters.value - 5));
      }
    });
  }
  // some playoff formats leave teams out
  props.tableData.forEach((user) => {
    if (result.every((obj) => obj !== undefined)) {
      if (!result.find((res) => res.id === user.id)) {
        result.push(matchRosterId(user.rosterId, totalRosters.value / 2));
      }
    }
  });
  return result.sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0));
});

const numberOfWinnerRounds = computed(() => {
  return winnersBracket.value.reduce((acc, curr) => {
    return curr.r > acc ? curr.r : acc;
  }, 0);
});

const numberOfLoserRounds = computed(() => {
  return losersBracket.value.reduce((acc, curr) => {
    return curr.r > acc ? curr.r : acc;
  }, 0);
});
</script>
<template>
  <div class="w-full">
    <LeagueSummary :tableData="tableData" :finalPlacements="finalPlacements" />
    <div class="flex flex-wrap my-4 lg:flex-nowrap">
      <Card class="block w-full p-4 overflow-x-auto shadow lg:w-3/4">
        <p class="text-3xl font-bold">Winner's Bracket</p>
        <div
          v-if="store.leagueInfo[store.currentLeagueIndex]?.platform !== 'espn'"
          class="flex flex-nowrap"
        >
          <div v-for="index in numberOfWinnerRounds">
            <p class="mt-2 -mb-2 text-xl font-semibold">Round {{ index }}</p>
            <Separator class="w-full h-px my-6" />
            <div v-for="matchup in winnersBracket">
              <div v-if="matchup.p === 1 && index === matchup.r" class="flex">
                <p class="text-lg font-semibold mt-7">Championship</p>
                <svg
                  class="w-8 mx-4 mt-7"
                  version="1.0"
                  id="Layer_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 64 64"
                  enable-background="new 0 0 64 64"
                  xml:space="preserve"
                  fill="#000000"
                >
                  <g id="SVGRepo_bgCarrier" stroke-width="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <g>
                      <g>
                        <path
                          fill="#F9EBB2"
                          d="M49,2H15c-1.104,0-2,0.895-2,2v23c0,10.492,8.507,19,19,19s19-8.508,19-19V4C51,2.895,50.104,2,49,2z"
                        ></path>
                      </g>
                      <g>
                        <path
                          fill="#394240"
                          d="M60,6h-7V4c0-2.213-1.789-4-4-4H15c-2.211,0-4,1.787-4,4v2H4c-2.211,0-4,1.787-4,4v8 c0,6.074,4.925,11,11,11h0.101C12.015,38.66,19.477,46.395,29,47.76V56h-7c-2.211,0-4,1.787-4,4v3c0,0.551,0.447,1,1,1h26 c0.553,0,1-0.449,1-1v-3c0-2.213-1.789-4-4-4h-7v-8.24c9.523-1.365,16.985-9.1,17.899-18.76H53c6.075,0,11-4.926,11-11v-8 C64,7.787,62.211,6,60,6z M11,23c-2.762,0-5-2.24-5-5v-6h5V23z M11,10H5c-0.553,0-1,0.445-1,1v7c0,3.865,3.134,7,7,7v2 c-4.971,0-9-4.031-9-9v-8c0-1.105,0.896-2,2-2h7V10z M42,58c1.104,0,2,0.895,2,2v2H20v-2c0-1.105,0.896-2,2-2H42z M31,56v-8.053 C31.334,47.963,31.662,48,32,48s0.666-0.037,1-0.053V56H31z M51,23v2v2c0,10.492-8.507,19-19,19s-19-8.508-19-19v-2v-2V4 c0-1.105,0.896-2,2-2h34c1.104,0,2,0.895,2,2V23z M53,12h5v6c0,2.76-2.238,5-5,5V12z M62,18c0,4.969-4.029,9-9,9v-2 c3.866,0,7-3.135,7-7v-7c0-0.555-0.447-1-1-1h-6V8h7c1.104,0,2,0.895,2,2V18z"
                        ></path>
                        <path
                          fill="#394240"
                          d="M39.147,19.359l-4.309-0.658l-1.936-4.123c-0.165-0.352-0.518-0.574-0.905-0.574s-0.74,0.223-0.905,0.574 l-1.936,4.123l-4.309,0.658c-0.37,0.059-0.678,0.316-0.797,0.672s-0.029,0.746,0.232,1.016l3.146,3.227l-0.745,4.564 c-0.062,0.377,0.099,0.758,0.411,0.979s0.725,0.242,1.061,0.059l3.841-2.123l3.841,2.123C35.99,29.959,36.157,30,36.323,30 c0.202,0,0.404-0.062,0.576-0.184c0.312-0.221,0.473-0.602,0.411-0.979l-0.745-4.564l3.146-3.227 c0.262-0.27,0.352-0.66,0.232-1.016S39.518,19.418,39.147,19.359z M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859 l0.495,3.029l-2.522-1.395c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029 c0.051-0.314-0.05-0.633-0.271-0.859l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678 c0.142,0.303,0.425,0.514,0.754,0.562l2.913,0.447L34.781,23.238z"
                        ></path>
                      </g>
                      <path
                        fill="#F76D57"
                        d="M34.781,23.238c-0.222,0.227-0.322,0.545-0.271,0.859l0.495,3.029l-2.522-1.395 c-0.151-0.084-0.317-0.125-0.484-0.125s-0.333,0.041-0.484,0.125l-2.522,1.395l0.495-3.029c0.051-0.314-0.05-0.633-0.271-0.859 l-2.141-2.193l2.913-0.447c0.329-0.049,0.612-0.26,0.754-0.562l1.257-2.678l1.257,2.678c0.142,0.303,0.425,0.514,0.754,0.562 l2.913,0.447L34.781,23.238z"
                      ></path>
                      <g>
                        <path
                          fill="#B4CCB9"
                          d="M2,10v8c0,4.969,4.029,9,9,9v-2c-3.866,0-7-3.135-7-7v-7c0-0.555,0.447-1,1-1h6V8H4C2.896,8,2,8.895,2,10z "
                        ></path>
                        <path
                          fill="#B4CCB9"
                          d="M60,8h-7v2h6c0.553,0,1,0.445,1,1v7c0,3.865-3.134,7-7,7v2c4.971,0,9-4.031,9-9v-8C62,8.895,61.104,8,60,8 z"
                        ></path>
                        <path
                          fill="#B4CCB9"
                          d="M42,58H22c-1.104,0-2,0.895-2,2v2h24v-2C44,58.895,43.104,58,42,58z"
                        ></path>
                        <path
                          fill="#B4CCB9"
                          d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
                        ></path>
                      </g>
                      <path
                        opacity="0.15"
                        fill="#231F20"
                        d="M33,47.947C32.666,47.963,32.338,48,32,48s-0.666-0.037-1-0.053V56h2V47.947z"
                      ></path>
                    </g>
                  </g>
                </svg>
              </div>
              <p
                v-if="matchup.p === 3 && index === matchup.r"
                class="mt-12 -mb-2 text-lg font-semibold"
              >
                3rd Place
              </p>
              <p
                v-if="matchup.p === 5 && index === matchup.r"
                class="mt-12 -mb-2 text-lg font-semibold"
              >
                5th Place
              </p>
              <!-- championship matchup -->
              <Card
                v-if="index === matchup.r && matchup.p === 1"
                class="block p-4 my-2 custom-card-width bg-secondary"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <img
                      v-if="matchRosterId(matchup.t1).avatarImg"
                      alt="User avatar"
                      class="w-8 h-8 rounded-full"
                      :src="matchRosterId(matchup.t1).avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          store.showUsernames
                            ? matchRosterId(matchup.t1).username
                            : matchRosterId(matchup.t1).name
                        }}
                      </p>
                      <p class="ml-2 text-xs text-muted-foreground">
                        ({{ getRecord(matchup.t1) }})
                      </p>
                    </div>
                  </div>
                  <p
                    class="mr-1 font-semibold"
                    :class="matchup.t1 === matchup.w ? 'text-primary ' : ''"
                  >
                    {{ getPointsScored(matchup.t1, index) }}
                  </p>
                </div>
                <Separator class="h-px my-2" />

                <div>
                  <div class="flex justify-between">
                    <div v-if="matchRosterId(matchup.t2)" class="flex">
                      <img
                        v-if="matchRosterId(matchup.t2).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.t2).avatarImg"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.t2).username
                              : matchRosterId(matchup.t2).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.t2) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-1 mr-1 font-semibold"
                      :class="matchup.t2 === matchup.w ? 'text-primary ' : ''"
                    >
                      {{ getPointsScored(matchup.t2, index) }}
                    </p>
                  </div>
                </div>
              </Card>
              <Card
                v-else-if="index === matchup.r"
                class="block p-4 my-4 mr-4 custom-card-width bg-secondary"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <img
                      v-if="matchRosterId(matchup.t1).avatarImg"
                      alt="User avatar"
                      class="w-8 h-8 rounded-full"
                      :src="matchRosterId(matchup.t1).avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          store.showUsernames
                            ? matchRosterId(matchup.t1).username
                            : matchRosterId(matchup.t1).name
                        }}
                      </p>
                      <p class="ml-2 text-xs text-muted-foreground">
                        ({{ getRecord(matchup.t1) }})
                      </p>
                    </div>
                  </div>
                  <p
                    class="mt-0.5 mr-1 font-semibold"
                    :class="matchup.t1 === matchup.w ? 'text-primary' : ''"
                  >
                    {{ getPointsScored(matchup.t1, index) }}
                  </p>
                </div>
                <Separator class="h-px my-2" />
                <div>
                  <div
                    v-if="matchRosterId(matchup.t2)"
                    class="flex justify-between"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.t2).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.t2).avatarImg"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.t2).username
                              : matchRosterId(matchup.t2).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.t2) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="matchup.t2 === matchup.w ? 'text-primary ' : ''"
                    >
                      {{ getPointsScored(matchup.t2, index) }}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-nowrap">
          <div v-for="round in espnWinnerRounds" :key="round.matchupPeriodId">
            <p class="mt-2 -mb-2 text-xl font-semibold">
              Round {{ round.round }}
            </p>
            <p class="text-sm text-muted-foreground">
              Week {{ round.matchupPeriodId }}
            </p>
            <Separator class="w-full h-px my-6" />
            <div v-for="section in round.sections" :key="section.title" class="mb-6">
              <p class="mt-2 -mb-1 text-lg font-semibold">
                {{ section.title }}
              </p>
              <div
                v-for="matchup in section.matchups"
                :key="matchup.id"
                class="mb-4"
              >
                <Card class="block p-4 my-2 mr-4 custom-card-width bg-secondary">
                  <div
                    v-if="
                      matchup.home?.teamId && matchRosterId(matchup.home.teamId)
                    "
                    class="flex justify-between mb-2"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.home.teamId).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.home.teamId).avatarImg"
                        @error="handleImageError"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.home.teamId).username
                              : matchRosterId(matchup.home.teamId).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.home.teamId) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="
                        matchup.home.teamId === getEspnWinnerId(matchup)
                          ? 'text-primary'
                          : ''
                      "
                    >
                      {{
                        getEspnTeamPoints(matchup.home, matchup.matchupPeriodId)
                      }}
                    </p>
                  </div>
                  <Separator class="h-px my-2" />
                  <div
                    v-if="
                      matchup.away?.teamId && matchRosterId(matchup.away.teamId)
                    "
                    class="flex justify-between"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.away.teamId).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.away.teamId).avatarImg"
                        @error="handleImageError"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.away.teamId).username
                              : matchRosterId(matchup.away.teamId).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.away.teamId) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="
                        matchup.away.teamId === getEspnWinnerId(matchup)
                          ? 'text-primary'
                          : ''
                      "
                    >
                      {{
                        getEspnTeamPoints(matchup.away, matchup.matchupPeriodId)
                      }}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <FinalPlacements
        :class="[finalPlacements.length === 0 ? 'hidden lg:block' : '']"
        :rosters="finalPlacements"
      />
    </div>
    <!-- losers bracket -->
    <div class="flex flex-wrap lg:flex-nowrap">
      <Card class="block w-full p-4 overflow-x-auto lg:mr-4 lg:w-3/4">
        <p class="text-3xl font-bold">Loser's Bracket</p>
        <div
          v-if="store.leagueInfo[store.currentLeagueIndex]?.platform !== 'espn'"
          class="flex flex-nowrap"
        >
          <div v-for="index in numberOfLoserRounds">
            <p class="mt-2 -mb-2 text-lg font-semibold">Round {{ index }}</p>
            <Separator class="h-px my-6" />
            <div v-for="matchup in losersBracket">
              <div v-if="matchup.p === 1 && index === matchup.r" class="flex">
                <p class="text-lg font-semibold mt-7">
                  {{
                    playoffType === 1
                      ? "Consolation Bracket Winner"
                      : "Last Place"
                  }}
                </p>
                <svg
                  v-if="playoffType === 0"
                  width="32px"
                  height="32px"
                  viewBox="0 0 128 128"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlns:xlink="http://www.w3.org/1999/xlink"
                  aria-hidden="true"
                  role="img"
                  class="mx-3 mt-6 iconify iconify--noto"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <path
                    d="M118.89 75.13a15.693 15.693 0 0 0-7-7.33a22.627 22.627 0 0 0-6-2.63c1.53-5.6-.64-10.06-3.69-13.39c-4.51-4.88-9.2-5.59-9.2-5.59c1.62-3.07 2.11-6.61 1.36-10c-.77-3.69-3.08-6.86-6.36-8.72c-3.1-1.83-6.92-2.73-10.84-3.47c-1.88-.34-9.81-1.45-13.1-6c-2.65-3.69-2.73-10.33-3.45-12.32s-3.38-1.15-6.23.76C51.05 8.7 44.15 15.83 41.49 23a24.6 24.6 0 0 0-1.28 13.89c-2.14.35-4.23.97-6.21 1.85c-.16 0-.32.1-.49.17c-3 1.24-9.43 7-10 15.85c-.21 3.13.19 6.26 1.17 9.24c-2.19.57-4.3 1.43-6.26 2.57c-2.29.98-4.38 2.38-6.15 4.13c-1.95 2.41-3.37 5.2-4.15 8.2a27.594 27.594 0 0 0 2 19.77c1.8 3.47 4.06 6.67 6.74 9.52c8.55 8.79 23.31 12.11 35 14c14.19 2.34 29.05 1.52 42.33-4c19.92-8.22 25.22-21.44 26-25.17c1.73-8.25-.39-16.02-1.3-17.89z"
                    fill="#885742"
                  ></path>

                  <path
                    d="M87.45 92.89c-1.57.8-3.17 1.52-4.78 2.16c-1.08.43-2.17.82-3.27 1.17c-1.1.36-2.21.67-3.33 1c-2.24.56-4.52.97-6.82 1.21c-1.74.19-3.5.28-5.25.28c-4.62 0-9.22-.65-13.67-1.91l-1.46-.44a55.12 55.12 0 0 1-7.15-2.84l-1.39-.69a22.722 22.722 0 0 0 12.72 15.31c3.43 1.59 7.17 2.4 10.95 2.38c3.82.03 7.6-.75 11.09-2.31a21.868 21.868 0 0 0 12.58-15.44l-.22.12z"
                    fill="#35220b"
                  ></path>

                  <path
                    d="M85.19 90c-7 1.23-14.09 1.82-21.19 1.77c-7.1.04-14.19-.55-21.19-1.77a2.16 2.16 0 0 0-2.53 2.54v.25A51.578 51.578 0 0 0 64 98.66c1.75 0 3.51-.09 5.25-.28c2.3-.24 4.58-.65 6.82-1.21c1.12-.28 2.23-.59 3.33-1s2.19-.74 3.27-1.17c1.62-.67 3.21-1.39 4.78-2.16l.22-.12l.06-.27c.17-1.19-.66-2.29-1.86-2.46a2.22 2.22 0 0 0-.68.01z"
                    fill="#ffffff"
                  ></path>

                  <g>
                    <circle
                      cx="80.13"
                      cy="69.49"
                      r="12.4"
                      fill="#ffffff"
                    ></circle>

                    <ellipse
                      cx="80.13"
                      cy="69.49"
                      rx="5.73"
                      ry="5.82"
                      fill="#35220b"
                    ></ellipse>

                    <circle
                      cx="47.87"
                      cy="69.49"
                      r="12.4"
                      fill="#ffffff"
                    ></circle>

                    <ellipse
                      cx="47.87"
                      cy="69.49"
                      rx="5.73"
                      ry="5.82"
                      fill="#35220b"
                    ></ellipse>
                  </g>
                </svg>
              </div>
              <p
                v-if="matchup.p === 3 && index === matchup.r"
                class="mt-12 -mb-2 text-lg font-semibold"
              >
                {{ losersBracketFirstLossTitle }}
              </p>
              <p
                v-if="matchup.p === 5 && index === matchup.r"
                class="mt-12 -mb-2 text-lg font-semibold"
              >
                {{ losersBracketFirstSecondTitle }}
              </p>
              <!-- last place matchup -->
              <Card
                v-if="index === matchup.r && matchup.p === 1"
                class="block p-4 my-2 mr-4 custom-card-width bg-secondary"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <img
                      v-if="matchRosterId(matchup.t1).avatarImg"
                      alt="User avatar"
                      class="w-8 h-8 rounded-full"
                      :src="matchRosterId(matchup.t1).avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          store.showUsernames
                            ? matchRosterId(matchup.t1).username
                            : matchRosterId(matchup.t1).name
                        }}
                      </p>
                      <p class="ml-2 text-xs text-muted-foreground">
                        ({{ getRecord(matchup.t1) }})
                      </p>
                    </div>
                  </div>
                  <p
                    class="mr-1 font-semibold"
                    :class="getPointsColor(matchup.t1, matchup.l)"
                  >
                    {{ getPointsScored(matchup.t1, index) }}
                  </p>
                </div>
                <Separator class="h-px my-2" />
                <div>
                  <div
                    v-if="matchRosterId(matchup.t2)"
                    class="flex justify-between"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.t2).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.t2).avatarImg"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.t2).username
                              : matchRosterId(matchup.t2).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.t2) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-1 mr-1 font-semibold"
                      :class="getPointsColor(matchup.t2, matchup.l)"
                    >
                      {{ getPointsScored(matchup.t2, index) }}
                    </p>
                  </div>
                </div>
              </Card>
              <Card
                v-else-if="index === matchup.r"
                class="block p-4 my-4 mr-4 custom-card-width bg-secondary"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <img
                      v-if="matchRosterId(matchup.t1).avatarImg"
                      alt="User avatar"
                      class="w-8 h-8 rounded-full"
                      :src="matchRosterId(matchup.t1).avatarImg"
                    />
                    <svg
                      v-else
                      class="w-8 h-8"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                      />
                    </svg>
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          store.showUsernames
                            ? matchRosterId(matchup.t1).username
                            : matchRosterId(matchup.t1).name
                        }}
                      </p>
                      <p class="ml-2 text-xs text-muted-foreground">
                        ({{ getRecord(matchup.t1) }})
                      </p>
                    </div>
                  </div>
                  <p
                    class="mt-0.5 mr-1 font-semibold"
                    :class="getPointsColor(matchup.t1, matchup.l)"
                  >
                    {{ getPointsScored(matchup.t1, index) }}
                  </p>
                </div>
                <Separator class="h-px my-2" />
                <div>
                  <div
                    v-if="matchRosterId(matchup.t2)"
                    class="flex justify-between"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.t2).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.t2).avatarImg"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.t2).username
                              : matchRosterId(matchup.t2).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.t2) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="getPointsColor(matchup.t2, matchup.l)"
                    >
                      {{ getPointsScored(matchup.t2, index) }}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        <div v-else class="flex flex-nowrap">
          <div v-for="round in espnLoserRounds" :key="round.matchupPeriodId">
            <p class="mt-2 -mb-2 text-lg font-semibold">Round {{ round.round }}</p>
            <p class="text-sm text-muted-foreground">
              Week {{ round.matchupPeriodId }}
            </p>
            <Separator class="h-px my-6" />
            <div v-for="section in round.sections" :key="section.title" class="mb-6">
              <div
                v-for="matchup in section.matchups"
                :key="matchup.id"
                class="mb-4"
              >
                <Card class="block p-4 my-2 mr-4 custom-card-width bg-secondary">
                  <div
                    v-if="
                      matchup.home?.teamId && matchRosterId(matchup.home.teamId)
                    "
                    class="flex justify-between mb-2"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.home.teamId).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.home.teamId).avatarImg"
                        @error="handleImageError"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.home.teamId).username
                              : matchRosterId(matchup.home.teamId).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.home.teamId) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="
                        getEspnLoserHighlightClass(matchup, matchup.home.teamId)
                      "
                    >
                      {{
                        getEspnTeamPoints(matchup.home, matchup.matchupPeriodId)
                      }}
                    </p>
                  </div>
                  <Separator class="h-px my-2" />
                  <div
                    v-if="
                      matchup.away?.teamId && matchRosterId(matchup.away.teamId)
                    "
                    class="flex justify-between"
                  >
                    <div class="flex">
                      <img
                        v-if="matchRosterId(matchup.away.teamId).avatarImg"
                        alt="User avatar"
                        class="w-8 h-8 rounded-full"
                        :src="matchRosterId(matchup.away.teamId).avatarImg"
                        @error="handleImageError"
                      />
                      <svg
                        v-else
                        class="w-8 h-8"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                        />
                      </svg>
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            store.showUsernames
                              ? matchRosterId(matchup.away.teamId).username
                              : matchRosterId(matchup.away.teamId).name
                          }}
                        </p>
                        <p class="ml-2 text-xs text-muted-foreground">
                          ({{ getRecord(matchup.away.teamId) }})
                        </p>
                      </div>
                    </div>
                    <p
                      class="mt-0.5 mr-1 font-semibold"
                      :class="
                        getEspnLoserHighlightClass(matchup, matchup.away.teamId)
                      "
                    >
                      {{
                        getEspnTeamPoints(matchup.away, matchup.matchupPeriodId)
                      }}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <PlacementFlowChart
        :class="[finalPlacements.length === 0 ? 'hidden lg:block' : '']"
        :tableData="props.tableData"
        :finalPlacements="finalPlacements"
      />
    </div>
  </div>
</template>
<style scoped>
.custom-card-width {
  @media (width >= 1536px) {
    width: 17.5rem;
  }
  @media (1280px < width < 1536px) {
    width: 16.5rem;
  }
  @media (width <= 1280px) {
    width: 13.5rem;
  }
}
</style>
