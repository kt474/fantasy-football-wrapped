<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
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
import Separator from "@/components/ui/separator/Separator.vue";

const store = useStore();
const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const route = useRoute();
const router = useRouter();
const showLogin = ref(true);
const signInEmail = ref("");
const signInPassword = ref("");
const signUpEmail = ref("");
const signUpPassword = ref("");
const checkoutLoading = ref(false);
const portalLoading = ref(false);

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const checkoutApiPath = `${backendBaseUrl}/api/stripe/createCheckoutSession`;
const portalApiPath = `${backendBaseUrl}/api/stripe/createPortalSession`;

const subscriptionStatusLabel = computed(() => {
  if (subscriptionStore.loading) return "Loading";

  const status = subscriptionStore.status.toLowerCase();
  if (status === "none") return "Not Subscribed";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
});

const subscriptionStatusBadgeClass = computed(() => {
  if (subscriptionStore.loading) {
    return "bg-muted text-muted-foreground border-border";
  }
  const status = subscriptionStore.status.toLowerCase();
  if (status === "active" || status === "trialing") {
    return "bg-emerald-100 text-emerald-900 border-emerald-200";
  }
  if (status === "none") {
    return "bg-muted text-muted-foreground border-border";
  }
  if (status === "canceled" || subscriptionStore.cancelDate) {
    return "bg-orange-100 text-orange-900 border-orange-200";
  }

  return "bg-slate-100 text-slate-900 border-slate-200";
});

const accountInitial = computed(() => {
  const email = authStore.user?.email ?? "";
  return email.charAt(0).toUpperCase() || "?";
});

const memberSinceLabel = computed(() => {
  if (!authStore.user?.created_at) return "Unavailable";
  return new Date(authStore.user.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

const cancelTimelineLabel = computed(() => {
  if (subscriptionStore.cancelDate) {
    return new Date(subscriptionStore.cancelDate).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return "No cancellation scheduled";
});

const subscriptionTimelineNote = computed(() => {
  if (subscriptionStore.cancelDate) {
    return `Your subscription remains active until ${cancelTimelineLabel.value}.`;
  }
  return "";
});

const accountSummaryContainerClass = computed(() => {
  if (!authStore.isAuthenticated) return "";
  if (!subscriptionStore.isPremium && subscriptionStore.status === "none")
    return "max-w-sm";
  return "max-w-2xl";
});

const getCheckoutButtonText = computed(() => {
  if (checkoutLoading.value) return "Redirecting...";
  return "Start 7-day free trial";
});

const canManageSubscription = computed(() => {
  return subscriptionStore.canManageSubscription;
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
  const currentUserId = authStore.user?.id;
  try {
    await authStore.signOut();
    toast.success("Signed out");
    subscriptionStore.clearSubscriptionStatusCache(currentUserId);
    subscriptionStore.resetSubscriptionState();
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign out");
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
    await subscriptionStore.fetchSubscriptionStatus({ showErrorToast: true });
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
  subscriptionStore.initialize();
  await handleCheckoutQuery();
});
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
      <div v-else :class="accountSummaryContainerClass">
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>
              Your profile and subscription details
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex flex-wrap items-start gap-4">
              <div
                class="flex items-center justify-center w-12 h-12 mt-1 text-sm font-semibold rounded-full bg-accent"
              >
                {{ accountInitial }}
              </div>
              <div class="flex-1 min-w-[12rem]">
                <p class="text-xs uppercase text-muted-foreground">Email</p>
                <p class="font-medium break-all">{{ authStore.user?.email }}</p>
                <p class="text-xs text-muted-foreground">
                  Member since {{ memberSinceLabel }}
                </p>
              </div>
              <span
                class="inline-flex items-center px-3 py-1 text-xs font-medium border rounded-full"
                :class="subscriptionStatusBadgeClass"
              >
                {{ subscriptionStatusLabel }}
              </span>
            </div>
            <Separator />
            <p
              v-if="subscriptionTimelineNote"
              class="text-sm text-muted-foreground"
            >
              {{ subscriptionTimelineNote }}
            </p>

            <div class="flex flex-wrap gap-2 pt-1">
              <Button
                v-if="subscriptionStore.isPremium || canManageSubscription"
                @click="openBillingPortal"
                :disabled="
                  authStore.loading || portalLoading || subscriptionStore.loading
                "
                class="min-w-[9.5rem] justify-center"
                size="sm"
              >
                {{ portalLoading ? "Opening..." : "Manage subscription" }}
              </Button>
              <Button
                :disabled="authStore.loading"
                variant="outline"
                size="sm"
                @click="signOut"
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card
        v-if="
          authStore.isAuthenticated &&
          !subscriptionStore.isPremium &&
          !subscriptionStore.loading
        "
        class="max-w-sm mt-4"
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
