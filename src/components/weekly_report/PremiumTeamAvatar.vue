<script setup lang="ts">
import { computed } from "vue";
import { handleImageFallback } from "@/lib/imageFallback";

const props = withDefaults(
  defineProps<{
    src?: string;
    teamName: string;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" }
);

const initials = computed(() =>
  props.teamName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
);
</script>

<template>
  <div
    class="flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 font-semibold text-primary ring-2 ring-background"
    :class="{
      'size-9 text-xs': size === 'sm',
      'size-11 text-sm': size === 'md',
      'size-14 text-base': size === 'lg',
    }"
  >
    <img
      v-if="src"
      :src="src"
      :alt="`${teamName} avatar`"
      class="size-full object-cover"
      @error="handleImageFallback"
    />
    <span v-else aria-hidden="true">{{ initials || "?" }}</span>
  </div>
</template>
