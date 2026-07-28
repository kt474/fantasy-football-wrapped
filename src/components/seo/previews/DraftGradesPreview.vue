<script setup lang="ts">
import { ChevronDown, TrendingDown, TrendingUp } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";
import PlayerHeadshot from "./PlayerHeadshot.vue";
import { fakeDraftGrades } from "@/data/demo/draft-grades";

const draft = fakeDraftGrades[0];
const picks = draft.picks.slice(0, 4).map((pick, index) => ({
  ...pick,
  grade: ["A-", "A", "B+", "B-"][index],
}));

const positionClass = (position: string) => {
  if (position === "RB") return "border-sky-400/30 bg-sky-500/10";
  if (position === "WR") return "border-emerald-400/30 bg-emerald-500/10";
  if (position === "QB") return "border-fuchsia-400/30 bg-fuchsia-500/10";
  return "border-rose-400/30 bg-rose-500/10";
};
</script>

<template>
  <ProductPreviewFrame
    title="Draft Grades"
    eyebrow="Fourth & Long · 2026 completed draft"
  >
    <template #toolbar>
      <span
        class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] border rounded-md bg-background"
      >
        Just the Tua Us <ChevronDown :size="12" />
      </span>
    </template>

    <div class="p-4">
      <div
        class="flex flex-col gap-3 p-4 border rounded-lg bg-muted/15 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
            Team grade
          </p>
          <div class="flex items-end gap-3 mt-1">
            <span class="text-4xl font-bold tracking-tight text-primary">A-</span>
            <span class="pb-1 text-xs text-muted-foreground"
              >3rd of 10 managers</span
            >
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-sm font-semibold">+18.4</p>
            <p class="text-[0.62rem] text-muted-foreground">Draft value</p>
          </div>
          <div>
            <p class="text-sm font-semibold">6</p>
            <p class="text-[0.62rem] text-muted-foreground">Value picks</p>
          </div>
          <div>
            <p class="text-sm font-semibold">2</p>
            <p class="text-[0.62rem] text-muted-foreground">Reaches</p>
          </div>
        </div>
      </div>

      <div class="grid gap-2 mt-3 sm:grid-cols-2">
        <article
          v-for="pick in picks"
          :key="pick.draftPick.playerId"
          class="relative flex items-center gap-3 p-3 overflow-hidden border rounded-lg"
          :class="positionClass(pick.draftPick.position)"
        >
          <PlayerHeadshot
            :player-id="pick.draftPick.playerId"
            :name="`${pick.draftPick.firstName} ${pick.draftPick.lastName}`"
            :position="pick.draftPick.position"
            :team="pick.draftPick.team"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold truncate">
              {{ pick.draftPick.firstName }} {{ pick.draftPick.lastName }}
            </p>
            <p class="text-[0.67rem] text-muted-foreground">
              {{ pick.draftPick.position }} · {{ pick.draftPick.team }} · Pick
              {{ pick.draftPick.pickNumber }}
            </p>
            <p
              class="inline-flex items-center gap-1 mt-1 text-[0.65rem]"
              :class="
                pick.draftPick.pickNumber >= pick.adp
                  ? 'text-success'
                  : 'text-muted-foreground'
              "
            >
              <TrendingUp
                v-if="pick.draftPick.pickNumber >= pick.adp"
                :size="11"
              />
              <TrendingDown v-else :size="11" />
              ADP {{ pick.adp.toFixed(1) }}
            </p>
          </div>
          <span class="text-lg font-bold">{{ pick.grade }}</span>
        </article>
      </div>
    </div>
  </ProductPreviewFrame>
</template>
