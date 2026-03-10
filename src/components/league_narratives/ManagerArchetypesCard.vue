<script setup lang="ts">
import Card from "../ui/card/Card.vue";
import type { ManagerArchetype } from "@/lib/narratives";

defineProps<{
  archetypes: ManagerArchetype[];
}>();
</script>

<template>
  <Card class="p-5">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-lg font-semibold">Manager Archetypes</p>
        <p class="text-sm text-muted-foreground">
          Raw manager aggregates for later narrative generation.
        </p>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ archetypes.length }} managers
      </p>
    </div>

    <div class="mt-4 space-y-4">
      <div
        v-for="archetype in archetypes.slice(0, 4)"
        :key="archetype.userId"
        class="rounded-lg border p-4"
      >
        <p class="font-semibold">{{ archetype.displayName }}</p>
        <pre class="mt-3 text-xs whitespace-pre-wrap text-muted-foreground">{{
          JSON.stringify(archetype, null, 2)
        }}</pre>
      </div>
    </div>
  </Card>
</template>
