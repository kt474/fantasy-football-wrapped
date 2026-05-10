<script setup lang="ts">
import { Copy, Download, Share2 } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import type { ShareMoment } from "@/lib/shareMoments";
import { shareMomentAccentClasses } from "@/lib/shareMoments";

const props = defineProps<{
  moment: ShareMoment;
  loading?: boolean;
}>();

const emit = defineEmits<{
  download: [moment: ShareMoment];
  share: [moment: ShareMoment];
  copy: [moment: ShareMoment];
}>();
</script>

<template>
  <div
    class="flex h-full min-h-52 flex-col justify-between rounded-lg border p-4"
    :class="shareMomentAccentClasses[props.moment.accent]"
  >
    <div>
      <div class="flex items-start justify-between gap-3">
        <p class="text-xs font-bold uppercase tracking-wide opacity-75">
          {{ props.moment.title }}
        </p>
        <p class="shrink-0 text-xs font-semibold opacity-75">
          Week {{ props.moment.week }}
        </p>
      </div>
      <h3 class="mt-3 text-xl font-black leading-tight">
        {{ props.moment.headline }}
      </h3>
      <p class="mt-2 text-sm leading-5 opacity-80">
        {{ props.moment.subtext }}
      </p>
    </div>

    <div class="mt-4">
      <div class="mb-3 rounded-md bg-white/60 p-3 dark:bg-black/10">
        <p class="text-xs font-semibold uppercase tracking-wide opacity-70">
          {{ props.moment.statLabel }}
        </p>
        <p class="mt-1 text-2xl font-black">{{ props.moment.statValue }}</p>
      </div>
      <div class="flex gap-2">
        <Button
          type="button"
          size="sm"
          class="flex-1"
          :disabled="props.loading"
          @click="emit('share', props.moment)"
        >
          <Share2 class="size-4" />
          <span class="sr-only">Share card</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          :disabled="props.loading"
          @click="emit('download', props.moment)"
        >
          <Download class="size-4" />
          <span class="sr-only">Download card</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="props.loading"
          @click="emit('copy', props.moment)"
        >
          <Copy class="size-4" />
          <span class="sr-only">Copy share text</span>
        </Button>
      </div>
    </div>
  </div>
</template>
