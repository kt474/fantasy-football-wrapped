<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { generateWeeklyReportAudio } from "@/api/api";
import { toast } from "vue-sonner";
import { Download, LoaderCircle, Volume2 } from "lucide-vue-next";

const props = defineProps<{
  recapText: string;
  fileName?: string;
}>();

const audioUrl = ref("");
const isGenerating = ref(false);

const hasRecapText = computed(() => props.recapText.trim().length > 0);
const hasAudio = computed(() => audioUrl.value.length > 0);
const isConfigured = computed(() =>
  Boolean(import.meta.env.VITE_WEEKLY_REPORT_AUDIO)
);

const revokeAudioUrl = () => {
  if (!audioUrl.value) {
    return;
  }
  URL.revokeObjectURL(audioUrl.value);
  audioUrl.value = "";
};

const generateAudio = async () => {
  if (!hasRecapText.value) {
    toast.error("Generate a weekly recap first");
    return;
  }
  if (!isConfigured.value) {
    toast.error("Missing VITE_WEEKLY_REPORT_AUDIO configuration");
    return;
  }

  isGenerating.value = true;
  try {
    revokeAudioUrl();
    const audioBlob = await generateWeeklyReportAudio(props.recapText);
    audioUrl.value = URL.createObjectURL(audioBlob);
    toast.success("Audio recap ready");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate audio recap";
    toast.error(message);
  } finally {
    isGenerating.value = false;
  }
};

watch(
  () => props.recapText,
  () => revokeAudioUrl()
);

onBeforeUnmount(() => revokeAudioUrl());
</script>

<template>
  <section class="py-4 mt-4 md:max-w-96">
    <div class="flex flex-row items-center gap-3">
      <div>
        <p class="font-semibold">Audio replay</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          @click="generateAudio"
          :disabled="isGenerating || !hasRecapText"
        >
          <LoaderCircle v-if="isGenerating" class="mr-2 size-4 animate-spin" />
          <Volume2 v-else class="mr-2 size-4" />
          Generate
        </Button>
        <Button
          v-if="hasAudio"
          as="a"
          :href="audioUrl"
          :download="fileName ?? 'weekly-recap.mp3'"
          variant="outline"
        >
          <Download class="mr-2 size-4" />
          Download
        </Button>
      </div>
    </div>
    <audio v-if="hasAudio" class="w-full mt-4" :src="audioUrl" controls />
  </section>
</template>
