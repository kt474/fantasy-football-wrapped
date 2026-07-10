<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <section
    :class="cn('rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6', props.class)"
  >
    <slot />
  </section>
</template>
