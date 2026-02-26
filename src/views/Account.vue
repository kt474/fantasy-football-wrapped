<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useStore } from "@/store/store";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import { authenticatedFetch } from "@/lib/authFetch";
import { LeagueInfoType } from "../types/types";
import { getData, getLeague, inputLeague } from "../api/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Check } from "lucide-vue-next";
import upperCase from "lodash/upperCase";

type SubscriptionStatusResponse = {
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelDate: string | null;
};

type SubscriptionStatusCache = SubscriptionStatusResponse & {
  cachedAt: number;
};

const store = useStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const showLogin = ref(true);
const signInEmail = ref("");
const signInPassword = ref("");
const signUpEmail = ref("");
const signUpPassword = ref("");
const checkoutLoading = ref(false);
const portalLoading = ref(false);
const subscriptionLoading = ref(false);
const isPremium = ref(false);
const subscriptionStatus = ref("none");
const currentPeriodEnd = ref<string | null>(null);
const cancelDate = ref<string | null>(null);
const cancelAtPeriodEnd = ref(false);

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const billingApiPath = `${backendBaseUrl}/api/billing/subscriptionStatus`;
const checkoutApiPath = `${backendBaseUrl}/api/stripe/createCheckoutSession`;
const portalApiPath = `${backendBaseUrl}/api/stripe/createPortalSession`;
const subscriptionCacheKeyPrefix = "subscription-status";
const subscriptionCacheTtlMs = 5 * 60 * 1000;

const subscriptionStatusLabel = computed(() => {
  if (subscriptionLoading.value) return "Loading...";
  if (subscriptionStatus.value === "none") return "Not subscribed";
  if (cancelDate.value) {
    return `Active: service has been canceled and will end on ${new Date(cancelDate.value).toLocaleDateString()}`;
  }
  return upperCase(subscriptionStatus.value);
});

const getCheckoutButtonText = computed(() => {
  if (checkoutLoading.value) return "Redirecting...";
  return "Start 7-day free trial";
});

const canManageSubscription = computed(() => {
  return authStore.isAuthenticated && subscriptionStatus.value !== "none";
});

const getSubscriptionCacheKey = (userId = authStore.user?.id) => {
  if (!userId) return null;
  return `${subscriptionCacheKeyPrefix}:${userId}`;
};

const applySubscriptionStatus = (payload: SubscriptionStatusResponse) => {
  isPremium.value = payload.isPremium;
  subscriptionStatus.value = payload.status;
  currentPeriodEnd.value = payload.currentPeriodEnd;
  cancelAtPeriodEnd.value = payload.cancelAtPeriodEnd;
  cancelDate.value = payload.cancelDate;
};

const saveSubscriptionStatusCache = (payload: SubscriptionStatusResponse) => {
  const key = getSubscriptionCacheKey();
  if (!key) return;

  const cachePayload: SubscriptionStatusCache = {
    ...payload,
    cachedAt: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(cachePayload));
};

const clearSubscriptionStatusCache = (userId?: string) => {
  const key = getSubscriptionCacheKey(userId);
  if (key) {
    localStorage.removeItem(key);
    return;
  }

  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const localStorageKey = localStorage.key(i);
    if (localStorageKey?.startsWith(`${subscriptionCacheKeyPrefix}:`)) {
      localStorage.removeItem(localStorageKey);
    }
  }
};

const hydrateSubscriptionFromCache = () => {
  const key = getSubscriptionCacheKey();
  if (!key) return false;

  const rawCache = localStorage.getItem(key);
  if (!rawCache) return false;

  try {
    const cachePayload = JSON.parse(rawCache) as SubscriptionStatusCache;
    if (
      !cachePayload.cachedAt ||
      Date.now() - cachePayload.cachedAt > subscriptionCacheTtlMs
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

const resetSignInForm = () => {
  signInEmail.value = "";
  signInPassword.value = "";
};

const resetSignUpForm = () => {
  signUpEmail.value = "";
  signUpPassword.value = "";
};

const signIn = async () => {
  if (signInEmail.value === "" || signInPassword.value === "") {
    toast.error("Please enter an email and password.");
  } else
    try {
      await authStore.signInWithPassword(
        signInEmail.value,
        signInPassword.value
      );
      toast.success("Signed in");
      resetSignInForm();
    } catch (error: any) {
      toast.error(`Unable to sign in. ${error?.message}`);
    }
};

const signUp = async () => {
  if (signUpEmail.value === "" || signUpPassword.value === "") {
    toast.error("Please enter an email and password.");
  } else
    try {
      await authStore.signUpWithPassword(
        signUpEmail.value,
        signUpPassword.value
      );
      toast.success("Account created. Check your email for confirmation.");
      resetSignUpForm();
    } catch (error: any) {
      toast.error(`Unable to create account. ${error?.message}`);
    }
};

const signOut = async () => {
  const currentUserId = authStore.user?.id;
  try {
    await authStore.signOut();
    toast.success("Signed out");
    clearSubscriptionStatusCache(currentUserId);
    isPremium.value = false;
    subscriptionStatus.value = "none";
    currentPeriodEnd.value = null;
    cancelDate.value = null;
    cancelAtPeriodEnd.value = false;
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign out");
  }
};

const fetchSubscriptionStatus = async ({ showLoading = true } = {}) => {
  if (!authStore.isAuthenticated) return;

  if (showLoading) {
    subscriptionLoading.value = true;
  }

  try {
    const response = await authenticatedFetch(billingApiPath);
    if (!response.ok) {
      if (response.status === 401) {
        clearSubscriptionStatusCache();
        subscriptionStatus.value = "none";
        isPremium.value = false;
        return;
      }
      throw new Error("Unable to fetch subscription status");
    }
    const payload = (await response.json()) as SubscriptionStatusResponse;
    applySubscriptionStatus(payload);
    saveSubscriptionStatusCache(payload);
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to fetch subscription status");
  } finally {
    if (showLoading) {
      subscriptionLoading.value = false;
    }
  }
};

const startCheckout = async () => {
  if (!authStore.isAuthenticated) {
    toast.error("Please sign in before starting a trial.");
    return;
  }

  checkoutLoading.value = true;
  try {
    const response = await authenticatedFetch(checkoutApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to start checkout");
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      throw new Error("Missing checkout url");
    }
    window.location.assign(payload.url);
  } catch (error: any) {
    checkoutLoading.value = false;
    toast.error(error?.message ?? "Unable to start checkout");
  }
};

const openBillingPortal = async () => {
  if (!canManageSubscription.value) {
    toast.error("No subscription found to manage.");
    return;
  }

  portalLoading.value = true;
  try {
    const response = await authenticatedFetch(portalApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to open billing portal");
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      throw new Error("Missing billing portal url");
    }
    window.location.assign(payload.url);
  } catch (error: any) {
    portalLoading.value = false;
    toast.error(error?.message ?? "Unable to open billing portal");
  }
};

const handleCheckoutQuery = async () => {
  const checkoutState = route.query.checkout;

  if (checkoutState === "success") {
    toast.success("Checkout completed. Refreshing subscription status...");
    await fetchSubscriptionStatus();
  } else if (checkoutState === "canceled") {
    toast.error("Checkout canceled.");
  }

  if (checkoutState) {
    const newQuery = { ...route.query };
    delete newQuery.checkout;
    delete newQuery.session_id;
    router.replace({ path: route.path, query: newQuery });
  }
};

const loadSavedLeagues = async () => {
  try {
    if (localStorage.leagueInfo) {
      const savedLeagues = JSON.parse(localStorage.leagueInfo);
      await Promise.all(
        savedLeagues.map(async (league: LeagueInfoType) => {
          if (!store.leagueIds.includes(league.leagueId)) {
            store.updateLeagueInfo(league);
          }
        })
      );
      store.updateCurrentLeagueId(localStorage.currentLeagueId);
      store.updateLoadingLeague("");
    }
    const leagueId = Array.isArray(route.query.leagueId)
      ? route.query.leagueId[0]
      : route.query.leagueId;
    // sometimes on refresh the leagueId in the URL becomes undefined
    if (leagueId && !store.leagueIds.includes(leagueId)) {
      const checkInput = await getLeague(leagueId);
      if (checkInput["name"]) {
        store.updateCurrentLeagueId(leagueId);
        store.updateLoadingLeague(checkInput["name"]);
        const league = await getData(leagueId);
        store.updateLeagueInfo(league);
        await inputLeague(
          leagueId,
          league.name,
          league.totalRosters,
          league.seasonType,
          league.season
        );
        store.updateLoadingLeague("");
      } else {
        toast.error("Invalid League ID");
      }
    }
  } catch {
    toast.error("Error fetching data. Please try refreshing the page.");
  }
};

onMounted(async () => {
  await loadSavedLeagues();
  await handleCheckoutQuery();
  const hydratedFromCache = hydrateSubscriptionFromCache();
  await fetchSubscriptionStatus({ showLoading: !hydratedFromCache });
});

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      const hydratedFromCache = hydrateSubscriptionFromCache();
      await fetchSubscriptionStatus({ showLoading: !hydratedFromCache });
      return;
    }
    clearSubscriptionStatusCache();
    isPremium.value = false;
    subscriptionStatus.value = "none";
    currentPeriodEnd.value = null;
    cancelDate.value = null;
    cancelAtPeriodEnd.value = false;
  }
);
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto">
    <div class="container mx-auto mt-4">
      <h1 class="mb-4 text-3xl font-semibold">Account</h1>
      <div v-if="!authStore.isAuthenticated">
        <Card v-if="showLogin" class="max-w-sm">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Enter your information below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel for="email"> Email </FieldLabel>
                <Input
                  v-model="signUpEmail"
                  type="email"
                  placeholder="Email"
                  autocomplete="email"
                />
              </Field>
              <Field>
                <FieldLabel for="password"> Password </FieldLabel>
                <Input
                  v-model="signUpPassword"
                  type="password"
                  placeholder="Password"
                  autocomplete="new-password"
                />
              </Field>
              <FieldGroup>
                <Field>
                  <Button @click="signUp"> Create Account </Button>
                  <FieldDescription class="px-6 text-center">
                    Already have an account?
                    <a class="cursor-pointer" @click="showLogin = !showLogin"
                      >Sign in</a
                    >
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card v-else class="max-w-sm">
          <CardHeader>
            <CardTitle>Login to your account</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel for="email"> Email </FieldLabel>
                <Input
                  v-model="signInEmail"
                  type="email"
                  placeholder="Email"
                  autocomplete="email"
                />
              </Field>
              <Field>
                <div class="flex items-center">
                  <FieldLabel for="password"> Password </FieldLabel>
                  <!-- <a
                      href="#"
                      class="inline-block ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a> -->
                </div>
                <Input
                  v-model="signInPassword"
                  type="password"
                  placeholder="Password"
                  autocomplete="current-password"
                />
              </Field>
              <Field>
                <Button @click="signIn"> Login </Button>
                <FieldDescription class="text-center">
                  Don't have an account?
                  <a class="cursor-pointer" @click="showLogin = !showLogin"
                    >Sign up</a
                  >
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div v-else>
        <p class="text-muted-foreground">
          Email:
          <span class="font-medium text-foreground">{{
            authStore.user?.email
          }}</span>
        </p>
        <p class="text-muted-foreground">
          Subscription Status:
          <span class="font-medium text-foreground">{{
            subscriptionStatusLabel
          }}</span>
        </p>
        <Button
          class="mt-3"
          :disabled="authStore.loading"
          variant="outline"
          size="sm"
          @click="signOut"
        >
          Sign out
        </Button>
        <Button
          @click="openBillingPortal"
          v-if="isPremium"
          :disabled="authStore.loading || portalLoading"
          class="ml-2"
          size="sm"
        >
          {{ "Manage subscription" }}
        </Button>
      </div>
      <Card
        v-if="authStore.isAuthenticated && !isPremium && !subscriptionLoading"
        class="max-w-sm mt-6"
      >
        <CardHeader>
          <CardTitle>Premium</CardTitle>
          <CardDescription>
            Smarter weekly league recaps, built for your league context.
          </CardDescription>
        </CardHeader>
        <CardContent class="text-sm">
          <div>
            <p class="text-5xl font-medium">
              $2.99
              <span class="-ml-2 text-base font-normal text-muted-foreground"
                >/month</span
              >
            </p>
            <Button class="w-full my-7" @click="startCheckout">
              {{ getCheckoutButtonText }}
            </Button>
          </div>
          <div>
            <p class="mb-3">What's included:</p>
            <div>
              <div class="flex align-middle">
                <Check :size="20" class="mr-2" />
                <p class="text-muted-foreground">
                  More detailed, customizable weekly recaps
                </p>
              </div>
              <div class="flex align-middle">
                <Check :size="20" class="mr-2" />
                <p class="text-muted-foreground">
                  Access to all future premium features
                </p>
              </div>
              <div class="flex align-middle">
                <Check :size="20" class="mr-2" />
                <p class="text-muted-foreground">Cancel anytime</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
