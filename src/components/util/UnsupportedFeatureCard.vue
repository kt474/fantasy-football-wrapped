<script setup lang="ts">
import Card from "@/components/ui/card/Card.vue";
import type { FantasyProviderId } from "@/types/types";

defineProps<{
  provider: FantasyProviderId;
  feature: string;
}>();
</script>

<template>
  <Card class="p-6 mt-4">
    <h3 class="text-lg font-semibold">{{ feature }} is not supported yet</h3>
    <p class="mt-2 text-sm text-muted-foreground">
      {{ provider.toUpperCase() }} league support currently covers core
      standings and schedule analysis. This section still depends on
      Sleeper-specific data or assets.
    </p>
  </Card>
</template>
