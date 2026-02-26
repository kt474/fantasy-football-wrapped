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
  CardFooter,
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

type SubscriptionStatusResponse = {
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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
const cancelAtPeriodEnd = ref(false);

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const billingApiPath = `${backendBaseUrl}/api/billing/subscriptionStatus`;
const checkoutApiPath = `${backendBaseUrl}/api/stripe/createCheckoutSession`;
const portalApiPath = `${backendBaseUrl}/api/stripe/createPortalSession`;

const subscriptionStatusLabel = computed(() => {
  if (subscriptionStatus.value === "none") return "Not subscribed";
  return subscriptionStatus.value;
});

const getCheckoutButtonText = computed(() => {
  if (checkoutLoading.value) return "Redirecting...";
  if (isPremium.value) return "Subscription active";
  return "Start 7-day free trial";
});

const canManageSubscription = computed(() => {
  return authStore.isAuthenticated && subscriptionStatus.value !== "none";
});

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
  try {
    await authStore.signOut();
    toast.success("Signed out");
    isPremium.value = false;
    subscriptionStatus.value = "none";
    currentPeriodEnd.value = null;
    cancelAtPeriodEnd.value = false;
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign out");
  }
};

const fetchSubscriptionStatus = async () => {
  if (!authStore.isAuthenticated) return;

  subscriptionLoading.value = true;
  try {
    const response = await authenticatedFetch(billingApiPath);
    if (!response.ok) {
      if (response.status === 401) {
        subscriptionStatus.value = "none";
        isPremium.value = false;
        return;
      }
      throw new Error("Unable to fetch subscription status");
    }
    const payload = (await response.json()) as SubscriptionStatusResponse;
    isPremium.value = payload.isPremium;
    subscriptionStatus.value = payload.status;
    currentPeriodEnd.value = payload.currentPeriodEnd;
    cancelAtPeriodEnd.value = payload.cancelAtPeriodEnd;
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to fetch subscription status");
  } finally {
    subscriptionLoading.value = false;
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
  await fetchSubscriptionStatus();
});

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await fetchSubscriptionStatus();
      return;
    }
    isPremium.value = false;
    subscriptionStatus.value = "none";
    currentPeriodEnd.value = null;
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
        <p>
          Email:
          <span>{{ authStore.user?.email }}</span>
        </p>
        <Button
          class="mt-2"
          :disabled="authStore.loading"
          variant="outline"
          size="sm"
          @click="signOut"
        >
          Sign out
        </Button>
      </div>
      <Card v-if="authStore.isAuthenticated" class="max-w-sm mt-6">
        <CardHeader>
          <CardTitle class="flex justify-between"
            ><p>Premium</p>
            <p>$2.99/Month</p></CardTitle
          >
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <ul class="list-none text-muted-foreground">
            <li>Expanded weekly analysis</li>
            <li>Commentary style selection</li>
            <li>Priority access to premium recap updates</li>
          </ul>
          <p v-if="authStore.isAuthenticated" class="text-muted-foreground">
            Status:
            <span class="font-medium text-foreground">{{
              subscriptionStatusLabel
            }}</span>
          </p>
          <p
            v-if="authStore.isAuthenticated && currentPeriodEnd"
            class="text-muted-foreground"
          >
            Current period end:
            <span class="font-medium text-foreground">{{
              new Date(currentPeriodEnd).toLocaleDateString()
            }}</span>
          </p>
          <p
            v-if="authStore.isAuthenticated && cancelAtPeriodEnd"
            class="text-muted-foreground"
          >
            Cancels at period end.
          </p>
        </CardContent>
        <CardFooter class="flex gap-2">
          <Button
            :disabled="
              checkoutLoading ||
              portalLoading ||
              subscriptionLoading ||
              authStore.loading ||
              !authStore.isAuthenticated ||
              isPremium
            "
            @click="startCheckout"
          >
            {{ getCheckoutButtonText }}
          </Button>
          <Button
            v-if="authStore.isAuthenticated"
            variant="outline"
            :disabled="
              checkoutLoading ||
              portalLoading ||
              subscriptionLoading ||
              authStore.loading ||
              !canManageSubscription
            "
            @click="openBillingPortal"
          >
            {{ portalLoading ? "Opening..." : "Manage subscription" }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
