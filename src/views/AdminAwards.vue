<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useAwardsStore } from "../store/awards";
import { useStore } from "../store/store";
import type { SeasonalAward, SeasonalAwardId } from "../api/types";

const awardsStore = useAwardsStore();
const store = useStore();

const formState = reactive<Record<SeasonalAwardId, SeasonalAward>>({} as Record<
  SeasonalAwardId,
  SeasonalAward
>);
const rowErrors = reactive<Record<SeasonalAwardId, string[]>>({} as Record<
  SeasonalAwardId,
  string[]
>);
const saving = reactive<Record<SeasonalAwardId, boolean>>({} as Record<
  SeasonalAwardId,
  boolean
>);
const saved = reactive<Record<SeasonalAwardId, boolean>>({} as Record<
  SeasonalAwardId,
  boolean
>);

const league = computed(
  () => store.leagueInfo[store.currentLeagueIndex] || undefined
);

const formatTeamName = (user: any) => {
  if (!user) return "Unknown team";
  if (store.showUsernames) {
    return user.username || user.name || "Unknown team";
  }
  return user.name || user.username || "Unknown team";
};

const ownerOptions = computed(() => {
  if (!league.value?.users?.length) return [];
  const names = league.value.users.map((user: any) => ({
    id: user.id,
    label: formatTeamName(user),
  }));
  return names.sort((a, b) => a.label.localeCompare(b.label));
});

const fallbackLabel: Record<SeasonalAwardId, string> = {
  "award-i": "Award I",
  "award-ii": "Award II",
  "award-iii": "Award III",
  "award-iv": "Award IV",
  "award-v": "Award V",
};

const hydrateForm = () => {
  awardsStore.awards.forEach((award) => {
    const id = award.id as SeasonalAwardId;
    formState[id] = { ...award };
    rowErrors[id] = [];
    saving[id] = false;
    saved[id] = false;
  });
};

watch(
  () => awardsStore.awards,
  () => hydrateForm(),
  { immediate: true, deep: true }
);

const normalizeAward = (award: SeasonalAward) => ({
  ...award,
  title: (award.title || "").trim(),
  informalLabel: (award.informalLabel || "").trim(),
  definition: (award.definition || "").trim(),
  winnerOwnerId: award.winnerOwnerId || null,
  winnerNameOverride: award.winnerNameOverride?.trim() || null,
});

const validateAward = (award: SeasonalAward) => {
  const errors: string[] = [];
  if (!award.title.trim()) errors.push("Title is required.");
  if (award.informalLabel && award.informalLabel.length > 120) {
    errors.push("Informal label is too long (max 120 characters).");
  }
  if (award.definition && award.definition.length > 500) {
    errors.push("Definition is too long (max 500 characters).");
  }
  return errors;
};

const isDirty = (award: SeasonalAward) => {
  const savedAward = awardsStore.awards.find((item) => item.id === award.id);
  if (!savedAward) return true;
  return (
    JSON.stringify(normalizeAward(savedAward)) !==
    JSON.stringify(normalizeAward(award))
  );
};

const handleSave = async (id: SeasonalAwardId) => {
  const current = normalizeAward(formState[id]);
  const errors = validateAward(current);
  rowErrors[id] = errors;
  if (errors.length) return;
  saving[id] = true;
  saved[id] = false;
  awardsStore.updateAward(id, current);
  await awardsStore.saveAll(awardsStore.awards);
  saved[id] = true;
  saving[id] = false;
  setTimeout(() => {
    saved[id] = false;
  }, 1800);
};

const handleSaveAll = async () => {
  const invalid = awardsStore.awards
    .map((award) => {
      const normalized = normalizeAward(formState[award.id]);
      const errors = validateAward(normalized);
      rowErrors[award.id] = errors;
      return { id: award.id as SeasonalAwardId, normalized, errors };
    })
    .filter((item) => item.errors.length);
  if (invalid.length) return;
  const next = awardsStore.awards.map((award) => normalizeAward(formState[award.id]));
  await awardsStore.saveAll(next);
  Object.keys(saved).forEach((key) => {
    saved[key as SeasonalAwardId] = true;
    setTimeout(() => {
      saved[key as SeasonalAwardId] = false;
    }, 1800);
  });
};

const handleReset = () => {
  awardsStore.resetAwards();
  awardsStore.saveAll(awardsStore.awards);
};

const pendingOwnerLabel = computed(() =>
  ownerOptions.value.length ? "Select an owner" : "Winner (free text allowed)"
);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDefinition = (value: string) => {
  const escaped = escapeHtml(value || "");
  return escaped.replace(/\*(.*?)\*/g, "<em>$1</em>");
};

const hydrate = async () => {
  if (!awardsStore.initialized) {
    await awardsStore.hydrateFromApi();
  }
  hydrateForm();
};

onMounted(() => {
  hydrate();
});
</script>

<template>
  <div class="container w-11/12 max-w-screen-xl mx-auto py-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-semibold tracking-wide uppercase text-gray-500">
          Admin
        </p>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Seasonal Awards Manager
        </h1>
        <p class="text-sm text-gray-600 dark:text-gray-200">
          Edit award titles, informal labels, tooltip definitions, and winners for Award I–V.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          @click="handleReset"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="awardsStore.loading"
          @click="handleSaveAll"
        >
          <span v-if="awardsStore.loading">Saving…</span>
          <span v-else>Save all</span>
        </button>
      </div>
    </div>

    <div
      v-if="!awardsStore.adminEnabled"
      class="p-4 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg dark:bg-gray-900 dark:text-amber-200 dark:border-amber-800"
    >
      Admin awards editing is currently disabled. Set
      <code class="px-1 py-0.5 text-xs bg-gray-100 rounded dark:bg-gray-800">VITE_ENABLE_ADMIN_AWARDS=true</code>
      to enable it.
    </div>

    <div
      v-if="awardsStore.error"
      class="p-4 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg dark:bg-gray-900 dark:text-amber-200 dark:border-amber-800"
    >
      {{ awardsStore.error }}
    </div>

    <div v-if="awardsStore.adminEnabled" class="grid gap-4 mt-4">
      <div
        v-for="award in awardsStore.awards"
        :key="award.id"
        class="overflow-hidden border border-gray-200 rounded-xl shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {{ formState[award.id]?.title || fallbackLabel[award.id] }}
            </p>
              <p class="text-xs text-gray-500 dark:text-gray-300">
                {{ formState[award.id]?.informalLabel || "Add an informal label to show alongside the title." }}
              </p>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <span class="px-2 py-1 font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-100">
              {{ formState[award.id]?.amount ? `$${formState[award.id]?.amount}` : "$—" }}
            </span>
            <span
              v-if="isDirty(formState[award.id])"
              class="px-2 py-1 font-semibold text-amber-800 bg-amber-100 rounded-full dark:bg-amber-900 dark:text-amber-100"
            >
              Unsaved
            </span>
            <span
              v-else-if="saved[award.id]"
              class="px-2 py-1 font-semibold text-emerald-800 bg-emerald-100 rounded-full dark:bg-emerald-900 dark:text-emerald-100"
            >
              Saved
            </span>
          </div>
        </div>

        <div class="p-4 space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                Title
              </label>
              <input
                v-model="formState[award.id].title"
                type="text"
                maxlength="60"
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                placeholder="Award title (e.g., Very Stable Genius)"
              />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                Informal label
              </label>
              <input
                v-model="formState[award.id].informalLabel"
                type="text"
                maxlength="120"
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                placeholder="Shown next to the title (e.g., Most Impressive Draft)"
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
              Definition / tooltip copy
            </label>
            <textarea
              v-model="formState[award.id].definition"
              rows="4"
              maxlength="500"
              class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm resize-none dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
              placeholder="Definition shown on hover. Markdown italics supported."
            />
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ formState[award.id].definition?.length || 0 }}/500 characters
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                Winner
              </label>
              <select
                v-model="formState[award.id].winnerOwnerId"
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
              >
                <option :value="null">Pending</option>
                <option v-for="owner in ownerOptions" :key="owner.id" :value="owner.id">
                  {{ owner.label }}
                </option>
              </select>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ pendingOwnerLabel }}
              </p>
            </div>
            <div class="space-y-2">
              <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                Custom winner label (fallback)
              </label>
              <input
                v-model="formState[award.id].winnerNameOverride"
                type="text"
                maxlength="120"
                class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                placeholder="Use if the owner list is empty or needs a custom label."
              />
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Used when an owner is not selected.
              </p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <p class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                Tooltip preview
              </p>
              <div class="p-3 border border-dashed border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                  {{ formState[award.id].title || fallbackLabel[award.id] }}
                  <span
                    v-if="formState[award.id].informalLabel"
                    class="ml-1 text-xs font-normal text-gray-500 dark:text-gray-300"
                  >
                    ({{ formState[award.id].informalLabel }})
                  </span>
                </p>
                <p
                  class="mt-1 text-xs text-gray-600 dark:text-gray-300"
                  v-html="formState[award.id].definition ? formatDefinition(formState[award.id].definition) : 'Hover text will appear here.'"
                />
              </div>
            </div>
            <div class="flex flex-col justify-between gap-2 md:items-end">
              <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-100">
                  Amount: ${{ formState[award.id].amount }}
                </span>
                <span class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-100">
                  ID: {{ award.id }}
                </span>
              </div>
              <div class="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  class="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  @click="formState[award.id] = { ...award }"
                >
                  Revert changes
                </button>
                <button
                  type="button"
                  class="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="!isDirty(formState[award.id]) || saving[award.id]"
                  @click="handleSave(award.id)"
                >
                  <span v-if="saving[award.id]">Saving…</span>
                  <span v-else>Save</span>
                </button>
              </div>
              <ul v-if="rowErrors[award.id]?.length" class="pl-5 text-xs text-red-600 list-disc dark:text-red-400">
                <li v-for="error in rowErrors[award.id]" :key="error">
                  {{ error }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
