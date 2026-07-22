<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  Share2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox/Checkbox.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_SHARED_REPORT_CARD_IDS,
  normalizeSharedReportCardIds,
  SHARED_REPORT_CARD_OPTIONS,
} from "@/lib/sharedReportCards";
import type { SharedReportCardId } from "@/types/types";

const props = defineProps<{
  open: boolean;
  loading: boolean;
  leagueId: string;
  shareUrl: string;
  availableCardIds: SharedReportCardId[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  share: [selected: SharedReportCardId[]];
  copy: [];
  "native-share": [];
}>();

const selected = ref<SharedReportCardId[]>([]);
const canNativeShare =
  typeof navigator !== "undefined" && typeof navigator.share === "function";
const storageKey = computed(
  () => `ffwrapped:shared-report-cards:v2:${props.leagueId || "default"}`
);
const availableSet = computed(() => new Set(props.availableCardIds));
const selectedSet = computed(() => new Set(selected.value));
const availableOptions = computed(() =>
  SHARED_REPORT_CARD_OPTIONS.filter((option) =>
    availableSet.value.has(option.id)
  )
);

const loadSelections = () => {
  let saved: SharedReportCardId[] = [];
  let hasSavedPreferences = false;

  try {
    const stored = localStorage.getItem(storageKey.value);
    hasSavedPreferences = stored !== null;
    saved = normalizeSharedReportCardIds(JSON.parse(stored ?? "[]"));
  } catch {
    saved = [];
  }

  selected.value = (
    hasSavedPreferences ? saved : DEFAULT_SHARED_REPORT_CARD_IDS
  ).filter((id) => availableSet.value.has(id));
};

watch(
  () => props.open,
  (open) => {
    if (open) loadSelections();
  }
);

const updateOpen = (open: boolean) => {
  if (!props.loading) emit("update:open", open);
};

const updateCard = (id: SharedReportCardId, checked: boolean) => {
  if (!availableSet.value.has(id)) return;

  selected.value = checked
    ? normalizeSharedReportCardIds([...selected.value, id])
    : selected.value.filter((selectedId) => selectedId !== id);
};

const createShareLink = () => {
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(selected.value));
  } catch {
    // Sharing still works when browser storage is unavailable.
  }
  emit("share", selected.value);
};
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent class="max-w-xl gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-5 pt-5 pb-4 pr-12 border-b sm:px-6 sm:pt-6">
        <DialogTitle class="text-xl">
          {{ shareUrl ? "Your report is ready" : "Customize shared report" }}
        </DialogTitle>
        <DialogDescription>
          <template v-if="shareUrl"> Share it with your league. </template>
          <template v-else>
            Choose the extra cards your league will see with the full Premium
            report.
          </template>
        </DialogDescription>
      </DialogHeader>

      <div v-if="shareUrl" class="px-5 pb-6 space-y-3 sm:px-6">
        <div
          class="flex items-center gap-2 py-1 pl-3 pr-1 mt-4 border rounded-card bg-muted/20"
        >
          <p class="flex-1 min-w-0 text-sm truncate text-muted-foreground">
            {{ shareUrl }}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0"
            aria-label="Copy share link"
            title="Copy share link"
            @click="emit('copy')"
          >
            <Copy class="size-4" />
          </Button>
        </div>

        <div class="grid gap-2" :class="{ 'grid-cols-2': canNativeShare }">
          <Button as-child :variant="canNativeShare ? 'outline' : 'default'">
            <a :href="shareUrl" target="_blank" rel="noopener noreferrer">
              View shared report
              <ExternalLink class="size-4" />
            </a>
          </Button>
          <Button
            v-if="canNativeShare"
            type="button"
            @click="emit('native-share')"
          >
            <Share2 class="size-4" />
            Share
          </Button>
        </div>
      </div>

      <template v-else>
        <div class="px-5 space-y-4 overflow-y-auto sm:px-6">
          <div class="flex items-center gap-3 pb-4 border-b">
            <span
              class="grid border rounded-full size-5 shrink-0 place-items-center bg-muted"
            >
              <Check class="size-3.5" />
            </span>
            <div class="flex-1 min-w-0 mt-4">
              <p class="text-sm font-semibold">Full Premium report</p>
              <p class="text-xs leading-5 text-muted-foreground">
                Headlines, recaps, and analysis.
              </p>
            </div>
            <span class="text-xs text-muted-foreground">Included</span>
          </div>

          <div class="space-y-2">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-sm font-semibold">Add more insights</p>
                <p class="mb-2 text-xs text-muted-foreground">
                  Include any additional weekly data you want to share.
                </p>
              </div>
            </div>

            <div class="border divide-y rounded-card">
              <label
                v-for="option in availableOptions"
                :key="option.id"
                :for="`shared-card-${option.id}`"
                class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30"
              >
                <Checkbox
                  :id="`shared-card-${option.id}`"
                  :model-value="selectedSet.has(option.id)"
                  class="mt-0.5"
                  @update:model-value="updateCard(option.id, $event === true)"
                />
                <span class="flex-1 min-w-0">
                  <span class="block text-sm font-medium">{{
                    option.title
                  }}</span>
                  <span
                    class="mt-0.5 block text-xs leading-5 text-muted-foreground"
                  >
                    {{ option.description }}
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between gap-3 px-5 py-4 mt-4 border-t sm:px-6"
        >
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              :disabled="loading"
              @click="emit('update:open', false)"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              :disabled="loading"
              @click="createShareLink"
            >
              <LoaderCircle v-if="loading" class="size-4 animate-spin" />
              {{ loading ? "Creating link" : "Create share link" }}
            </Button>
          </div>
        </div>
      </template>
    </DialogContent>
  </Dialog>
</template>
