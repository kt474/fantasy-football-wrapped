<script setup lang="ts">
import { ChevronDown, Swords } from "@lucide/vue";
import ProductPreviewFrame from "./ProductPreviewFrame.vue";

const comparisons = [
  { label: "Championships", first: "1", second: "0", winner: "first" },
  { label: "Career record", first: "27–15", second: "20–22", winner: "first" },
  { label: "Points per game", first: "117.6", second: "113.2", winner: "first" },
  { label: "Manager efficiency", first: "91.6%", second: "84.8%", winner: "first" },
  { label: "Head to head", first: "2–3", second: "3–2", winner: "second" },
];
</script>

<template>
  <ProductPreviewFrame
    title="Manager Comparison"
    eyebrow="Fourth & Long · All-time history"
    status="Complete sample"
  >
    <div class="grid grid-cols-[minmax(6rem,1fr)_1fr_1fr] border-b bg-muted/15">
      <div class="p-3"></div>
      <div class="p-3 border-l">
        <div class="flex items-center gap-2">
          <img
            src="/avatars/avatar6.svg"
            alt=""
            class="border rounded-full size-7 bg-muted"
          />
          <span class="min-w-0 text-xs font-medium truncate">Saquondo</span>
          <ChevronDown :size="12" class="ml-auto text-muted-foreground" />
        </div>
      </div>
      <div class="p-3 border-l">
        <div class="flex items-center gap-2">
          <img
            src="/avatars/avatar8.svg"
            alt=""
            class="border rounded-full size-7 bg-muted"
          />
          <span class="min-w-0 text-xs font-medium truncate">Laporta Potty</span>
          <ChevronDown :size="12" class="ml-auto text-muted-foreground" />
        </div>
      </div>
    </div>

    <div
      v-for="row in comparisons"
      :key="row.label"
      class="grid grid-cols-[minmax(6rem,1fr)_1fr_1fr] text-xs border-b"
    >
      <p class="p-3 font-medium">{{ row.label }}</p>
      <p
        class="p-3 text-center border-l tabular-nums"
        :class="row.winner === 'first' ? 'font-semibold text-primary' : ''"
      >
        {{ row.first }}
      </p>
      <p
        class="p-3 text-center border-l tabular-nums"
        :class="row.winner === 'second' ? 'font-semibold text-primary' : ''"
      >
        {{ row.second }}
      </p>
    </div>

    <section class="p-4 sm:p-5">
      <div class="flex items-center gap-2">
        <Swords :size="15" class="text-primary" />
        <h3 class="text-sm font-semibold">Rivalry Report</h3>
      </div>
      <p class="mt-3 text-xs leading-5 text-foreground/90">
        Saquondo owns the stronger résumé, with the title, scoring edge, and
        cleaner lineup decisions. Laporta Potty still holds the detail that
        matters most in the group chat: a 3–2 head-to-head lead that keeps this
        rivalry far more annoying than the career numbers suggest.
      </p>
    </section>
  </ProductPreviewFrame>
</template>
