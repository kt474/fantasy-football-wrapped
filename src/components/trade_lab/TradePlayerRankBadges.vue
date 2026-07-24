<script setup lang="ts">
const props = defineProps<{
  positionRank: number;
  overallRank: number;
  dynastyAdp?: number | null;
  showDynastyAdp?: boolean;
}>();

const rankLabel = (rank: number) => (rank > 0 ? `#${rank}` : "N/A");

const waiverPaletteClass = (tier: number) => {
  if (tier === 1) return "performance-excellent";
  if (tier === 2) return "performance-good";
  if (tier === 3) return "performance-average";
  if (tier === 4) return "performance-poor";
  return "performance-bad";
};

const posRankClass = (rank: number) => {
  if (rank <= 0) return "bg-muted text-muted-foreground";
  if (rank <= 12) return waiverPaletteClass(1);
  if (rank <= 24) return waiverPaletteClass(2);
  if (rank <= 36) return waiverPaletteClass(3);
  if (rank <= 48) return waiverPaletteClass(4);
  return waiverPaletteClass(5);
};

const overallRankClass = (rank: number) => {
  if (rank <= 0) return "bg-muted text-muted-foreground";
  if (rank <= 24) return waiverPaletteClass(1);
  if (rank <= 60) return waiverPaletteClass(2);
  if (rank <= 120) return waiverPaletteClass(3);
  if (rank <= 180) return waiverPaletteClass(4);
  return waiverPaletteClass(5);
};

const dynastyAdpLabel = () => {
  const adp = Number(props.dynastyAdp);
  return Number.isFinite(adp) && adp > 0 ? `ADP ${adp.toFixed(1)}` : "Unranked";
};
</script>

<template>
  <div class="flex flex-col items-end gap-1 ml-auto">
    <span
      v-if="showDynastyAdp"
      class="px-2 py-1 text-xs font-semibold rounded-md bg-muted text-muted-foreground"
    >
      {{ dynastyAdpLabel() }}
    </span>
    <template v-else>
      <span
        :class="[
          'rounded-md px-2 py-1 text-xs font-semibold',
          posRankClass(positionRank),
        ]"
      >
        POS {{ rankLabel(positionRank) }}
      </span>
      <span
        :class="[
          'rounded-md px-2 py-1 text-xs font-semibold',
          overallRankClass(overallRank),
        ]"
      >
        OVR {{ rankLabel(overallRank) }}
      </span>
    </template>
  </div>
</template>
