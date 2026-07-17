<script setup lang="ts">
import FinalPlacements from "./FinalPlacements.vue";
import PlacementFlowChart from "./PlacementFlowChart.vue";
import LeagueSummary from "./LeagueSummary.vue";
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
import ManagerAvatar from "@/components/shared/ManagerAvatar.vue";
import { getManagerDisplayName } from "@/lib/manager";
import {
  getEspnLoserId,
  getEspnWinnerId,
  getFinalPlacements,
  type EspnPlayoffMatchup,
  type EspnTeamSide,
} from "@/lib/seasonFinish";
const props = defineProps<{
  tableData: TableDataType[];
}>();
const store = useStore();

type EspnMatchup = EspnPlayoffMatchup;

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
  return (store.currentLeague?.espnWinnersBracket ??
    []) as EspnMatchup[];
});

const espnLosersBracket = computed(() => {
  return (store.currentLeague?.espnLosersBracket ??
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
    .filter(
      (matchup) => matchup.playoffTierType === "WINNERS_CONSOLATION_LADDER"
    )
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
    return previousMainMatchups.length === 2
      ? "3rd Place"
      : "Consolation Ladder";
  }

  if (
    teamIds.length === 2 &&
    teamIds.every((teamId) => previousLadderWinners.has(teamId))
  ) {
    return previousLadderMatchups.length === 2
      ? "5th Place"
      : "Consolation Final";
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
      title: sections[0]?.title ?? `Round ${index + 1}`,
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
    .filter(
      (matchup) => matchup.playoffTierType === "LOSERS_CONSOLATION_LADDER"
    )
    .sort((a, b) => {
      if (a.matchupPeriodId !== b.matchupPeriodId) {
        return a.matchupPeriodId - b.matchupPeriodId;
      }
      return a.id - b.id;
    });
});

const winnersBracket = computed(() => {
  return store.currentLeague
    ? store.currentLeague.winnersBracket
      ? store.currentLeague.winnersBracket
      : []
    : fakeWinnersBracket;
});

const losersBracket = computed(() => {
  return store.currentLeague
    ? store.currentLeague.losersBracket
      ? store.currentLeague.losersBracket
      : []
    : fakeLosersBracket;
});

const totalRosters = computed(() => {
  return store.currentLeague
    ? store.currentLeague.totalRosters
    : 10;
});

// The logic is different if leagues don't play with the toilet bowl
// 1 = standard losers bracket, 0 = toilet bowl
const playoffType = computed(() => {
  return store.currentLeague
    ? store.currentLeague.playoffType
    : 0;
});

// check losers bracket type - true means 3 rounds, false means 2 rounds
// sleeper api bracket data is confusing
const bracketType = computed(() => {
  if (store.currentLeague) {
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
  const rosters = store.currentLeague
    ? store.currentLeague.rosters
    : fakeRosters;
  const users = store.currentLeague
    ? store.currentLeague.users
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

const getRosterDisplayName = (rosterId: number) =>
  getManagerDisplayName(matchRosterId(rosterId), store.showUsernames);

const getPointsScored = (rosterId: number, week: number) => {
  if (!store.currentLeague) {
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
    week - 1 + store.currentLeague.regularSeasonLength
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

const getEspnLoserHighlightClass = (matchup: EspnMatchup, teamId?: number) => {
  if (teamId == null) return "";
  const comparisonTeamId = getEspnWinnerId(matchup);
  return comparisonTeamId === teamId ? "text-primary" : "";
};

const placementLeague = computed(() =>
  store.currentLeague
    ? store.currentLeague
    : ({
        status: "complete",
        platform: "sleeper",
        rosters: fakeRosters,
        users: fakeUsers,
        totalRosters: 10,
        playoffTeams: 6,
        playoffType: 0,
        winnersBracket: fakeWinnersBracket,
        losersBracket: fakeLosersBracket,
        espnWinnersBracket: [],
        espnLosersBracket: [],
      } as unknown as import("@/types/types").LeagueInfoType)
);

const finalPlacements = computed(() =>
  getFinalPlacements(placementLeague.value, props.tableData)
);

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
      <Card class="block w-full p-4 overflow-x-auto lg:w-3/4 md:p-6">
        <p class="mb-4 text-2xl font-semibold tracking-tight">Winner's Bracket</p>
        <div
          v-if="store.currentLeague?.platform !== 'espn'"
          class="flex flex-nowrap"
        >
          <div v-for="index in numberOfWinnerRounds">
            <p class="mt-2 -mb-2 text-xl font-semibold">Round {{ index }}</p>
            <Separator class="w-full h-px my-6" />
            <div v-for="matchup in winnersBracket">
              <div v-if="matchup.p === 1 && index === matchup.r" class="flex">
                <p class="text-lg font-semibold mt-7">Championship</p>
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
                class="block p-4 my-2 custom-card-width"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <ManagerAvatar :src="matchRosterId(matchup.t1).avatarImg" />
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          getRosterDisplayName(matchup.t1)
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
                      <ManagerAvatar :src="matchRosterId(matchup.t2).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.t2)
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
                class="block p-4 my-4 mr-4 custom-card-width"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <ManagerAvatar :src="matchRosterId(matchup.t1).avatarImg" />
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          getRosterDisplayName(matchup.t1)
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
                      <ManagerAvatar :src="matchRosterId(matchup.t2).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.t2)
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
            <div
              v-for="section in round.sections"
              :key="section.title"
              class="mb-6"
            >
              <p class="mt-2 -mb-1 text-lg font-semibold">
                {{ section.title }}
              </p>
              <div
                v-for="matchup in section.matchups"
                :key="matchup.id"
                class="mb-4"
              >
                <Card
                  class="block p-4 my-2 mr-4 custom-card-width"
                >
                  <div
                    v-if="
                      matchup.home?.teamId && matchRosterId(matchup.home.teamId)
                    "
                    class="flex justify-between mb-2"
                  >
                    <div class="flex">
                      <ManagerAvatar :src="matchRosterId(matchup.home.teamId).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.home.teamId)
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
                      <ManagerAvatar :src="matchRosterId(matchup.away.teamId).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.away.teamId)
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
      <Card class="block w-full p-4 overflow-x-auto lg:mr-4 lg:w-3/4 md:p-6">
        <p class="mb-4 text-2xl font-semibold tracking-tight">Loser's Bracket</p>
        <div
          v-if="store.currentLeague?.platform !== 'espn'"
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
                class="block p-4 my-2 mr-4 custom-card-width"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <ManagerAvatar :src="matchRosterId(matchup.t1).avatarImg" />
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          getRosterDisplayName(matchup.t1)
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
                      <ManagerAvatar :src="matchRosterId(matchup.t2).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.t2)
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
                class="block p-4 my-4 mr-4 custom-card-width"
              >
                <div
                  v-if="matchRosterId(matchup.t1)"
                  class="flex justify-between mb-2"
                >
                  <div class="flex">
                    <ManagerAvatar :src="matchRosterId(matchup.t1).avatarImg" />
                    <div class="-mt-0.5">
                      <p class="mx-2 truncate max-w-20 xl:max-w-32">
                        {{
                          getRosterDisplayName(matchup.t1)
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
                      <ManagerAvatar :src="matchRosterId(matchup.t2).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.t2)
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
            <p class="mt-2 -mb-2 text-lg font-semibold">
              Round {{ round.round }}
            </p>
            <p class="text-sm text-muted-foreground">
              Week {{ round.matchupPeriodId }}
            </p>
            <Separator class="h-px my-6" />
            <div
              v-for="section in round.sections"
              :key="section.title"
              class="mb-6"
            >
              <div
                v-for="matchup in section.matchups"
                :key="matchup.id"
                class="mb-4"
              >
                <Card
                  class="block p-4 my-2 mr-4 custom-card-width"
                >
                  <div
                    v-if="
                      matchup.home?.teamId && matchRosterId(matchup.home.teamId)
                    "
                    class="flex justify-between mb-2"
                  >
                    <div class="flex">
                      <ManagerAvatar :src="matchRosterId(matchup.home.teamId).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.home.teamId)
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
                      <ManagerAvatar :src="matchRosterId(matchup.away.teamId).avatarImg" />
                      <div class="-mt-0.5">
                        <p class="mx-2 truncate max-w-20 xl:max-w-32">
                          {{
                            getRosterDisplayName(matchup.away.teamId)
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
