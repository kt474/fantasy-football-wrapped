<script setup lang="ts">
import { computed } from "vue";
import { TableDataType } from "../../types/types.ts";
import { useStore } from "../../store/store";
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

// Best/worst draft picks DONE
// Best/worst trades
// Best/worst waiver moves
// Most/fewest moves
// Biggest blowouts
// Unluckiest/luckiest
// Most points left on bench (potential points)
// Players drafted still on team
// Total players used

// If multiple years, show all time record

// Points gained from waive999`? (difficult)
// Compare 1st half vs 2nd h`a`lf, win/lose streaks

// Overall League recap
// League Champ
</script>
<template>
  <div class="pt-4 text-center">
    <h1 class="text-xl font-semibold">{{ league.name }} Wrapped</h1>
    <p>{{ league.season }} {{ league.seasonType }} {{ league.scoringType }}</p>
    <p>
      {{ league.waivers.length }} players were picked up on waivers or as free
      agents
    </p>
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
    <!-- workaround to get data without copying over methods -->
    <Draft v-show="false" />
    <Trades v-show="false" />
  </div>
</template>
