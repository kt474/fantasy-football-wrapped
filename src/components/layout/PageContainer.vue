<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    size?: "prose" | "default" | "wide";
  }>(),
  { size: "default" }
);

const widths = {
  prose: "max-w-4xl",
  default: "max-w-screen-xl",
  wide: "max-w-screen-2xl",
};
</script>

<template>
  <div
    :class="cn('mx-auto w-full px-4 py-6 pb-20 sm:px-6 lg:px-8', widths[size], props.class)"
  >
    <slot />
  </div>
</template>
