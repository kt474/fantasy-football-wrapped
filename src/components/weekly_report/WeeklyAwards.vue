<script setup lang="ts">
import Card from "../ui/card/Card.vue";
import type { WeeklyAward } from "./weeklyReportTransforms";

defineProps<{
  awards: WeeklyAward[];
}>();
</script>

<template>
  <section v-if="awards.length > 0" class="space-y-3">
    <div>
      <p class="text-xl font-bold">Weekly Awards</p>
    </div>
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card
        v-for="award in awards"
        :key="award.id"
        class="relative flex flex-col justify-between p-4 overflow-hidden transition-colors border shadow-sm bg-card hover:bg-muted/30"
      >
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <div class="min-w-0 space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-base font-semibold leading-tight">
                  {{ award.title }}
                </p>
              </div>
              <p class="text-sm font-medium truncate text-muted-foreground">
                {{ award.teamName }}
              </p>
            </div>
          </div>
          <p class="text-sm leading-6 text-foreground/85">
            {{ award.description }}
          </p>
        </div>
      </Card>
    </div>
  </section>
</template>
