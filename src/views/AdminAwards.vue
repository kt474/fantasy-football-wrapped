<script setup lang="ts">
import { computed, onMounted, reactive, watch } from "vue";
import { useAwardsStore } from "../store/awards";
import { useWeeklyBonusStore } from "../store/weeklyBonuses";
import { useStore } from "../store/store";
import type { SeasonalAward, SeasonalAwardId, WeeklyBonus } from "../types/types";

const awardsStore = useAwardsStore();
const weeklyBonusStore = useWeeklyBonusStore();
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

const playoffForm = reactive<Record<number, WeeklyBonus>>({} as Record<number, WeeklyBonus>);
const playoffErrors = reactive<Record<number, string[]>>({} as Record<number, string[]>);
const playoffSaving = reactive<Record<number, boolean>>({} as Record<number, boolean>);
const playoffSaved = reactive<Record<number, boolean>>({} as Record<number, boolean>);

const hydratePlayoffForm = () => {
  weeklyBonusStore.bonuses.forEach((bonus) => {
    playoffForm[bonus.week] = { ...bonus };
    playoffErrors[bonus.week] = [];
    playoffSaving[bonus.week] = false;
    playoffSaved[bonus.week] = false;
  });
};

watch(
  () => weeklyBonusStore.bonuses,
  () => hydratePlayoffForm(),
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

const normalizeBonus = (bonus: WeeklyBonus) => {
  const rawScore = (bonus as any).score;
  const parsedScore =
    rawScore === null || rawScore === undefined || rawScore === ""
      ? null
      : Number(rawScore);

  return {
    ...bonus,
    label: (bonus.label || "").trim(),
    note: bonus.note?.trim() || "",
    winnerOwnerId: bonus.winnerOwnerId || null,
    winnerNameOverride: bonus.winnerNameOverride?.trim() || null,
    score: Number.isNaN(parsedScore) ? null : parsedScore,
    amount: bonus.amount ?? 15,
  };
};

const validateBonus = (bonus: WeeklyBonus) => {
  const errors: string[] = [];
  if (!bonus.label.trim()) errors.push("Label is required.");
  if (bonus.score !== null && Number.isNaN(Number(bonus.score))) {
    errors.push("Score must be a number (or leave blank).");
  }
  return errors;
};

const isPlayoffDirty = (bonus: WeeklyBonus) => {
  const saved = weeklyBonusStore.bonuses.find((item) => item.week === bonus.week);
  if (!saved) return true;
  return (
    JSON.stringify(normalizeBonus(saved)) !==
    JSON.stringify(normalizeBonus(bonus))
  );
};

const handleSavePlayoff = async (week: number) => {
  const current = normalizeBonus(playoffForm[week]);
  const errors = validateBonus(current);
  playoffErrors[week] = errors;
  if (errors.length) return;
  playoffSaving[week] = true;
  playoffSaved[week] = false;
  weeklyBonusStore.updateBonus(week, current);
  await weeklyBonusStore.saveAll(weeklyBonusStore.bonuses);
  playoffSaved[week] = true;
  playoffSaving[week] = false;
  setTimeout(() => {
    playoffSaved[week] = false;
  }, 1800);
};

const handleSaveAllPlayoff = async () => {
  const invalid = weeklyBonusStore.bonuses
    .map((bonus) => {
      const normalized = normalizeBonus(playoffForm[bonus.week]);
      const errors = validateBonus(normalized);
      playoffErrors[bonus.week] = errors;
      return { week: bonus.week, normalized, errors };
    })
    .filter((item) => item.errors.length);
  if (invalid.length) return;
  const next = weeklyBonusStore.bonuses.map((bonus) =>
    normalizeBonus(playoffForm[bonus.week])
  );
  await weeklyBonusStore.saveAll(next);
  Object.keys(playoffSaved).forEach((key) => {
    playoffSaved[Number(key)] = true;
    setTimeout(() => {
      playoffSaved[Number(key)] = false;
    }, 1800);
  });
};

const handleResetPlayoff = () => {
  weeklyBonusStore.resetBonuses();
  weeklyBonusStore.saveAll(weeklyBonusStore.bonuses);
};

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

const restoreLeagueContext = () => {
  if (typeof localStorage === "undefined") return;
  if (store.leagueInfo.length === 0 && localStorage.leagueInfo) {
    try {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      if (Array.isArray(savedLeagues)) {
        savedLeagues.forEach((leagueData: any) => store.updateLeagueInfo(leagueData));
      }
    } catch (error) {
      console.error("Failed to parse saved leagues", error);
    }
  }
  if (!store.currentLeagueId && localStorage.currentLeagueId && localStorage.currentLeagueId !== "undefined") {
    store.updateCurrentLeagueId(localStorage.currentLeagueId);
  }
};

const hydrate = async () => {
  if (!awardsStore.initialized) {
    await awardsStore.hydrateFromApi();
  }
  if (!weeklyBonusStore.initialized) {
    await weeklyBonusStore.hydrateFromApi();
  }
  hydrateForm();
  hydratePlayoffForm();
};

onMounted(() => {
  restoreLeagueContext();
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

    <div
      v-if="weeklyBonusStore.error"
      class="p-4 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg dark:bg-gray-900 dark:text-amber-200 dark:border-amber-800"
    >
      {{ weeklyBonusStore.error }}
    </div>

    <div
      v-if="weeklyBonusStore.adminEnabled"
      class="p-4 mt-6 border border-gray-200 rounded-xl shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700"
    >
      <div class="flex flex-col gap-3 border-b border-gray-100 dark:border-gray-800 pb-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
            Playoff weekly bonuses (Weeks 15–17)
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-300">
            Manual entries for playoff high score bonuses. Amounts fixed at $15.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            :disabled="weeklyBonusStore.loading"
            @click="handleResetPlayoff"
          >
            Reset playoff rows
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="weeklyBonusStore.loading"
            @click="handleSaveAllPlayoff"
          >
            <span v-if="weeklyBonusStore.loading">Saving…</span>
            <span v-else>Save all playoff rows</span>
          </button>
        </div>
      </div>

      <div class="grid gap-4 mt-4">
        <div
          v-for="bonus in weeklyBonusStore.bonuses"
          :key="bonus.week"
          class="overflow-hidden border border-gray-100 rounded-lg dark:border-gray-800"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Week {{ bonus.week }} — {{ playoffForm[bonus.week]?.label || bonus.label }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-300">
                {{ playoffForm[bonus.week]?.note || bonus.note || "Manual entry" }}
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs">
              <span class="px-2 py-1 font-semibold text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-100">
                ${{ bonus.amount || 15 }}
              </span>
              <span
                v-if="isPlayoffDirty(playoffForm[bonus.week])"
                class="px-2 py-1 font-semibold text-amber-800 bg-amber-100 rounded-full dark:bg-amber-900 dark:text-amber-100"
              >
                Unsaved
              </span>
              <span
                v-else-if="playoffSaved[bonus.week]"
                class="px-2 py-1 font-semibold text-emerald-800 bg-emerald-100 rounded-full dark:bg-emerald-900 dark:text-emerald-100"
              >
                Saved
              </span>
            </div>
          </div>

          <div class="p-4 space-y-3 bg-white dark:bg-gray-900">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                  Winner
                </label>
                <select
                  v-model="playoffForm[bonus.week].winnerOwnerId"
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
                  v-model="playoffForm[bonus.week].winnerNameOverride"
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
                <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                  Bonus label
                </label>
                <input
                  v-model="playoffForm[bonus.week].label"
                  type="text"
                  maxlength="160"
                  class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                  placeholder="e.g., Highest score, non-playoff matchups"
                />
              </div>
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                  Note (optional)
                </label>
                <input
                  v-model="playoffForm[bonus.week].note"
                  type="text"
                  maxlength="200"
                  class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                  placeholder="Rules or clarifications (e.g., starter only)."
                />
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-xs font-semibold text-gray-600 uppercase dark:text-gray-300">
                  Score (optional)
                </label>
                <input
                  v-model.number="playoffForm[bonus.week].score"
                  type="number"
                  step="0.01"
                  class="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:text-gray-50 dark:border-gray-700"
                  placeholder="Enter the winning score (or leave blank)"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  For Week 15 use team score; Weeks 16–17 use player score.
                </p>
              </div>
              <div class="flex flex-col justify-end gap-2 md:items-end">
                <div class="flex flex-wrap gap-2">
                  <span class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-100">
                    Amount: ${{ bonus.amount || 15 }}
                  </span>
                  <span class="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-100">
                    Week: {{ bonus.week }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 md:justify-end">
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                    @click="playoffForm[bonus.week] = { ...bonus }"
                  >
                    Revert changes
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="!isPlayoffDirty(playoffForm[bonus.week]) || playoffSaving[bonus.week]"
                    @click="handleSavePlayoff(bonus.week)"
                  >
                    <span v-if="playoffSaving[bonus.week]">Saving…</span>
                    <span v-else>Save</span>
                  </button>
                </div>
                <ul v-if="playoffErrors[bonus.week]?.length" class="pl-5 text-xs text-red-600 list-disc dark:text-red-400">
                  <li v-for="error in playoffErrors[bonus.week]" :key="error">
                    {{ error }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
