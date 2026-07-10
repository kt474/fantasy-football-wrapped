<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  title?: string;
  description?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('space-y-1', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-semibold tracking-tight">
        <slot name="title">{{ title }}</slot>
      </h2>
      <slot name="actions" />
    </div>
    <p v-if="description" class="text-sm text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
