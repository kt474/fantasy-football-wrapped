<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
import { maxBy, minBy } from "lodash";
import Draft from "../draft/Draft.vue";
import Trades from "../roster_management/Trades.vue";

const store = useStore();
const props = defineProps<{
  tableData: TableDataType[];
}>();

const league = computed(() => {
  return store.leagueInfo[store.currentLeagueIndex];
});

const bestPicks = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.position !== "TE")
    .sort((a, b) => b.pickRank - a.pickRank)
    .slice(0, 5);
});

const worstPicks = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.position !== "TE")
    .sort((a, b) => a.pickRank - b.pickRank)
    .slice(0, 5);
});

const draftSteal = computed(() => {
  return league.value.draftPicks
    ?.filter((obj) => obj.pickNumber > 36)
    .filter((obj) => obj.position !== "TE")
    .sort((a, b) => b.pickRank - a.pickRank)
    .slice(0, 1);
});

const highestBids = computed(() => {
  return league.value.waiverMoves
    ?.slice()
    .sort((a, b) => (b.bid ?? 0) - (a.bid ?? 0))
    .slice(0, 5);
});

const bestPickups = computed(() => {
  return league.value.waiverMoves
    ?.filter(
      (obj) =>
        obj.value !== null && obj.position !== "DEF" && obj.position !== "K"
    )
    .sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
    .slice(0, 5);
});

const mostMoves = computed(() => {
  const maxKey: any = Object.keys(league.value.transactions).reduce(
    (a: any, b: any) =>
      league.value.transactions[a] > league.value.transactions[b] ? a : b
  );
  const user = league.value.users.find((user) => user.id === maxKey);
  return {
    user: user,
    moves: league.value.transactions[maxKey],
  };
});

const fewestMoves = computed(() => {
  const maxKey: any = Object.keys(league.value.transactions).reduce(
    (a: any, b: any) =>
      league.value.transactions[b] > league.value.transactions[a] ? a : b
  );
  const user = league.value.users.find((user) => user.id === maxKey);
  return {
    user: user,
    moves: league.value.transactions[maxKey],
  };
});

// const totalBids = computed(() => {
//   const grouped = league.value.waiverMoves.reduce((acc: any, obj: any) => {
//     const userId = obj.user.id;
//     const status = obj.status;

//     if (!acc[userId]) {
//       acc[userId] = {
//         user: obj.user,
//         sumByStatus: {},
//         totalSpent: 0,
//       };
//     }
//     acc[userId].sumByStatus[status] =
//       (acc[userId].sumByStatus[status] || 0) + obj.bid;
//     acc[userId].totalSpent += obj.bid;

//     return acc;
//   }, {});
//   return {
//     highest: maxBy(Object.values(grouped), "totalSpent"),
//     lowest: minBy(Object.values(grouped), "totalSpent"),
//   };
// });

// Best/worst draft picks DONE
// Best/worst trades
// Best/worst waiver moves DONE
// Most/fewest moves DONE
// Biggest blowouts
// Unluckiest/luckiest
// Most points left on bench (potential points)
// Players drafted still on team
// Total players used

// If multiple years, show all time record

// Points gained from waive999`? (difficult)
// Compare 1st half vs 2nd half, win/lose streaks

// Overall League recap
// League Champ
</script>
<template>
  <div class="pt-4 text-center">
    <h1 class="text-xl font-semibold">{{ league.name }} Wrapped</h1>
    <p>{{ league.season }} {{ league.seasonType }} {{ league.scoringType }}</p>

    <h1 class="mt-2 text-xl font-semibold">Let's take a look at the draft</h1>
    <p>
      {{ league.draftMetadata?.order[0].name }} started off the draft with
      {{ league.draftPicks?.[0].firstName }}
      {{ league.draftPicks?.[0].lastName }}
    </p>
    <h2 class="text-xl font-semibold">Best picks</h2>
    <div>
      <ol class="my-2" v-for="(pick, index) in bestPicks">
        <li>
          {{ index + 1 }}. {{ pick.position }} {{ pick.firstName }}
          {{ pick.lastName }}
        </li>
        <li>
          Drafted round {{ pick.round }}, pick {{ pick.draftSlot }} ({{
            pick.pickNumber
          }})
        </li>
        <li>Positional rank {{ pick.rank }}</li>
      </ol>
    </div>
    <h2 class="text-xl font-semibold">Worst picks</h2>
    <div>
      <ol class="my-2" v-for="(pick, index) in worstPicks">
        <li>
          {{ index + 1 }}. {{ pick.position }} {{ pick.firstName }}
          {{ pick.lastName }}
        </li>
        <li>
          Drafted round {{ pick.round }}, pick {{ pick.draftSlot }} ({{
            pick.pickNumber
          }})
        </li>
        <li>Positional rank {{ pick.rank }}</li>
      </ol>
    </div>
    <h2 class="text-xl font-semibold">Steal of the draft</h2>
    <p>
      {{ draftSteal?.[0].position }} {{ draftSteal?.[0].firstName }}
      {{ draftSteal?.[0].lastName }}
    </p>
    <p>
      Drafted round {{ draftSteal?.[0].round }}, pick
      {{ draftSteal?.[0].draftSlot }} ({{ draftSteal?.[0].pickNumber }})
    </p>
    <h2 class="text-xl font-semibold">Trades</h2>
    <p>{{ league.tradeNames?.length }} trades were made this season</p>
    <h2 class="text-xl font-semibold">Waiver wire</h2>
    <p>
      {{ league.waivers.length }} players were picked up on waivers or as free
      agents
    </p>
    <div v-if="league.waiverType === 2">
      <h2 class="text-xl font-semibold">Highest Bids</h2>
      <ol>
        <li v-for="move in highestBids">
          {{ move.user.name }} {{ move.adds }} ${{ move.bid }}
        </li>
      </ol>
    </div>
    <h2 class="text-xl font-semibold">Best Pickups</h2>
    <ol>
      <li v-for="move in bestPickups">
        {{ move.user.name }} {{ move.adds }} {{ move.value }}
      </li>
    </ol>
    <h2 class="text-xl font-semibold">Most active</h2>
    <p>{{ mostMoves }}</p>
    <h2 class="text-xl font-semibold">Least active</h2>
    <p>{{ fewestMoves }}</p>
    <h2 class="text-xl font-semibold">Highest Bidders</h2>
    <!-- {{ totalBids }} -->
    <!-- workaround to get data without copying over methods -->
    <Draft v-show="false" />
    <Trades v-show="false" />
  </div>
</template>
