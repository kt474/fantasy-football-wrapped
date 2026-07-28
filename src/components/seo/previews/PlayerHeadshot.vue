<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps<{
  playerId: string;
  name: string;
  position: string;
  team?: string;
}>();

const failed = ref(false);
const initials = computed(() =>
  props.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
);
const imageUrl = computed(() =>
  props.position === "DEF"
    ? `https://sleepercdn.com/images/team_logos/nfl/${props.playerId.toLowerCase()}.png`
    : `https://sleepercdn.com/content/nfl/players/thumb/${props.playerId}.jpg`
);
</script>

<template>
  <span
    class="relative inline-flex overflow-hidden border rounded-full size-9 shrink-0 bg-muted"
  >
    <span
      class="absolute inset-0 inline-flex items-center justify-center text-[0.65rem] font-semibold text-muted-foreground"
    >
      {{ initials }}
    </span>
    <img
      v-if="!failed"
      :src="imageUrl"
      :alt="`${name}, ${position}${team ? ` for ${team}` : ''}`"
      class="relative z-10 object-cover w-full h-full"
      :class="{ 'object-contain p-1 bg-background': position === 'DEF' }"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    />
  </span>
</template>
