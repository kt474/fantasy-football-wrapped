import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { trackEvent } from "@/lib/analytics";
import type { HistoryLoadFailure, HistoryLoadStatus } from "@/lib/historyLoad";
import {
  getLeagueHistoryKey,
  getLoadedHistoryCount,
  loadPreviousLeagueHistory,
} from "@/lib/leagueHistoryLoader";
import {
  createLatestRequestGuard,
  isRequestCancellation,
} from "@/lib/request";
import { useStore } from "@/store/store";

export const useLeagueHistory = () => {
  const store = useStore();
  const isLoading = ref(false);
  const loadingYear = ref("");
  const failures = ref<HistoryLoadFailure[]>([]);
  const total = ref<number | null>(0);
  const settled = ref(false);
  const loadSucceeded = ref(false);
  const requests = createLatestRequestGuard();

  const load = async (retryFailures?: HistoryLoadFailure[]) => {
    const league = store.currentLeague;
    if (!league) {
      loadSucceeded.value = true;
      settled.value = true;
      return;
    }

    const controller = requests.start();
    const leagueKey = getLeagueHistoryKey(league);
    isLoading.value = true;
    settled.value = false;
    loadSucceeded.value = false;
    failures.value = [];
    loadingYear.value = "";

    try {
      const result = await loadPreviousLeagueHistory(league, {
        signal: controller.signal,
        retryFailures,
        onLoadingSeason: (season) => {
          loadingYear.value = season;
        },
      });
      if (!requests.isActive(controller)) return;

      failures.value = result.failures;
      total.value = result.total;
      if (result.failures.length > 0) {
        trackEvent("League History Load Failed", {
          platform: league.platform === "espn" ? "espn" : "sleeper",
          failure_count: result.failures.length,
          loaded_seasons: getLoadedHistoryCount(league),
        });
      }
      loadSucceeded.value = true;
    } catch (error) {
      if (!isRequestCancellation(error)) {
        console.error(`Failed to load history for ${leagueKey}:`, error);
      }
    } finally {
      if (requests.finish(controller)) {
        isLoading.value = false;
        loadingYear.value = "";
        settled.value = true;
      }
    }
  };

  const status = computed<HistoryLoadStatus>(() => {
    const league = store.currentLeague;
    return {
      leagueKey: league ? getLeagueHistoryKey(league) : "",
      loading: isLoading.value,
      settled: settled.value,
      complete:
        settled.value && loadSucceeded.value && failures.value.length === 0,
      loaded: league ? getLoadedHistoryCount(league) : 0,
      total: total.value,
      loadingSeason: loadingYear.value,
      failures: failures.value,
    };
  });

  onMounted(() => void load());
  watch(
    () => store.currentLeagueId,
    () => void load()
  );
  onBeforeUnmount(() => requests.cancel());

  return {
    isLoading,
    loadingYear,
    status,
    reload: load,
  };
};
