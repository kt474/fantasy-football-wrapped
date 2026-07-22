<script setup lang="ts">
import { ArrowLeft, Check } from "lucide-vue-next";

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
      <header class="border-b">
        <div class="max-w-6xl px-5 mx-auto py-14 sm:py-20">
          <RouterLink
            class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            to="/fantasy-football-draft-grades"
          >
            <ArrowLeft :size="15" /> Draft grades guide
          </RouterLink>

          <div
            class="grid gap-8 mt-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end"
          >
            <div class="max-w-4xl">
              <Badge variant="secondary">Premium Draft Room example</Badge>
              <h1
                class="mt-5 text-4xl font-semibold tracking-tight text-pretty sm:text-5xl"
              >
                See what your draft room usually does before you are on the
                clock
              </h1>
              <p class="max-w-3xl mt-5 text-lg leading-8 text-muted-foreground">
                This sample turns several seasons of manager draft tendencies
                into a positional plan for one team and draft slot, plus
                league-mate scouting for the room around it.
              </p>
            </div>

            <div class="p-5 border rounded-card bg-muted/20">
              <p
                class="text-xs font-medium tracking-wide uppercase text-muted-foreground"
              >
                Sample setup
              </p>
              <p class="mt-2 font-semibold">10-team PPR · Snake draft</p>
              <div class="grid gap-2 mt-4 text-sm text-muted-foreground">
                <span class="inline-flex items-center gap-2">
                  <Check :size="14" class="text-primary" /> Four draft histories
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check :size="14" class="text-primary" /> Draft slot 7
                </span>
                <span class="inline-flex items-center gap-2">
                  <Check :size="14" class="text-primary" /> Fictional team names
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section class="max-w-6xl px-5 py-12 mx-auto sm:py-16">
        <div
          class="flex flex-col gap-4 mb-7 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p class="text-sm font-medium text-primary">Draft room sample</p>
            <h2 class="mt-2 text-3xl font-semibold tracking-tight">
              A plan for the room you actually draft against
            </h2>
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
