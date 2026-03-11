import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { authenticatedFetch } from "@/lib/authFetch";
import { useAuthStore } from "@/store/auth";
import { toast } from "vue-sonner";

export type SubscriptionStatusResponse = {
  isPremium: boolean;
  status: string;
  planType: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelDate: string | null;
  seasonPassExpiresAt: string | null;
  canManageSubscription: boolean;
};

type SubscriptionStatusCache = SubscriptionStatusResponse & {
  cachedAt: number;
};

type FetchSubscriptionStatusOptions = {
  showLoading?: boolean;
  showErrorToast?: boolean;
};

const SUBSCRIPTION_CACHE_KEY_PREFIX = "subscription-status";
const SUBSCRIPTION_CACHE_TTL_MS = 5 * 60 * 1000;

export const useSubscriptionStore = defineStore("subscription", () => {
  const authStore = useAuthStore();

  const loading = ref(false);
  const isPremium = ref(false);
  const status = ref("none");
  const planType = ref<string | null>(null);
  const currentPeriodEnd = ref<string | null>(null);
  const trialEnd = ref<string | null>(null);
  const cancelAtPeriodEnd = ref(false);
  const cancelDate = ref<string | null>(null);
  const seasonPassExpiresAt = ref<string | null>(null);
  const canManageSubscription = ref(false);
  const initialized = ref(false);

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
    /\/$/,
    ""
  );
  const billingApiPath = `${backendBaseUrl}/api/billing/subscriptionStatus`;

  const getCacheKey = (userId = authStore.user?.id) => {
    if (!userId) return null;
    return `${SUBSCRIPTION_CACHE_KEY_PREFIX}:${userId}`;
  };

  const applySubscriptionStatus = (payload: SubscriptionStatusResponse) => {
    isPremium.value = payload.isPremium;
    status.value = payload.status;
    planType.value = payload.planType;
    currentPeriodEnd.value = payload.currentPeriodEnd;
    trialEnd.value = payload.trialEnd;
    cancelAtPeriodEnd.value = payload.cancelAtPeriodEnd;
    cancelDate.value = payload.cancelDate;
    seasonPassExpiresAt.value = payload.seasonPassExpiresAt;
    canManageSubscription.value = payload.canManageSubscription;
  };

  const resetSubscriptionState = () => {
    isPremium.value = false;
    status.value = "none";
    planType.value = null;
    currentPeriodEnd.value = null;
    trialEnd.value = null;
    cancelAtPeriodEnd.value = false;
    cancelDate.value = null;
    seasonPassExpiresAt.value = null;
    canManageSubscription.value = false;
  };

  const saveSubscriptionStatusCache = (payload: SubscriptionStatusResponse) => {
    const key = getCacheKey();
    if (!key) return;

    const cachePayload: SubscriptionStatusCache = {
      ...payload,
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cachePayload));
  };

  const clearSubscriptionStatusCache = (userId?: string) => {
    const key = getCacheKey(userId);
    if (key) {
      localStorage.removeItem(key);
      return;
    }

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const localStorageKey = localStorage.key(i);
      if (localStorageKey?.startsWith(`${SUBSCRIPTION_CACHE_KEY_PREFIX}:`)) {
        localStorage.removeItem(localStorageKey);
      }
    }
  };

  const hydrateFromCache = () => {
    const key = getCacheKey();
    if (!key) return false;

    const rawCache = localStorage.getItem(key);
    if (!rawCache) return false;

    try {
      const cachePayload = JSON.parse(rawCache) as SubscriptionStatusCache;
      if (
        !cachePayload.cachedAt ||
        Date.now() - cachePayload.cachedAt > SUBSCRIPTION_CACHE_TTL_MS
      ) {
        localStorage.removeItem(key);
        return false;
      }

      applySubscriptionStatus(cachePayload);
      return true;
    } catch {
      localStorage.removeItem(key);
      return false;
    }
  };

  const fetchSubscriptionStatus = async ({
    showLoading = true,
    showErrorToast = false,
  }: FetchSubscriptionStatusOptions = {}) => {
    if (!authStore.isAuthenticated) return;

    if (showLoading) {
      loading.value = true;
    }

    try {
      const response = await authenticatedFetch(billingApiPath);
      if (!response.ok) {
        if (response.status === 401) {
          clearSubscriptionStatusCache();
          resetSubscriptionState();
          return;
        }
        throw new Error("Unable to fetch subscription status");
      }
      const payload = (await response.json()) as SubscriptionStatusResponse;
      applySubscriptionStatus(payload);
      saveSubscriptionStatusCache(payload);
    } catch (error: unknown) {
      if (showErrorToast) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to fetch subscription status";
        toast.error(message);
      }
    } finally {
      if (showLoading) {
        loading.value = false;
      }
    }
  };

  const initialize = () => {
    if (initialized.value) return;
    initialized.value = true;

    watch(
      () => authStore.isAuthenticated,
      async (isAuthenticated) => {
        if (isAuthenticated) {
          const hydratedFromCache = hydrateFromCache();
          await fetchSubscriptionStatus({ showLoading: !hydratedFromCache });
          return;
        }

        clearSubscriptionStatusCache();
        resetSubscriptionState();
      },
      { immediate: true }
    );
  };

  return {
    loading,
    isPremium,
    status,
    planType,
    currentPeriodEnd,
    trialEnd,
    cancelAtPeriodEnd,
    cancelDate,
    seasonPassExpiresAt,
    initialized,
    canManageSubscription,
    initialize,
    fetchSubscriptionStatus,
    resetSubscriptionState,
    clearSubscriptionStatusCache,
  };
});
