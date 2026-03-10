<script setup lang="ts">
import Card from "../ui/card/Card.vue";
import type { RivalryProfile } from "@/lib/narratives";

defineProps<{
  rivalries: RivalryProfile[];
}>();
</script>

<template>
  <Card class="p-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-lg font-semibold">Greatest Rivalries</p>
        <p class="text-sm text-muted-foreground">
          Raw rivalry aggregates ranked by recurrence, balance, and closeness.
        </p>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ rivalries.length }} rivalry pairs
      </p>
    </div>

    <div class="mt-4 space-y-4">
      <div
        v-for="rivalry in rivalries.slice(0, 3)"
        :key="`${rivalry.manager1Id}-${rivalry.manager2Id}`"
        class="rounded-lg border p-4"
      >
        <p class="font-semibold">
          {{ rivalry.manager1Name }} vs {{ rivalry.manager2Name }}
        </p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(rivalry, null, 2)
        }}</pre>
      </div>
    </div>
  </Card>
</template>
