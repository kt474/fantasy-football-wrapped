<script setup lang="ts">
import { computed } from "vue";
import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";
import { getPlayerImageUrl } from "@/lib/assets";

interface ShareTeam {
  name: string;
  points: number;
  avatar: string;
}

interface SharePlayer {
  name: string;
  user: string;
  points: number;
  position: string;
  player_id: string;
}

const props = defineProps<{
  leagueName?: string;
  week: number;
  topTeams: ShareTeam[];
  hotPlayers: SharePlayer[];
  coldPlayers: SharePlayer[];
  benchPlayers: SharePlayer[];
  summary: string;
}>();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const renderedSummary = computed(() => {
  const source = props.summary || "No summary available yet.";
  return DOMPurify.sanitize(md.render(source));
});

const formatPoints = (points: number) => points.toFixed(2);

const topTeamsForCard = computed(() => props.topTeams.slice(0, 6));
const hotPlayersForCard = computed(() => props.hotPlayers.slice(0, 4));
const coldPlayersForCard = computed(() => props.coldPlayers.slice(0, 4));
const benchPlayersForCard = computed(() => props.benchPlayers.slice(0, 4));
</script>

<template>
  <div
    class="box-border flex min-h-[1600px] w-[1320px] flex-col gap-4 bg-background p-8 text-foreground"
  >
    <div class="p-4 border rounded-xl border-border bg-card">
      <div class="flex items-center gap-2.5">
        <img
          height="24"
          width="24"
          src="../../assets/football-helmet.webp"
          class="h-6"
          alt="ffwrapped logo"
        />
        <span class="text-2xl font-semibold tracking-tight">
          <span class="text-primary">ff</span>wrapped
        </span>
      </div>
      <h2 class="mt-3 text-4xl font-bold leading-none">
        Week {{ props.week }}
      </h2>
      <p class="mt-1 text-xl font-medium text-muted-foreground">
        {{ props.leagueName || "Your League" }}
      </p>
    </div>

    <section class="p-4 border rounded-xl border-border bg-card">
      <h3 class="mb-3 text-2xl font-semibold">Summary</h3>
      <div
        class="max-w-[70ch] text-lg leading-8 text-foreground [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6"
        v-html="renderedSummary"
      ></div>
    </section>

    <div class="grid flex-1 grid-cols-2 grid-rows-2 gap-4">
      <section class="p-4 border rounded-xl border-border bg-card">
        <h3 class="mb-4 text-xl font-semibold">Points Scored</h3>
        <div v-if="topTeamsForCard.length > 0" class="space-y-2.5">
          <div
            v-for="(team, index) in topTeamsForCard"
            :key="`${team.name}-${index}`"
            class="flex items-center justify-between"
          >
            <div
              class="grid min-w-0 flex-1 grid-cols-[20px_30px_minmax(0,1fr)] items-center gap-2"
            >
              <span class="text-sm font-semibold"> {{ index + 1 }}. </span>
              <img
                v-if="team.avatar"
                alt="User avatar"
                class="rounded-full h-7 w-7"
                :src="team.avatar"
              />
              <svg
                v-else
                class="h-7 w-7 text-muted-foreground"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z"
                />
              </svg>
              <span class="font-medium truncate">{{ team.name }}</span>
            </div>
            <span class="ml-4 font-semibold">
              {{ formatPoints(team.points) }}
            </span>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No team data available.
        </p>
      </section>

      <section class="p-4 border rounded-xl border-border bg-card">
        <h3 class="mb-4 text-xl font-semibold">Top Performers</h3>
        <div v-if="hotPlayersForCard.length > 0" class="space-y-3">
          <div
            v-for="(player, index) in hotPlayersForCard"
            :key="`${player.name}-${index}`"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <img
                v-if="player.position !== 'DEF'"
                alt="Player image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <img
                v-else
                alt="Defense image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <div class="min-w-0">
                <p class="font-medium truncate">{{ player.name }}</p>
                <p class="text-sm truncate text-muted-foreground">
                  {{ player.user }}
                </p>
              </div>
            </div>
            <p class="font-semibold">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No player data available.
        </p>
      </section>

      <section class="p-4 border rounded-xl border-border bg-card">
        <h3 class="mb-4 text-xl font-semibold">Bottom Performers</h3>
        <div v-if="coldPlayersForCard.length > 0" class="space-y-3">
          <div
            v-for="(player, index) in coldPlayersForCard"
            :key="`${player.name}-${index}`"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <img
                v-if="player.position !== 'DEF'"
                alt="Player image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <img
                v-else
                alt="Defense image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <div class="min-w-0">
                <p class="font-medium truncate">{{ player.name }}</p>
                <p class="text-sm truncate text-muted-foreground">
                  {{ player.user }}
                </p>
              </div>
            </div>
            <p class="font-semibold">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No player data available.
        </p>
      </section>

      <section class="p-4 border rounded-xl border-border bg-card">
        <h3 class="mb-4 text-xl font-semibold">Top Benchwarmers</h3>
        <div v-if="benchPlayersForCard.length > 0" class="space-y-3">
          <div
            v-for="(player, index) in benchPlayersForCard"
            :key="`${player.name}-${index}`"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex min-w-0 items-center gap-2.5">
              <img
                v-if="player.position !== 'DEF'"
                alt="Player image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <img
                v-else
                alt="Defense image"
                class="object-cover rounded h-9 w-9"
                :src="
                  getPlayerImageUrl(
                    'sleeper',
                    player.player_id,
                    player.position
                  )
                "
              />
              <div class="min-w-0">
                <p class="font-medium truncate">{{ player.name }}</p>
                <p class="text-base truncate text-muted-foreground">
                  {{ player.user }}
                </p>
              </div>
            </div>
            <p class="font-semibold">
              {{ formatPoints(player.points) }}
            </p>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No player data available.
        </p>
      </section>
    </div>

    <p class="text-sm text-muted-foreground">
      Built with <span class="font-semibold text-primary">ffwrapped.com</span>
    </p>
  </div>
</template>
