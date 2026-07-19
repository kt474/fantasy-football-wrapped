<script setup lang="ts">
import { ref } from "vue";
import { trackEvent } from "@/lib/analytics";

const props = defineProps<{
  source: string;
}>();

const hasTrackedPlay = ref(false);

const trackPlay = () => {
  if (hasTrackedPlay.value) return;
  hasTrackedPlay.value = true;
  trackEvent("Video Recap Example Played", { source: props.source });
};
</script>

<template>
  <video
    controls
    playsinline
    preload="metadata"
    poster="/video/ffwrapped-video-recap-poster.png"
    aria-label="Play the ffwrapped Week 11 fantasy football video recap example"
    class="block w-full bg-slate-950 aspect-[9/16]"
    @play="trackPlay"
  >
    <source
      src="/video/ffwrapped-marketing-demo-week-11.mp4"
      type="video/mp4"
    />
    Your browser does not support the video element.
  </video>
</template>
