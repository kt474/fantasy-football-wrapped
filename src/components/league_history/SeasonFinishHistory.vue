<script setup lang="ts">
import { computed, ref } from "vue";
import { createTableData } from "@/api/helper";
import { useStore } from "@/store/store";
import type { LeagueInfoType, TableDataType } from "@/types/types";
import Card from "../ui/card/Card.vue";
import { hasLeagueSeasonData } from "@/lib/leagueHistory";
import { formatOrdinal, getFinalPlacements } from "@/lib/seasonFinish";

type SeasonFinishRow = {
  season: string;
  leagueName: string;
  status: string;
  managerId: string;
  rosterId: number;
  name: string;
  username: string;
  record: string;
  pointsPerGame: number;
  regularSeasonRank: number;
  finalPlacement?: number;
};

type MatrixCell = {
  season: string;
  leagueName: string;
  isComplete: boolean;
  record: string;
  pointsPerGame: number;
  regularSeasonRank: number;
  finalPlacement?: number;
  placement?: number;
};

type MatrixManagerRow = {
  managerKey: string;
  name: string;
  username: string;
  cells: Array<MatrixCell | null>;
  averagePlacement?: number;
};

type SortKey = "average" | `season:${number}`;
type SortDirection = "asc" | "desc";

const props = defineProps<{
  tableData: TableDataType[];
}>();

const store = useStore();
const sortKey = ref<SortKey>("average");
const sortDirection = ref<SortDirection>("asc");

const isLeagueInfo = (value: unknown): value is LeagueInfoType =>
  typeof value === "object" &&
  value !== null &&
  "leagueId" in value &&
  "season" in value;

const currentLeague = computed(
  () => store.leagueInfo[store.currentLeagueIndex]
);

const seasons = computed(() => {
  const league = currentLeague.value;
  if (!league) return [];

  return [league, ...(league.previousLeagues ?? []).filter(isLeagueInfo)].sort(
    (left, right) => Number(right.season) - Number(left.season)
  );
});

const getSeasonTableData = (league: LeagueInfoType) => {
  if (league.leagueId === currentLeague.value?.leagueId) {
    return props.tableData;
  }

  return createTableData(
    league.users,
    league.rosters,
    league.weeklyPoints,
    league.medianScoring === 1
  );
};

const seasonHistory = computed(() => {
  return seasons.value
    .map((league) => {
      const tableData = getSeasonTableData(league);
      const isCurrentSeason =
        league.leagueId === currentLeague.value?.leagueId &&
        league.season === currentLeague.value?.season;
      if (!isCurrentSeason && !hasLeagueSeasonData(league, tableData)) {
        return null;
      }

      const finalPlacements = getFinalPlacements(league, tableData);
      const finalPlacementByRosterId = new Map(
        finalPlacements.map((placement) => [
          placement.rosterId,
          placement.placement,
        ])
      );
      const rows: SeasonFinishRow[] = tableData
        .map((team) => {
          const games = team.wins + team.losses + team.ties;

          return {
            season: league.season,
            leagueName: league.name,
            status: league.status,
            managerId: team.id,
            rosterId: team.rosterId,
            name: team.name || "Ghost Roster",
            username: team.username || "Ghost Roster",
            record:
              team.ties > 0
                ? `${team.wins}-${team.losses}-${team.ties}`
                : `${team.wins}-${team.losses}`,
            pointsPerGame:
              games > 0 ? Number((team.pointsFor / games).toFixed(2)) : 0,
            regularSeasonRank: team.regularSeasonRank,
            finalPlacement: finalPlacementByRosterId.get(team.rosterId),
          };
        })
        .sort((left, right) => {
          const leftPlacement = left.finalPlacement ?? left.regularSeasonRank;
          const rightPlacement =
            right.finalPlacement ?? right.regularSeasonRank;
          return leftPlacement - rightPlacement;
        });

      return {
        season: league.season,
        leagueName: league.name,
        isComplete: league.status === "complete",
        rows,
      };
    })
    .filter((season) => season !== null)
    .filter((season) => season.rows.length > 0);
});

const getManagerKey = (row: SeasonFinishRow) =>
  row.managerId || `${row.name}:${row.username}`;

const unsortedMatrixRows = computed<MatrixManagerRow[]>(() => {
  const managersByKey = new Map<string, MatrixManagerRow>();

  seasonHistory.value.forEach((season) => {
    season.rows.forEach((row) => {
      const managerKey = getManagerKey(row);
      if (!managersByKey.has(managerKey)) {
        managersByKey.set(managerKey, {
          managerKey,
          name: row.name,
          username: row.username,
          cells: Array.from({ length: seasonHistory.value.length }, () => null),
          averagePlacement: undefined,
        });
      }
    });
  });

  const rows = [...managersByKey.values()];
  seasonHistory.value.forEach((season, seasonIndex) => {
    season.rows.forEach((row) => {
      const manager = managersByKey.get(getManagerKey(row));
      if (!manager) return;

      manager.cells[seasonIndex] = {
        season: season.season,
        leagueName: season.leagueName,
        isComplete: season.isComplete,
        record: row.record,
        pointsPerGame: row.pointsPerGame,
        regularSeasonRank: row.regularSeasonRank,
        finalPlacement: row.finalPlacement,
        placement: row.finalPlacement,
      };
    });
  });

  rows.forEach((row) => {
    const completedPlacements = row.cells
      .map((cell) => cell?.finalPlacement)
      .filter((placement): placement is number => placement != null);
    row.averagePlacement =
      completedPlacements.length > 0
        ? completedPlacements.reduce((sum, placement) => sum + placement, 0) /
          completedPlacements.length
        : undefined;
  });

  return rows;
});

const getMatrixDisplayName = (row: MatrixManagerRow) =>
  store.showUsernames ? row.username : row.name;

const getCellPlacementLabel = (cell: MatrixCell) => {
  if (!cell.isComplete) return "TBD";
  return formatOrdinal(cell.finalPlacement);
};

const getCellMeta = (cell: MatrixCell) =>
  `(${formatOrdinal(cell.regularSeasonRank)})`;

const formatAveragePlacement = (placement?: number) =>
  placement == null ? "-" : placement.toFixed(1);

const getSortValue = (row: MatrixManagerRow, key: SortKey) => {
  if (key === "average")
    return row.averagePlacement ?? Number.POSITIVE_INFINITY;

  const seasonIndex = Number(key.replace("season:", ""));
  return row.cells[seasonIndex]?.finalPlacement ?? Number.POSITIVE_INFINITY;
};

const matrixRows = computed<MatrixManagerRow[]>(() => {
  return [...unsortedMatrixRows.value].sort((left, right) => {
    const leftValue = getSortValue(left, sortKey.value);
    const rightValue = getSortValue(right, sortKey.value);
    const direction = sortDirection.value === "asc" ? 1 : -1;

    if (leftValue !== rightValue) {
      return (Number(leftValue) - Number(rightValue)) * direction;
    }

    return getMatrixDisplayName(left).localeCompare(
      getMatrixDisplayName(right)
    );
  });
});

const updateSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    return;
  }

  sortKey.value = key;
  sortDirection.value = "asc";
};

const getSortLabel = (key: SortKey) => {
  if (sortKey.value !== key) return undefined;
  return sortDirection.value === "asc" ? "ascending" : "descending";
};

const getPlacementClass = (cell: MatrixCell | null) => {
  if (!cell || cell.finalPlacement == null)
    return "bg-muted/35 text-muted-foreground";
  if (!cell.isComplete) return "bg-muted/35 text-muted-foreground";
  if (cell.finalPlacement === 1) return "bg-primary/10 text-primary";
  if (cell.finalPlacement <= 3) return "text-foreground";

  const season = seasonHistory.value.find(
    (item) => item.season === cell.season
  );
  const teamCount = season?.rows.length ?? 0;
  if (teamCount > 0 && cell.finalPlacement >= teamCount - 1) {
    return "text-destructive";
  }

  return "text-foreground";
};
</script>

<template>
  <Card v-if="seasonHistory.length > 0" class="relative mt-4 overflow-x-auto">
    <p
      class="w-full pt-2 text-lg font-semibold text-center rounded-t-lg bg-muted/50"
    >
      Final Placements
    </p>
    <div class="relative w-full overflow-x-auto">
      <div class="w-full overflow-x-auto">
        <table
          class="w-full min-w-[44rem] table-fixed text-left text-sm rtl:text-right"
        >
          <colgroup>
            <col class="w-40" />
            <col
              v-for="season in seasonHistory"
              :key="season.season"
              class="w-24"
            />
            <col class="w-20" />
          </colgroup>
          <thead class="text-xs bg-muted/50">
            <tr>
              <th
                scope="col"
                class="sticky left-0 z-20 px-4 py-3 uppercase bg-muted/50 sm:px-6"
              >
                Team Name
              </th>
              <th
                v-for="(season, index) in seasonHistory"
                :key="season.season"
                scope="col"
                class="px-2 py-3"
              >
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-1.5 transition-colors hover:text-foreground"
                  :aria-sort="getSortLabel(`season:${index}`)"
                  @click="updateSort(`season:${index}`)"
                >
                  <span>{{ season.season }}</span>
                  <span
                    v-if="!season.isComplete"
                    class="rounded-full border bg-background px-1.5 py-px text-[0.625rem] normal-case text-muted-foreground"
                  >
                    Live
                  </span>
                </button>
              </th>
              <th scope="col" class="px-2 py-3 bg-muted/45">
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-1.5 transition-colors hover:text-foreground"
                  :aria-sort="getSortLabel('average')"
                  @click="updateSort('average')"
                >
                  Avg
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in matrixRows"
              :key="row.managerKey"
              class="border-b"
            >
              <th
                scope="row"
                class="sticky left-0 z-10 px-4 font-medium truncate max-w-40 whitespace-nowrap bg-card sm:px-6"
              >
                <span class="truncate">{{ getMatrixDisplayName(row) }}</span>
              </th>
              <td
                v-for="(cell, index) in row.cells"
                :key="`${row.managerKey}-${seasonHistory[index]?.season}`"
                class="w-24 px-2 py-2 text-center bg-background"
                :class="getPlacementClass(cell)"
              >
                <template v-if="cell">
                  <span class="block text-[0.95rem] font-[650]">{{
                    getCellPlacementLabel(cell)
                  }}</span>
                  <span
                    class="block text-[0.7rem] font-medium text-muted-foreground"
                    >{{ getCellMeta(cell) }}</span
                  >
                </template>
                <span
                  v-else
                  class="block text-[0.95rem] font-[650]"
                  >-</span
                >
              </td>
              <td class="w-20 bg-muted/45 px-2 py-3.5 text-center">
                <span class="block text-[0.95rem] font-[650]">
                  {{ formatAveragePlacement(row.averagePlacement) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="py-3 ml-2 text-xs sm:ml-6 text-muted-foreground">
        Final finish by season. Regular-season finish is shown in parentheses.
      </p>
    </div>
  </Card>
</template>
