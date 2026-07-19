<script setup lang="ts">
import PublicPageShell from "@/components/seo/PublicPageShell.vue";
import VideoRecapPreview from "@/components/weekly_report/VideoRecapPreview.vue";
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

      <p class="mt-4 text-xs leading-5 text-muted-foreground">
        Sample league and team names are fictional. Video created with ffwrapped
        Premium for product demonstration.
      </p>
    </article>
  </PublicPageShell>
</template>
