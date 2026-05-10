<script setup lang="ts">
import type { ShareMoment } from "@/lib/shareMoments";
import { shareMomentExportAccents } from "@/lib/shareMoments";

const props = defineProps<{
  moment: ShareMoment;
}>();
</script>

<template>
  <div
    class="box-border flex h-[1350px] w-[1080px] flex-col justify-between overflow-hidden bg-gradient-to-br p-16 text-white"
    :class="shareMomentExportAccents[props.moment.accent].background"
  >
    <div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img
            height="36"
            width="36"
            src="../../assets/football-helmet.webp"
            class="h-9 w-9"
            alt="ffwrapped logo"
          />
          <span class="text-4xl font-semibold">
            <span class="text-primary">ff</span>wrapped
          </span>
        </div>
        <p
          class="rounded-full px-5 py-2 text-2xl font-bold"
          :class="shareMomentExportAccents[props.moment.accent].chip"
        >
          Week {{ props.moment.week }}
        </p>
      </div>

      <div class="mt-24">
        <p
          class="mb-8 inline-flex rounded-full px-5 py-2 text-2xl font-bold uppercase tracking-wide"
          :class="shareMomentExportAccents[props.moment.accent].chip"
        >
          {{ props.moment.title }}
        </p>
        <h2 class="max-w-[900px] text-8xl font-black leading-[0.95]">
          {{ props.moment.headline }}
        </h2>
        <p
          class="mt-10 max-w-[760px] text-4xl font-medium leading-tight"
          :class="shareMomentExportAccents[props.moment.accent].foreground"
        >
          {{ props.moment.subtext }}
        </p>
      </div>
    </div>

    <div>
      <div class="rounded-3xl border border-white/20 bg-white/10 p-10">
        <p class="text-2xl font-semibold uppercase tracking-wide text-white/70">
          {{ props.moment.statLabel }}
        </p>
        <p class="mt-3 text-7xl font-black">{{ props.moment.statValue }}</p>
        <p v-if="props.moment.opponentName" class="mt-4 text-3xl text-white/75">
          vs. {{ props.moment.opponentName }}
        </p>
      </div>
      <div class="mt-10 flex items-end justify-between gap-8">
        <div>
          <p class="text-3xl font-bold">
            {{ props.moment.leagueName || "Your League" }}
          </p>
          <p class="mt-2 text-2xl text-white/65">Built with ffwrapped.com</p>
        </div>
        <p class="max-w-[360px] text-right text-2xl font-semibold text-white/75">
          {{ props.moment.ctaUrl.replace(/^https?:\/\//, "") }}
        </p>
      </div>
    </div>
  </div>
</template>

