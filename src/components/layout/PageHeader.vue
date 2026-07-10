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
  <header :class="cn('mb-6 space-y-1.5', props.class)">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="text-3xl font-semibold tracking-tight">
        <slot name="title">{{ title }}</slot>
      </h1>
      <slot name="actions" />
    </div>
    <p v-if="description" class="max-w-3xl text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </header>
</template>
