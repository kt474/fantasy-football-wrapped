<script setup lang="ts">
import { computed } from "vue";
import Card from "@/components/ui/card/Card.vue";
import Separator from "@/components/ui/separator/Separator.vue";
import PremiumTeamAvatar from "./PremiumTeamAvatar.vue";
import { normalizeSharedReportCardIds } from "@/lib/sharedReportCards";
import type {
  PremiumReport,
  SharedReportCardId,
  SharedReportMatchup,
} from "@/types/types";

const props = defineProps<{
  report: PremiumReport;
}>();

const sharedCards = computed(() => props.report.sharedCards);
const selected = computed(
  () => new Set(normalizeSharedReportCardIds(sharedCards.value?.selected))
);
const hasCard = (id: SharedReportCardId) => selected.value.has(id);
const matchups = computed(() =>
  (sharedCards.value?.matchups ?? []).filter(
    (matchup) => matchup.teams.length >= 2
  )
);

const matchupByMargin = (
  entries: SharedReportMatchup[],
  direction: "smallest" | "largest"
) => {
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) =>
    direction === "smallest" ? a.margin - b.margin : b.margin - a.margin
  )[0];
};

const closestMatchup = computed(() =>
  matchupByMargin(matchups.value, "smallest")
);
const biggestBlowout = computed(() =>
  matchupByMargin(matchups.value, "largest")
);

const formatPoints = (points: number) =>
  Number.isFinite(points) ? points.toFixed(2).replace(/\.00$/, "") : "0";

const matchupLabel = (matchup: SharedReportMatchup | null) => {
  if (!matchup) return "";
  return matchup.teams.map((team) => team.name).join(" vs. ");
};

const spotlightCards = computed(() =>
  [
    hasCard("closest_matchup") && closestMatchup.value
      ? {
          id: "closest-matchup",
          label: "Closest matchup",
          title: matchupLabel(closestMatchup.value),
          metric: `${formatPoints(closestMatchup.value.margin)} pts`,
          description: "The smallest margin of the week.",
        }
      : null,
    hasCard("biggest_blowout") && biggestBlowout.value
      ? {
          id: "biggest-blowout",
          label: "Biggest blowout",
          title: matchupLabel(biggestBlowout.value),
          metric: `${formatPoints(biggestBlowout.value.margin)} pts`,
          description: "The largest margin of the week.",
        }
      : null,
    hasCard("team_of_week")
      ? {
          id: "team-of-the-week",
          label: "Team of the Week",
          title: props.report.teamOfTheWeek.teamName,
          metric: formatPoints(props.report.teamOfTheWeek.pointsScored),
          description: props.report.teamOfTheWeek.headline,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => Boolean(card))
);

const playerGroups = computed(() => {
  const leaders = sharedCards.value?.playerLeaders;
  if (!leaders) return [];

  return [
    { id: "top", title: "Top performers", entries: leaders.top },
    { id: "bottom", title: "Bottom performers", entries: leaders.bottom },
    { id: "bench", title: "Top benchwarmers", entries: leaders.bench },
  ].filter((group) => group.entries.length > 0);
});

const lowlightCategory = (category: string) =>
  category
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const acquisitionLabel = (type: "waiver" | "free_agent") =>
  type === "waiver" ? "Waiver claim" : "Free agent";
</script>

<template>
  <section v-if="selected.size > 0" class="my-8 space-y-6">
    <Separator />

    <div
      v-if="spotlightCards.length > 0"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <Card v-for="spotlight in spotlightCards" :key="spotlight.id" class="p-4">
        <p class="text-sm text-muted-foreground">{{ spotlight.label }}</p>
        <p class="mt-1 font-semibold leading-5">{{ spotlight.title }}</p>
        <p class="mt-3 text-xl font-semibold tabular-nums">
          {{ spotlight.metric }}
        </p>
        <p class="mt-1 text-xs leading-5 text-muted-foreground">
          {{ spotlight.description }}
        </p>
      </Card>
    </div>

    <div v-if="hasCard('matchup_results') && matchups.length > 0">
      <h3 class="text-lg font-semibold">Weekly scoreboard</h3>
      <div class="grid gap-3 mt-3 sm:grid-cols-2">
        <Card
          v-for="matchup in matchups"
          :key="matchup.matchupNumber"
          class="px-4 py-2"
        >
          <div
            v-for="(team, index) in matchup.teams"
            :key="`${matchup.matchupNumber}-${team.name}`"
            class="flex items-center gap-2 py-2"
            :class="{ 'border-t': index > 0 }"
          >
            <PremiumTeamAvatar
              :src="team.avatar"
              :team-name="team.name"
              size="xs"
            />
            <span class="flex-1 min-w-0 text-sm truncate">{{ team.name }}</span>
            <span
              class="font-semibold tabular-nums"
              :class="{ 'text-primary': index === 0 }"
            >
              {{ formatPoints(team.points) }}
            </span>
          </div>
        </Card>
      </div>
    </div>

    <div
      v-if="
        hasCard('weekly_awards') && (sharedCards?.weeklyAwards?.length ?? 0) > 0
      "
    >
      <h3 class="text-lg font-semibold">Weekly awards</h3>
      <div class="grid gap-3 mt-3 sm:grid-cols-2">
        <Card
          v-for="award in sharedCards?.weeklyAwards"
          :key="award.id"
          class="flex flex-col justify-between p-4"
        >
          <div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold">{{ award.title }}</p>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  {{ award.teamName }}
                </p>
              </div>
            </div>
            <p class="mt-3 text-sm leading-6 text-foreground/85">
              {{ award.description }}
            </p>
          </div>
        </Card>
      </div>
    </div>

    <div v-if="hasCard('player_leaders') && playerGroups.length > 0">
      <h3 class="text-lg font-semibold">Player leaders</h3>
      <div class="grid gap-3 mt-3 lg:grid-cols-3">
        <Card
          v-for="group in playerGroups"
          :key="group.id"
          class="overflow-hidden"
        >
          <div class="px-4 py-3 border-b">
            <p class="text-sm font-semibold">{{ group.title }}</p>
          </div>
          <div class="px-4 divide-y">
            <div
              v-for="(player, index) in group.entries.slice(0, 3)"
              :key="`${group.id}-${player.name}-${player.user}`"
              class="flex items-center gap-3 py-3"
            >
              <span class="w-4 text-xs shrink-0 text-muted-foreground">
                {{ index + 1 }}
              </span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-medium truncate">
                  {{ player.name }}
                </span>
                <span class="block text-xs truncate text-muted-foreground">
                  {{ player.user
                  }}<template v-if="player.position">
                    · {{ player.position }}</template
                  >
                </span>
              </span>
              <span class="text-sm font-semibold tabular-nums">
                {{ formatPoints(player.points) }}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <div
      v-if="
        hasCard('team_scoring') && (sharedCards?.teamScores?.length ?? 0) > 0
      "
    >
      <h3 class="text-lg font-semibold">Team scoring leaderboard</h3>
      <Card class="mt-3 overflow-hidden">
        <div class="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div class="px-4 divide-y">
            <div
              v-for="(team, index) in sharedCards?.teamScores?.slice(
                0,
                Math.ceil((sharedCards?.teamScores?.length ?? 0) / 2)
              )"
              :key="team.name"
              class="flex items-center gap-3 py-3"
            >
              <span class="w-5 text-xs font-semibold text-muted-foreground">
                {{ index + 1 }}
              </span>
              <PremiumTeamAvatar
                :src="team.avatar"
                :team-name="team.name"
                size="xs"
              />
              <span class="flex-1 min-w-0 text-sm truncate">{{
                team.name
              }}</span>
              <span class="text-sm font-semibold tabular-nums">
                {{ formatPoints(team.points) }}
              </span>
            </div>
          </div>
          <div class="px-4 divide-y">
            <div
              v-for="(team, index) in sharedCards?.teamScores?.slice(
                Math.ceil((sharedCards?.teamScores?.length ?? 0) / 2)
              )"
              :key="team.name"
              class="flex items-center gap-3 py-3"
            >
              <span class="w-5 text-xs font-semibold text-muted-foreground">
                {{
                  index +
                  Math.ceil((sharedCards?.teamScores?.length ?? 0) / 2) +
                  1
                }}
              </span>
              <PremiumTeamAvatar
                :src="team.avatar"
                :team-name="team.name"
                size="xs"
              />
              <span class="flex-1 min-w-0 text-sm truncate">{{
                team.name
              }}</span>
              <span class="text-sm font-semibold tabular-nums">
                {{ formatPoints(team.points) }}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <div
      v-if="
        hasCard('standings_movers') &&
        (sharedCards?.standingsMoves?.length ?? 0) > 0
      "
    >
      <h3 class="text-lg font-semibold">Standings movers</h3>
      <Card class="mt-3 overflow-hidden">
        <div class="px-4 divide-y">
          <div
            v-for="move in sharedCards?.standingsMoves"
            :key="move.teamName"
            class="flex items-center gap-3 py-3"
          >
            <PremiumTeamAvatar
              :src="move.avatar"
              :team-name="move.teamName"
              size="xs"
            />
            <span class="flex-1 min-w-0 text-sm font-medium truncate">
              {{ move.teamName }}
            </span>
            <span class="text-sm tabular-nums text-muted-foreground">
              #{{ move.from }} → #{{ move.to }}
            </span>
            <span class="text-sm font-semibold text-right w-14">
              {{
                move.change > 0
                  ? `Up ${move.change}`
                  : `Down ${Math.abs(move.change)}`
              }}
            </span>
          </div>
        </div>
      </Card>
    </div>

    <div
      v-if="
        hasCard('waiver_impact') && (sharedCards?.waiverImpact?.length ?? 0) > 0
      "
    >
      <h3 class="text-lg font-semibold">Waiver impact</h3>
      <div class="grid gap-3 mt-3 sm:grid-cols-2">
        <Card
          v-for="move in sharedCards?.waiverImpact"
          :key="`${move.teamName}-${move.playerName}-${move.acquisitionType}`"
          class="p-4"
        >
          <div class="flex items-start gap-3">
            <PremiumTeamAvatar
              :src="move.avatar"
              :team-name="move.teamName"
              size="xs"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">
                {{ move.playerName }}
              </p>
              <p class="text-xs truncate text-muted-foreground">
                {{ move.teamName }} ·
                {{ acquisitionLabel(move.acquisitionType) }}
                <template v-if="move.faabBid != null">
                  · ${{ move.faabBid }}</template
                >
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-semibold tabular-nums">
                {{
                  move.pointsScored == null
                    ? "—"
                    : formatPoints(move.pointsScored)
                }}
              </p>
              <p class="text-xs text-muted-foreground">Points</p>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <div
      v-if="
        hasCard('weekly_lowlights') && report.weeklyLowlights.entries.length > 0
      "
    >
      <h3 class="text-lg font-semibold">Weekly lowlights</h3>
      <div class="grid gap-3 mt-3 sm:grid-cols-2">
        <Card
          v-for="entry in report.weeklyLowlights.entries"
          :key="`${entry.teamName}-${entry.category}`"
          class="p-4"
        >
          <div class="flex items-center gap-3">
            <PremiumTeamAvatar
              :src="entry.avatarUrl"
              :team-name="entry.teamName"
            />
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ entry.teamName }}</p>
              <p class="text-xs text-muted-foreground">
                {{ lowlightCategory(entry.category) }}
              </p>
            </div>
          </div>
          <p class="mt-3 text-sm font-medium leading-6">
            {{ entry.headline }}
          </p>
        </Card>
      </div>
    </div>
  </section>
</template>
