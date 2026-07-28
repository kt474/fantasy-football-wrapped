<script setup lang="ts">
import { Badge } from "@/components/ui/badge";

withDefaults(
  defineProps<{
    title: string;
    eyebrow?: string;
    status?: string;
  }>(),
  {
    eyebrow: "Fourth & Long · 10 teams",
    status: "Demo league",
  }
);
</script>

<template>
  <div
    class="overflow-hidden border shadow-2xl rounded-xl bg-card shadow-black/15 ring-1 ring-black/5"
  >
    <header
      class="flex flex-col gap-3 px-4 py-3.5 border-b bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0">
        <p
          class="text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-muted-foreground"
        >
          {{ eyebrow }}
        </p>
        <h2 class="mt-1 text-sm font-semibold truncate">{{ title }}</h2>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <slot name="toolbar" />
        <Badge variant="outline" class="font-normal bg-background">
          {{ status }}
        </Badge>
      </div>
    </header>
    <slot />
  </div>
</template>
