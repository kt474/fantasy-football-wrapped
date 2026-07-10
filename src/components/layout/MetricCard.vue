<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  label?: string;
  value?: string | number;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('rounded-lg border border-border bg-card p-4 shadow-sm', props.class)">
    <p class="text-sm font-medium text-muted-foreground">
      <slot name="label">{{ label }}</slot>
    </p>
    <p class="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
      <slot>{{ value }}</slot>
    </p>
  </div>
</template>
