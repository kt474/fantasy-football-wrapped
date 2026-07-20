<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import VideoRecapPreview from "@/components/weekly_report/VideoRecapPreview.vue";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { ArrowRight } from "lucide-vue-next";

const trackCreateRecap = () => {
  trackEvent("Video Recap CTA Clicked", { source: "video_example_page" });
};
</script>

<template>
  <PublicPageShell>
    <article class="max-w-4xl px-5 py-4 mx-auto">
      <header class="max-w-2xl mt-8">
        <h1
          class="mt-4 text-3xl font-semibold tracking-tight text-pretty sm:text-4xl"
        >
          Weekly Video Recap Example
        </h1>
        <p class="mt-3 leading-7 text-muted-foreground">
          A 25-second sample built from league storylines, matchup scores, and
          team performances.
        </p>
      </header>

      <div
        class="w-full max-w-sm mt-4 overflow-hidden border shadow-xl rounded-[1.75rem] bg-slate-950 ring-1 ring-foreground/10"
      >
        <VideoRecapPreview source="video_example_page" />
      </div>

      <section
        class="w-full max-w-sm p-5 mt-5 text-white border border-blue-400/30 bg-slate-950 rounded-card"
      >
        <h2 class="text-xl font-semibold tracking-tight">
          Make next week your league’s story
        </h2>
        <p class="mt-2 text-sm leading-6 text-slate-300">
          Connect a Sleeper or ESPN league, generate a Premium report, and turn
          it into a narrated video recap.
        </p>
        <Button as-child size="lg" variant="secondary" class="w-full mt-4">
          <RouterLink to="/" @click="trackCreateRecap">
            Create your own recap
            <ArrowRight class="size-4" />
          </RouterLink>
        </Button>
      </section>

      <p class="mt-4 text-xs leading-5 text-muted-foreground">
        Sample league and team names are fictional. Video created with ffwrapped
        Premium for product demonstration.
      </p>
    </article>
  </PublicPageShell>
</template>
