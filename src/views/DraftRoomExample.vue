<script setup lang="ts">
import DraftRoomSample from "@/components/league_narratives/DraftRoomSample.vue";
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackPremiumFunnelEvent } from "@/lib/analytics";

const premiumRoute = {
  path: "/account",
  query: {
    intent: "draft_room",
    upgrade_source: "draft_room_example",
  },
};

const trackUnlockClick = () => {
  trackPremiumFunnelEvent("premium_cta_clicked", {
    cta: "explore_premium",
    feature: "draft_room",
    source: "draft_room_example",
  });
};
</script>

<template>
  <PublicPageShell>
    <article>
      <section class="max-w-6xl px-5 py-12 mx-auto sm:py-16">
        <div
          class="flex flex-col gap-4 mb-7 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-primary">Draft room sample</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight">
              A plan for the room you actually draft against
            </h1>
          </div>
          <Badge variant="outline" class="self-start font-normal sm:self-auto">
            Illustrative estimates, not player rankings
          </Badge>
        </div>

        <DraftRoomSample :show-locked-controls="false" />

        <div
          class="flex flex-col items-start gap-5 p-5 mt-6 border rounded-card bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <h2 class="text-xl font-semibold tracking-tight">
              Build a plan for your own draft room
            </h2>
            <p class="max-w-2xl mt-2 text-sm leading-6 text-muted-foreground">
              Premium unlocks draft-room scouting across every Sleeper and ESPN
              league you manage.
            </p>
          </div>
          <Button as-child class="shrink-0">
            <RouterLink :to="premiumRoute" @click="trackUnlockClick">
              Explore Premium
            </RouterLink>
          </Button>
        </div>
      </section>
    </article>
  </PublicPageShell>
</template>
