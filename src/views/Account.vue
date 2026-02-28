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
  FieldSeparator,
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
const recoveryPassword = ref("");
const recoveryPasswordConfirm = ref("");
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
  if (status === "active") return "Premium Subscriber";
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
    return new Date(subscriptionStore.cancelDate).toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
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

const showPasswordRecoveryForm = computed(() => {
  const mode = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;
  return authStore.isPasswordRecovery || mode === "reset-password";
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

const signInWithGoogle = async () => {
  try {
    await authStore.signInWithGoogle(`${window.location.origin}/account`);
  } catch (error: any) {
    toast.error(`Unable to continue with Google. ${error?.message}`);
  }
};

const sendPasswordResetEmail = async () => {
  if (signInEmail.value === "") {
    toast.error("Enter your email first, then click Forgot your password.");
    return;
  }
  try {
    await authStore.sendPasswordResetEmail(
      signInEmail.value,
      [window.location.origin, "/account?mode=reset-password"].join("")
    );
    toast.success("Password reset email sent. Check your inbox.");
  } catch (error: any) {
    toast.error(`Unable to send reset email. ${error?.message}`);
  }
};

const resetPassword = async () => {
  if (recoveryPassword.value.length < 6) {
    toast.error("Password must be at least 6 characters.");
    return;
  }
  if (recoveryPassword.value !== recoveryPasswordConfirm.value) {
    toast.error("Passwords do not match.");
    return;
  }

  try {
    await authStore.updatePassword(recoveryPassword.value);
    recoveryPassword.value = "";
    recoveryPasswordConfirm.value = "";
    toast.success("Password updated. You can now sign in.");
    const newQuery = { ...route.query };
    delete newQuery.mode;
    await router.replace({
      path: route.path,
      query: newQuery,
    });
  } catch (error: any) {
    toast.error(`Unable to update password. ${error?.message}`);
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
      <div v-if="showPasswordRecoveryForm">
        <Card class="max-w-sm">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              Set a new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel for="new-password"> New password </FieldLabel>
                <Input
                  v-model="recoveryPassword"
                  type="password"
                  placeholder="New password"
                  autocomplete="new-password"
                />
              </Field>
              <Field>
                <FieldLabel for="confirm-password">
                  Confirm password
                </FieldLabel>
                <Input
                  v-model="recoveryPasswordConfirm"
                  type="password"
                  placeholder="Confirm password"
                  autocomplete="new-password"
                />
              </Field>
              <Field>
                <Button @click="resetPassword"> Update Password </Button>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div v-else-if="!authStore.isAuthenticated">
        <Card v-if="showLogin" class="max-w-sm">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Enter your email below to create your account
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
                  <FieldSeparator class="my-2">Or continue with</FieldSeparator>
                  <Button
                    variant="outline"
                    :disabled="authStore.loading"
                    @click="signInWithGoogle"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      height="24"
                      viewBox="0 0 24 24"
                      width="24"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Google
                  </Button>
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
                  <a
                    class="inline-block ml-auto text-sm cursor-pointer underline-offset-4 hover:underline"
                    @click="sendPasswordResetEmail"
                  >
                    Forgot your password?
                  </a>
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
                <FieldSeparator class="my-2">Or continue with</FieldSeparator>
                <Button
                  variant="outline"
                  :disabled="authStore.loading"
                  @click="signInWithGoogle"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    viewBox="0 0 24 24"
                    width="24"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google
                </Button>
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
              <div class="flex-1 min-w-[12rem] mt-1.5">
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
                  authStore.loading ||
                  portalLoading ||
                  subscriptionStore.loading
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
          !subscriptionStore.loading &&
          !showPasswordRecoveryForm
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
