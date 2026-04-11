<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import { authenticatedFetch } from "@/lib/authFetch";
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

const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const route = useRoute();
const router = useRouter();
const showLogin = ref(true);
const signInEmail = ref("");
const signInPassword = ref("");
const signUpEmail = ref("");
const signUpPassword = ref("");
const signUpOtpCode = ref("");
const pendingSignUpEmail = ref("");
const recoveryPassword = ref("");
const recoveryPasswordConfirm = ref("");
const checkoutLoadingPlan = ref<CheckoutPlan | null>(null);
const portalLoading = ref(false);

type CheckoutPlan = "monthly" | "season_pass";

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const checkoutApiPath = `${backendBaseUrl}/api/stripe/createCheckoutSession`;
const portalApiPath = `${backendBaseUrl}/api/stripe/createPortalSession`;
const stripeRedirectHosts = new Set([
  "checkout.stripe.com",
  "billing.stripe.com",
  "buy.stripe.com",
]);

const getAllowedRedirectOrigins = () => {
  const origins = new Set<string>();

  origins.add(window.location.origin);
  if (backendBaseUrl) {
    try {
      origins.add(new URL(backendBaseUrl).origin);
    } catch {
      // Ignore invalid backend URL; it simply won't be allowlisted.
    }
  }

  return origins;
};

const isSafeRedirectUrl = (rawUrl: string) => {
  let target: URL;
  try {
    target = new URL(rawUrl, window.location.origin);
  } catch {
    return false;
  }

  if (target.protocol !== "https:") return false;

  const allowedOrigins = getAllowedRedirectOrigins();
  if (allowedOrigins.has(target.origin)) return true;

  return stripeRedirectHosts.has(target.hostname);
};

const subscriptionStatusLabel = computed(() => {
  if (subscriptionStore.loading) return "Loading";

  const status = subscriptionStore.status.toLowerCase();
  if (status === "none") return "Not Subscribed";
  if (status === "season_pass") return "Season Pass Active";
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
  if (
    status === "active" ||
    status === "trialing" ||
    status === "season_pass"
  ) {
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

const trialTimelineLabel = computed(() => {
  if (!subscriptionStore.trialEnd) return "No trial end date";
  return new Date(subscriptionStore.trialEnd).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
});

const seasonPassTimelineLabel = computed(() => {
  if (!subscriptionStore.seasonPassExpiresAt)
    return "No season pass expiration";
  return new Date(subscriptionStore.seasonPassExpiresAt).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
});

const subscriptionTimelineNote = computed(() => {
  if (subscriptionStore.status.toLowerCase() === "trialing") {
    return `Your free trial ends on ${trialTimelineLabel.value}.`;
  }
  if (subscriptionStore.status.toLowerCase() === "season_pass") {
    return `Your premium tier season pass is active through ${seasonPassTimelineLabel.value}.`;
  }
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

const canStartTrial = computed(() => {
  const status = subscriptionStore.status.toLowerCase();
  if (subscriptionStore.planType === "monthly") return false;
  if (status !== "none") return false;
  return true;
});

const getCheckoutButtonText = (plan: CheckoutPlan) => {
  if (checkoutLoadingPlan.value === plan) return "Redirecting...";
  if (plan === "season_pass") return "Buy season pass";
  return canStartTrial.value ? "Start 7-day free trial" : "Subscribe monthly";
};

const showPasswordRecoveryForm = computed(() => {
  const mode = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;
  return authStore.isPasswordRecovery || mode === "reset-password";
});
const showSignUpOtpForm = computed(() => pendingSignUpEmail.value !== "");

const resetSignInForm = () => {
  signInEmail.value = "";
  signInPassword.value = "";
};

const resetSignUpForm = () => {
  signUpEmail.value = "";
  signUpPassword.value = "";
};

const resetSignUpOtpForm = () => {
  signUpOtpCode.value = "";
  pendingSignUpEmail.value = "";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
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
    } catch (error: unknown) {
      toast.error(
        `Unable to sign in. ${getErrorMessage(error, "Please try again.")}`
      );
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
      pendingSignUpEmail.value = signUpEmail.value;
      toast.success("Account created. Enter the code from your email.");
      resetSignUpForm();
    } catch (error: unknown) {
      toast.error(
        `Unable to create account. ${getErrorMessage(error, "Please try again.")}`
      );
    }
};

const verifySignUpOtp = async () => {
  if (pendingSignUpEmail.value === "" || signUpOtpCode.value === "") {
    toast.error("Enter the verification code from your email.");
    return;
  }
  try {
    await authStore.verifySignUpOtp(
      pendingSignUpEmail.value,
      signUpOtpCode.value
    );
    toast.success("Email verified and signed in.");
    resetSignUpOtpForm();
  } catch (error: unknown) {
    toast.error(
      `Unable to verify code. ${getErrorMessage(error, "Please try again.")}`
    );
  }
};

const resendSignUpOtp = async () => {
  if (pendingSignUpEmail.value === "") {
    toast.error("Create an account first.");
    return;
  }
  try {
    await authStore.resendSignUpOtp(pendingSignUpEmail.value);
    toast.success("Verification code resent.");
  } catch (error: unknown) {
    toast.error(
      `Unable to resend code. ${getErrorMessage(error, "Please try again.")}`
    );
  }
};

const signOut = async () => {
  const currentUserId = authStore.user?.id;
  try {
    await authStore.signOut();
    toast.success("Signed out");
    subscriptionStore.clearSubscriptionStatusCache(currentUserId);
    subscriptionStore.resetSubscriptionState();
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, "Unable to sign out"));
  }
};

const signInWithGoogle = async () => {
  try {
    await authStore.signInWithGoogle(`${window.location.origin}/account`);
  } catch (error: unknown) {
    toast.error(
      `Unable to continue with Google. ${getErrorMessage(
        error,
        "Please try again."
      )}`
    );
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
  } catch (error: unknown) {
    toast.error(
      `Unable to send reset email. ${getErrorMessage(
        error,
        "Please try again."
      )}`
    );
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
  } catch (error: unknown) {
    toast.error(
      `Unable to update password. ${getErrorMessage(
        error,
        "Please try again."
      )}`
    );
  }
};

const startCheckout = async (plan: CheckoutPlan) => {
  if (!authStore.isAuthenticated) {
    toast.error("Please sign in before choosing a plan.");
    return;
  }

  checkoutLoadingPlan.value = plan;
  try {
    const response = await authenticatedFetch(checkoutApiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    if (!response.ok) {
      throw new Error("Unable to start checkout");
    }

    const payload = (await response.json()) as { url?: string };
    if (!payload.url) {
      throw new Error("Missing checkout url");
    }
    if (!isSafeRedirectUrl(payload.url)) {
      throw new Error("Blocked unsafe redirect URL");
    }
    window.location.assign(payload.url);
  } catch (error: unknown) {
    checkoutLoadingPlan.value = null;
    toast.error(getErrorMessage(error, "Unable to start checkout"));
  }
};

const openBillingPortal = async () => {
  if (!subscriptionStore.canManageSubscription) {
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
    if (!isSafeRedirectUrl(payload.url)) {
      throw new Error("Blocked unsafe redirect URL");
    }
    window.location.assign(payload.url);
  } catch (error: unknown) {
    portalLoading.value = false;
    toast.error(getErrorMessage(error, "Unable to open billing portal"));
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

const ensureLeagueIdQueryParam = async () => {
  const existingLeagueId = Array.isArray(route.query.leagueId)
    ? route.query.leagueId[0]
    : route.query.leagueId;

  if (existingLeagueId) return;

  const currentLeagueId = window.localStorage.getItem("currentLeagueId");
  if (!currentLeagueId) return;

  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      leagueId: currentLeagueId,
    },
  });
};

onMounted(async () => {
  await ensureLeagueIdQueryParam();
  subscriptionStore.initialize();
  await handleCheckoutQuery();
});
</script>
<template>
  <div class="container w-11/12 h-auto max-w-screen-xl pb-20 mx-auto sm:ml-8">
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
        <Card v-if="showSignUpOtpForm" class="max-w-sm">
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              Enter the code sent to {{ pendingSignUpEmail }}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel for="verification-code">
                  Verification code
                </FieldLabel>
                <Input
                  v-model="signUpOtpCode"
                  type="text"
                  placeholder="123456"
                  autocomplete="one-time-code"
                />
              </Field>
              <Field>
                <Button :disabled="authStore.loading" @click="verifySignUpOtp">
                  Verify code
                </Button>
                <Button
                  variant="outline"
                  :disabled="authStore.loading"
                  @click="resendSignUpOtp"
                >
                  Resend code
                </Button>
              </Field>
              <FieldDescription class="text-center">
                Wrong email?
                <a class="cursor-pointer" @click="resetSignUpOtpForm"
                  >Use a different email</a
                >
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card v-else-if="showLogin" class="max-w-sm">
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
                v-if="subscriptionStore.canManageSubscription"
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
        class="max-w-xl mt-4"
      >
        <CardHeader>
          <CardTitle>Premium</CardTitle>
          <CardDescription>
            Premium tools for deeper insights across every league you manage.
          </CardDescription>
        </CardHeader>
        <CardContent class="text-sm">
          <div class="p-4 mb-5 border rounded-xl">
            <p class="mb-3 text-sm font-semibold">
              Every premium plan includes:
            </p>
            <div>
              <div class="flex align-middle">
                <Check class="w-5 h-5 mr-2 shrink-0" />
                <p class="text-muted-foreground">
                  Smarter, customizable, weekly league recaps
                </p>
              </div>
              <div class="flex mt-3 align-middle">
                <Check class="w-5 h-5 mr-2 shrink-0" />
                <p class="text-muted-foreground">
                  Manager profiles built around your league
                </p>
              </div>
              <div class="flex mt-3 align-middle">
                <Check class="w-5 h-5 mr-2 shrink-0" />
                <p class="text-muted-foreground">
                  Access to all future premium features
                </p>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-4 sm:flex-row">
            <div class="relative flex-1 p-5 border rounded-xl bg-muted/40">
              <p
                class="text-sm font-semibold tracking-[0.12em] uppercase text-muted-foreground"
              >
                Season Pass
              </p>
              <p class="mt-2 text-5xl font-medium leading-none">
                $15
                <span class="-ml-1 text-base font-normal text-muted-foreground">
                  /season
                </span>
              </p>
              <p class="mt-3 min-h-[2.5rem] text-muted-foreground">
                One payment for premium access through Feb 15, 2027.
              </p>

              <Button
                class="w-full mt-8"
                :disabled="checkoutLoadingPlan !== null"
                @click="startCheckout('season_pass')"
              >
                {{ getCheckoutButtonText("season_pass") }}
              </Button>
            </div>
            <div class="flex-1 p-5 border rounded-xl">
              <p
                class="text-sm font-semibold tracking-[0.12em] uppercase text-muted-foreground"
              >
                Monthly
              </p>
              <p class="mt-2 text-5xl font-medium leading-none">
                $5
                <span class="-ml-1 text-base font-normal text-muted-foreground">
                  /month
                </span>
              </p>
              <p class="mt-3 min-h-[2.5rem] text-muted-foreground">
                {{
                  canStartTrial
                    ? "7-day free trial, then billed monthly. Cancel anytime."
                    : "Billed monthly. Cancel anytime."
                }}
              </p>
              <Button
                class="w-full mt-8"
                :disabled="checkoutLoadingPlan !== null"
                variant="outline"
                @click="startCheckout('monthly')"
              >
                {{ getCheckoutButtonText("monthly") }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
