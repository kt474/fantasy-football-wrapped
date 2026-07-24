<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useSubscriptionStore } from "@/store/subscription";
import { getLeagueKey, useStore } from "@/store/store";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import Checkbox from "@/components/ui/checkbox/Checkbox.vue";
import { authenticatedFetch } from "@/lib/authFetch";
import { trackEvent, trackPremiumFunnelEvent } from "@/lib/analytics";
import { loadSavedLeagues } from "@/lib/leagueStorage";
import { scrollAppToTop } from "@/lib/appScroll";
import { customizableLeagueFeatures } from "@/lib/features";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { ArrowRight, Check, CircleCheck } from "lucide-vue-next";
import Separator from "@/components/ui/separator/Separator.vue";
import Switch from "@/components/ui/switch/Switch.vue";
import PageContainer from "@/components/layout/PageContainer.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
import {
  clearPendingCheckout,
  consumePendingCheckout,
  savePendingCheckout,
  type CheckoutPlan,
} from "@/lib/pendingCheckout";
import {
  clearPremiumCheckoutAttribution,
  createPremiumFunnelId,
  readPremiumCheckoutAttribution,
  savePremiumCheckoutAttribution,
} from "@/lib/premiumFunnel";
import {
  getPostPurchaseActivation,
  type PostPurchaseActivation,
} from "@/lib/postPurchaseActivation";
import {
  getPremiumUpgradeDescription,
  isPremiumUpgradeIntent,
  normalizePremiumUpgradeIntent,
} from "@/lib/premiumUpgradeIntent";

const authStore = useAuthStore();
const subscriptionStore = useSubscriptionStore();
const store = useStore();
const route = useRoute();
const router = useRouter();
const showLogin = ref(true);
const signInEmail = ref("");
const signInPassword = ref("");
const signUpEmail = ref("");
const signUpPassword = ref("");
const signUpWeeklyReportEmailsEnabled = ref(false);
const signUpOtpCode = ref("");
const pendingSignUpEmail = ref("");
const recoveryPassword = ref("");
const recoveryPasswordConfirm = ref("");
const checkoutLoadingPlan = ref<CheckoutPlan | null>(null);
const portalLoading = ref(false);
const notificationPreferencesLoading = ref(false);
const notificationPreferencesSaving = ref(false);
const weeklyReportEmailsEnabled = ref(false);
const trackedAccountPaywallView = ref(false);
const authenticationSection = ref<HTMLElement | null>(null);
const pricingSection = ref<HTMLElement | null>(null);
const selectedCheckoutPlan = ref<CheckoutPlan | null>(null);
const displayedCheckoutPlan = ref<CheckoutPlan>("annual");
const lastAutoScrolledUpgradeRoute = ref("");
const postPurchaseActivation = ref<PostPurchaseActivation | null>(null);

const getFeatureSettingId = (feature: string) =>
  `feature-${feature.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const waitForRouteScroll = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

onBeforeRouteLeave(() => {
  clearPendingCheckout();
  clearPremiumCheckoutAttribution();
});

const isUpgradeFlow = computed(() => {
  const intent = Array.isArray(route.query.intent)
    ? route.query.intent[0]
    : route.query.intent;
  return isPremiumUpgradeIntent(intent);
});

const shouldShowAuthentication = computed(
  () =>
    !isUpgradeFlow.value ||
    selectedCheckoutPlan.value !== null ||
    showSignUpOtpForm.value
);

const upgradeIntent = computed(() => {
  const value = Array.isArray(route.query.intent)
    ? route.query.intent[0]
    : route.query.intent;
  return normalizePremiumUpgradeIntent(value);
});

const upgradeSource = computed(() => {
  const value = Array.isArray(route.query.upgrade_source)
    ? route.query.upgrade_source[0]
    : route.query.upgrade_source;
  return typeof value === "string" ? value : "account";
});

const checkoutReturnState = Array.isArray(route.query.checkout)
  ? route.query.checkout[0]
  : route.query.checkout;
const storedCheckoutAttribution = readPremiumCheckoutAttribution();
const shouldReuseStoredFunnel = Boolean(
  storedCheckoutAttribution &&
  (checkoutReturnState ||
    (storedCheckoutAttribution.funnelSource === upgradeSource.value &&
      storedCheckoutAttribution.feature === upgradeIntent.value))
);
const premiumFunnelId = shouldReuseStoredFunnel
  ? storedCheckoutAttribution!.funnelId
  : createPremiumFunnelId();

const getFunnelAnalytics = () => ({
  funnel_id: premiumFunnelId,
  funnel_source: upgradeSource.value,
  upgrade_source: upgradeSource.value,
  feature: upgradeIntent.value,
});

const getCheckoutReturnAnalytics = () => {
  const attribution = readPremiumCheckoutAttribution();
  if (!attribution) return getFunnelAnalytics();

  return {
    funnel_id: attribution.funnelId,
    funnel_source: attribution.funnelSource,
    upgrade_source: attribution.funnelSource,
    feature: attribution.feature,
    plan: attribution.plan,
    billing_interval: attribution.billingInterval,
    price_usd: attribution.priceUsd,
    best_value: attribution.bestValue,
  };
};

const premiumDescription = computed(() =>
  getPremiumUpgradeDescription(upgradeIntent.value)
);

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
  if (status === "active") return "Premium Active";
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
    return "border-success/30 bg-success/15 text-success-foreground";
  }
  if (status === "none") {
    return "bg-muted text-muted-foreground border-border";
  }
  if (status === "canceled" || subscriptionStore.cancelDate) {
    return "border-warning/30 bg-warning/15";
  }

  return "border-border bg-muted text-muted-foreground";
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
    return `Your Season Pass includes Premium access through ${seasonPassTimelineLabel.value}.`;
  }
  if (subscriptionStore.cancelDate) {
    return `Your subscription remains active until ${cancelTimelineLabel.value}.`;
  }
  return "";
});

const accountSummaryContainerClass = computed(() => {
  if (!authStore.isAuthenticated) return "";
  return "max-w-xl";
});

const getCheckoutButtonText = (plan: CheckoutPlan) => {
  if (checkoutLoadingPlan.value === plan) return "Redirecting...";
  if (!authStore.isAuthenticated) {
    return "Sign in to continue";
  }
  return displayedCheckoutPlan.value === "annual"
    ? "Subscribe annually"
    : "Subscribe monthly";
};

const displayedPlanDetails = computed(() =>
  displayedCheckoutPlan.value === "annual"
    ? {
        eyebrow: "Best value",
        price: "$39.99",
        interval: "/year",
        description: "Save 58% for a full year of Premium.",
        valueNote: "$3.33/month, billed annually.",
      }
    : {
        eyebrow: "No annual commitment",
        price: "$7.99",
        interval: "/month",
        description: "Premium access with monthly flexibility.",
        valueNote: "Billed monthly.",
      }
);

const trackPremiumExampleClick = (example: string) => {
  trackPremiumFunnelEvent("premium_example_clicked", {
    source: "account_faq",
    ...getFunnelAnalytics(),
    example,
  });
};

const guideToAuthentication = async (plan: CheckoutPlan) => {
  await nextTick();
  scrollAppToTop("smooth");
  authenticationSection.value?.querySelector<HTMLInputElement>("input")?.focus({
    preventScroll: true,
  });
  toast.info(
    plan === "annual"
      ? "Sign in to continue with an annual subscription."
      : "Sign in to continue with a monthly subscription."
  );
};

const getPlanAnalytics = (plan: CheckoutPlan) =>
  plan === "annual"
    ? {
        plan,
        billing_interval: "annual",
        price_usd: 39.99,
        best_value: true,
      }
    : {
        plan,
        billing_interval: "monthly",
        price_usd: 7.99,
        best_value: false,
      };

watch(displayedCheckoutPlan, (plan, previousPlan) => {
  if (plan === previousPlan) return;
  trackPremiumFunnelEvent("pricing_plan_changed", {
    source: "account",
    ...getFunnelAnalytics(),
    previous_plan: previousPlan,
    ...getPlanAnalytics(plan),
  });
});

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
  signUpWeeklyReportEmailsEnabled.value = false;
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
      trackEvent("Signup Started", { method: "email", source: "account" });
      await authStore.signUpWithPassword(
        signUpEmail.value,
        signUpPassword.value,
        signUpWeeklyReportEmailsEnabled.value
      );
      pendingSignUpEmail.value = signUpEmail.value;
      toast.success("Account created. Enter the code from your email.");
      resetSignUpForm();
    } catch (error: unknown) {
      trackEvent("Signup Failed", { method: "email", source: "account" });
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
    trackEvent("Signup Completed", { method: "email", source: "account" });
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
    store.resetLeagueFeatureVisibility();
    toast.success("Signed out");
    subscriptionStore.clearSubscriptionStatusCache(currentUserId);
    subscriptionStore.resetSubscriptionState();
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, "Unable to sign out"));
  }
};

const signInWithGoogle = async () => {
  try {
    trackEvent("Signup Started", { method: "google", source: "account" });
    const redirectUrl = new URL(route.fullPath, window.location.origin);
    await authStore.signInWithGoogle(redirectUrl.toString());
  } catch (error: unknown) {
    trackEvent("Signup Failed", { method: "google", source: "account" });
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

const saveWeeklyReportEmailPreference = async (
  checked: boolean | "indeterminate"
) => {
  const enabled = checked === true;
  const previousValue = weeklyReportEmailsEnabled.value;
  weeklyReportEmailsEnabled.value = enabled;
  notificationPreferencesSaving.value = true;

  try {
    await authStore.updateWeeklyReportEmailsPreference(enabled);
    toast.success(
      enabled
        ? "Weekly report emails enabled."
        : "Weekly report emails disabled."
    );
  } catch (error: unknown) {
    weeklyReportEmailsEnabled.value = previousValue;
    toast.error(
      `Unable to update email preference. ${getErrorMessage(
        error,
        "Please try again."
      )}`
    );
  } finally {
    notificationPreferencesSaving.value = false;
  }
};

const beginAuthenticatedCheckout = async (
  plan: CheckoutPlan,
  resumedAfterAuth = false
) => {
  if (!authStore.isAuthenticated || checkoutLoadingPlan.value !== null) return;

  trackEvent("Checkout Started", { plan, source: "account" });
  if (resumedAfterAuth) {
    trackPremiumFunnelEvent("checkout_resumed", {
      source: "account",
      ...getFunnelAnalytics(),
      ...getPlanAnalytics(plan),
    });
  }
  trackPremiumFunnelEvent("checkout_started", {
    source: "account",
    ...getFunnelAnalytics(),
    resumed_after_auth: resumedAfterAuth,
    ...getPlanAnalytics(plan),
  });
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
    trackEvent("Checkout Redirected", { plan, source: "account" });
    trackPremiumFunnelEvent("checkout_redirected", {
      source: "account",
      ...getFunnelAnalytics(),
      ...getPlanAnalytics(plan),
    });
    window.location.assign(payload.url);
  } catch (error: unknown) {
    checkoutLoadingPlan.value = null;
    trackEvent("Checkout Failed", { plan, reason: "request_failed" });
    trackPremiumFunnelEvent("checkout_failed", {
      source: "account",
      ...getFunnelAnalytics(),
      reason: "request_failed",
      ...getPlanAnalytics(plan),
    });
    toast.error(getErrorMessage(error, "Unable to start checkout"));
  }
};

const startCheckout = async (plan: CheckoutPlan) => {
  const planAnalytics = getPlanAnalytics(plan);
  savePremiumCheckoutAttribution({
    funnelId: premiumFunnelId,
    funnelSource: upgradeSource.value,
    feature: upgradeIntent.value,
    plan,
    billingInterval: planAnalytics.billing_interval,
    priceUsd: planAnalytics.price_usd,
    bestValue: planAnalytics.best_value,
  });

  trackPremiumFunnelEvent("plan_selected", {
    source: "account",
    ...getFunnelAnalytics(),
    authenticated: authStore.isAuthenticated,
    ...planAnalytics,
  });

  if (!authStore.isAuthenticated) {
    selectedCheckoutPlan.value = plan;
    savePendingCheckout(plan);
    trackEvent("Checkout Failed", { plan, reason: "signed_out" });
    trackPremiumFunnelEvent("checkout_blocked", {
      source: "account",
      ...getFunnelAnalytics(),
      reason: "signed_out",
      ...planAnalytics,
    });
    await guideToAuthentication(plan);
    return;
  }

  await beginAuthenticatedCheckout(plan);
};

const openBillingPortal = async () => {
  if (!subscriptionStore.canManageSubscription) {
    toast.error("No subscription found to manage.");
    return;
  }

  portalLoading.value = true;
  trackEvent("Billing Portal Opened", {
    source: "account",
    status: subscriptionStore.status,
  });
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
    trackEvent("Billing Portal Failed", {
      source: "account",
      status: subscriptionStore.status,
    });
    toast.error(getErrorMessage(error, "Unable to open billing portal"));
  }
};

const handleCheckoutQuery = async () => {
  const checkoutState = route.query.checkout;

  if (checkoutState === "success") {
    const checkoutAttribution = readPremiumCheckoutAttribution();
    postPurchaseActivation.value = getPostPurchaseActivation(
      checkoutAttribution?.feature ?? upgradeIntent.value
    );
    trackEvent("Checkout Succeeded", { source: "stripe", status: "success" });
    trackPremiumFunnelEvent("checkout_succeeded", {
      source: "stripe",
      status: "success",
      ...getCheckoutReturnAnalytics(),
    });
    toast.success("Checkout completed. Refreshing subscription status...");
    await subscriptionStore.fetchSubscriptionStatus({ showErrorToast: true });
  } else if (checkoutState === "canceled") {
    trackEvent("Checkout Canceled", { source: "stripe", status: "canceled" });
    trackPremiumFunnelEvent("checkout_canceled", {
      source: "stripe",
      status: "canceled",
      ...getCheckoutReturnAnalytics(),
    });
    toast.error("Checkout canceled.");
  }

  if (checkoutState) {
    clearPremiumCheckoutAttribution();
    const newQuery = { ...route.query };
    delete newQuery.checkout;
    delete newQuery.session_id;
    router.replace({ path: route.path, query: newQuery });
  }
};

const openPostPurchaseDestination = async () => {
  const activation = postPurchaseActivation.value;
  if (!activation) return;

  trackPremiumFunnelEvent("post_purchase_activation_clicked", {
    source: "account_checkout_success",
    ...getFunnelAnalytics(),
    destination_tab: activation.destinationTab,
    cta: activation.actionLabel,
  });

  store.currentTab = activation.destinationTab;
  window.localStorage.setItem("currentTab", activation.destinationTab);

  const {
    intent: _intent,
    upgrade_source: _upgradeSource,
    checkout: _checkout,
    session_id: _sessionId,
    ...query
  } = route.query;
  await router.push({
    path: "/",
    query: activation.destinationMode
      ? { ...query, tradeMode: activation.destinationMode }
      : query,
  });
};

const ensureLeagueIdQueryParam = async () => {
  const existingLeagueId = Array.isArray(route.query.leagueId)
    ? route.query.leagueId[0]
    : route.query.leagueId;

  if (existingLeagueId) return;

  const currentLeagueId = window.localStorage.getItem("currentLeagueId");
  if (!currentLeagueId) return;

  const savedLeagues =
    store.leagueInfo.length > 0 ? store.leagueInfo : await loadSavedLeagues();
  const currentLeague = savedLeagues.find(
    (league) => getLeagueKey(league) === currentLeagueId
  );

  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      espn: currentLeague?.platform === "espn" ? null : undefined,
      leagueId: currentLeague?.leagueId ?? currentLeagueId,
      season:
        currentLeague?.platform === "espn" ? currentLeague.season : undefined,
    },
  });
};

onMounted(async () => {
  await ensureLeagueIdQueryParam();
  subscriptionStore.initialize();
  await handleCheckoutQuery();
});

watch(
  () => ({
    isPremium: subscriptionStore.isPremium,
    initialized: subscriptionStore.initialized,
    loading: subscriptionStore.loading,
    recovery: showPasswordRecoveryForm.value,
  }),
  ({ isPremium, initialized, loading, recovery }) => {
    if (
      trackedAccountPaywallView.value ||
      !initialized ||
      loading ||
      isPremium ||
      recovery
    ) {
      return;
    }

    trackedAccountPaywallView.value = true;
    trackEvent("Paywall Viewed", { source: "account", feature: "premium" });
    trackPremiumFunnelEvent("paywall_viewed", {
      source: "account",
      ...getFunnelAnalytics(),
      authenticated: authStore.isAuthenticated,
      is_premium: isPremium,
    });
  },
  { immediate: true }
);

watch(
  () => ({
    routeKey: route.fullPath,
    isUpgradeFlow: isUpgradeFlow.value,
    scrollToPricing: window.history.state?.scrollToPricing === true,
    authenticated: authStore.isAuthenticated,
    subscriptionInitialized: subscriptionStore.initialized,
    subscriptionLoading: subscriptionStore.loading,
    isPremium: subscriptionStore.isPremium,
    recovery: showPasswordRecoveryForm.value,
  }),
  async ({
    routeKey,
    isUpgradeFlow,
    scrollToPricing,
    authenticated,
    subscriptionInitialized,
    subscriptionLoading,
    isPremium,
    recovery,
  }) => {
    if (
      !subscriptionInitialized ||
      subscriptionLoading ||
      lastAutoScrolledUpgradeRoute.value === routeKey
    ) {
      return;
    }

    if (scrollToPricing) {
      const historyState = { ...window.history.state };
      delete historyState.scrollToPricing;
      window.history.replaceState(historyState, "");
    }

    if (isPremium || recovery) {
      if (scrollToPricing) scrollAppToTop();
      return;
    }

    if (!scrollToPricing && (!isUpgradeFlow || !authenticated)) return;

    await nextTick();
    await waitForRouteScroll();
    if (route.fullPath !== routeKey || !pricingSection.value) return;

    lastAutoScrolledUpgradeRoute.value = routeKey;
    pricingSection.value.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  },
  { immediate: true, flush: "post" }
);

watch(
  () => authStore.weeklyReportEmailsEnabled,
  (enabled) => {
    weeklyReportEmailsEnabled.value = enabled;
  },
  { immediate: true }
);

watch(
  () => ({
    initialized: authStore.initialized,
    authenticated: authStore.isAuthenticated,
    recovery: showPasswordRecoveryForm.value,
  }),
  async ({ initialized, authenticated, recovery }) => {
    if (!initialized || !authenticated || recovery) return;
    if (checkoutLoadingPlan.value !== null) return;

    const pendingPlan = consumePendingCheckout();
    if (!pendingPlan) return;

    await beginAuthenticatedCheckout(pendingPlan, true);
  },
  { immediate: true }
);

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (!isAuthenticated) return;
    notificationPreferencesLoading.value = true;
    try {
      await authStore.fetchWeeklyReportEmailsPreference();
    } catch (error) {
      console.error("Unable to load notification preferences:", error);
    } finally {
      notificationPreferencesLoading.value = false;
    }
  },
  { immediate: true }
);
</script>
<template>
  <PageContainer>
    <PageHeader title="Account" class="mb-4" />
    <div class="flex flex-col">
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
      <div
        v-else-if="!authStore.isAuthenticated && shouldShowAuthentication"
        ref="authenticationSection"
        tabindex="-1"
        class="order-1 scroll-mt-4"
      >
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
                <button
                  type="button"
                  class="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @click="resetSignUpOtpForm"
                >
                  Use a different email
                </button>
              </FieldDescription>
            </FieldGroup>
          </CardContent>
        </Card>
        <Card v-else-if="showLogin" class="max-w-sm">
          <CardHeader>
            <CardTitle> Create an account </CardTitle>
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
              <div class="flex items-start w-full gap-3">
                <Checkbox
                  id="weekly-report-email-signup"
                  :model-value="signUpWeeklyReportEmailsEnabled"
                  class="flex-none w-4 h-4"
                  @update:model-value="
                    signUpWeeklyReportEmailsEnabled = $event === true
                  "
                />
                <div class="min-w-0">
                  <label
                    for="weekly-report-email-signup"
                    class="block text-sm font-medium"
                  >
                    Email me weekly report reminders
                  </label>
                </div>
              </div>
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
                    <button
                      type="button"
                      class="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      @click="showLogin = !showLogin"
                    >
                      Sign in
                    </button>
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
                  <button
                    type="button"
                    class="inline-block ml-auto text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    @click="sendPasswordResetEmail"
                  >
                    Forgot your password?
                  </button>
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
                  <button
                    type="button"
                    class="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    @click="showLogin = !showLogin"
                  >
                    Sign up
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      <div
        v-else-if="authStore.isAuthenticated"
        :class="['order-1', accountSummaryContainerClass]"
      >
        <Card
          v-if="postPurchaseActivation"
          role="status"
          class="mb-4 overflow-hidden border-success/30 bg-success/10"
        >
          <CardContent
            class="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex min-w-0 gap-3">
              <CircleCheck
                class="mt-0.5 size-5 shrink-0 text-success"
                aria-hidden="true"
              />
              <div>
                <p class="font-semibold">{{ postPurchaseActivation.title }}</p>
                <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {{ postPurchaseActivation.description }}
                </p>
              </div>
            </div>
            <Button
              class="w-full shrink-0 sm:w-auto"
              @click="openPostPurchaseDestination"
            >
              {{ postPurchaseActivation.actionLabel }}
              <ArrowRight class="size-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>
              Your profile, plan, and preferences
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
            <p
              v-if="subscriptionTimelineNote"
              class="text-sm text-muted-foreground"
            >
              {{ subscriptionTimelineNote }}
            </p>
            <Separator />
            <div class="space-y-3">
              <p class="text-sm font-medium">Preferences</p>
              <div class="overflow-hidden border divide-y rounded-lg">
                <div class="flex items-center justify-between gap-4 p-3">
                  <div class="min-w-0">
                    <label
                      for="weekly-report-email-setting"
                      class="block text-sm font-medium cursor-pointer"
                    >
                      Weekly report emails
                    </label>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      Get reminders when a new weekly report is ready.
                    </p>
                  </div>
                  <Switch
                    id="weekly-report-email-setting"
                    :model-value="weeklyReportEmailsEnabled"
                    :disabled="
                      notificationPreferencesLoading ||
                      notificationPreferencesSaving
                    "
                    class="shrink-0"
                    @update:model-value="saveWeeklyReportEmailPreference"
                  />
                </div>
                <div class="flex items-center justify-between gap-4 p-3">
                  <div class="min-w-0">
                    <label
                      for="show-usernames-setting"
                      class="block text-sm font-medium cursor-pointer"
                    >
                      Show usernames
                    </label>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      Use manager usernames instead of fantasy team names.
                    </p>
                  </div>
                  <Switch
                    id="show-usernames-setting"
                    :model-value="store.showUsernames"
                    class="shrink-0"
                    @update:model-value="store.updateShowUsernames"
                  />
                </div>
                <Accordion type="single" collapsible>
                  <AccordionItem value="feature-visibility" class="border-b-0">
                    <AccordionTrigger
                      class="px-3 py-3 text-left hover:no-underline"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-medium">Feature visibility</p>
                        <p
                          class="mt-0.5 text-xs font-normal text-muted-foreground"
                        >
                          Hide optional features to simplify the sidebar.
                          Everything is shown by default.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent class="px-3">
                      <div class="space-y-3">
                        <div
                          v-for="feature in customizableLeagueFeatures"
                          :key="feature.id"
                          class="flex items-center justify-between gap-4"
                        >
                          <div class="min-w-0">
                            <label
                              :for="getFeatureSettingId(feature.id)"
                              class="block text-sm font-medium cursor-pointer"
                            >
                              {{ feature.id }}
                            </label>
                            <p class="mt-0.5 text-xs text-muted-foreground">
                              {{ feature.description }}
                            </p>
                          </div>
                          <Switch
                            :id="getFeatureSettingId(feature.id)"
                            :model-value="
                              store.isLeagueFeatureVisible(feature.id)
                            "
                            class="shrink-0"
                            @update:model-value="
                              store.updateLeagueFeatureVisibility(
                                feature.id,
                                $event
                              )
                            "
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
            <Separator />

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
      <div
        v-if="
          !subscriptionStore.isPremium &&
          !subscriptionStore.loading &&
          !showPasswordRecoveryForm
        "
        ref="pricingSection"
        id="pricing"
        :class="[
          'grid max-w-xl gap-4 scroll-mt-20 md:scroll-mt-4',
          !authStore.isAuthenticated &&
          isUpgradeFlow &&
          selectedCheckoutPlan === null
            ? 'order-1'
            : 'order-2 mt-4',
        ]"
      >
        <Card class="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Unlock Premium for all your leagues</CardTitle>
            <CardDescription>
              {{ premiumDescription }}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="max-w-sm">
              <Tabs v-model="displayedCheckoutPlan" class="w-full">
                <TabsList class="grid w-full h-10 grid-cols-2 rounded-control">
                  <TabsTrigger value="annual" class="gap-1.5 rounded-sm">
                    Annual
                  </TabsTrigger>
                  <TabsTrigger value="monthly" class="rounded-sm">
                    Monthly
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div class="py-5">
                <p
                  class="mb-2 text-xs font-semibold uppercase min-h-4"
                  :class="[
                    displayedCheckoutPlan === 'annual'
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  ]"
                >
                  {{ displayedPlanDetails.eyebrow }}
                </p>
                <div class="flex items-baseline gap-1">
                  <span class="text-5xl font-semibold tracking-tight">
                    {{ displayedPlanDetails.price }}
                  </span>
                  <span class="text-lg text-muted-foreground">
                    {{ displayedPlanDetails.interval }}
                  </span>
                </div>
                <p
                  class="max-w-xs mt-3 text-sm leading-relaxed text-muted-foreground"
                >
                  {{ displayedPlanDetails.description }}
                </p>
                <p class="text-sm leading-relaxed text-muted-foreground">
                  {{ displayedPlanDetails.valueNote }}
                </p>
              </div>

              <Button
                class="w-full"
                size="lg"
                :disabled="checkoutLoadingPlan !== null"
                @click="startCheckout(displayedCheckoutPlan)"
              >
                {{ getCheckoutButtonText(displayedCheckoutPlan) }}
              </Button>
            </div>

            <Separator class="my-7" />

            <div>
              <p class="mb-4 text-sm font-medium">Everything included:</p>
              <ul
                class="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 sm:gap-x-6"
              >
                <li class="flex gap-2.5">
                  <Check class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span
                    >Smarter, shareable weekly recaps with customizable
                    commentary, richer league context, and short-form video
                    exports</span
                  >
                </li>
                <li class="flex gap-2.5">
                  <Check class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span
                    >History powered draft plans showing positional draft pick
                    pressure and manager tendencies</span
                  >
                </li>
                <li class="flex gap-2.5">
                  <Check class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span
                    >Manager profiles and rivalry stories built from your
                    league's history</span
                  >
                </li>
                <li class="flex gap-2.5">
                  <Check class="mt-0.5 size-4 shrink-0 text-primary" />
                  <span
                    >Premium across every Sleeper and ESPN league you manage,
                    including future Premium features</span
                  >
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <div
        v-if="
          !subscriptionStore.isPremium &&
          !subscriptionStore.loading &&
          !showPasswordRecoveryForm
        "
        class="grid order-3 max-w-xl gap-4 mt-4"
      >
        <Card class="min-w-0">
          <CardHeader class="pb-2">
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Everything you need to know about features, pricing, and league
              access.
            </CardDescription>
          </CardHeader>
          <CardContent class="text-sm">
            <section>
              <Accordion
                type="single"
                collapsible
                default-value="leagues"
                class="mt-2"
              >
                <AccordionItem value="leagues">
                  <AccordionTrigger class="text-left">
                    Does one subscription cover all of my leagues?
                  </AccordionTrigger>
                  <AccordionContent class="leading-6 text-muted-foreground">
                    Yes. Your subscription follows your account and unlocks
                    Premium across every Sleeper and ESPN league you manage.
                    Using Premium features in a new league you manage never adds
                    another charge.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="complete-plan">
                  <AccordionTrigger class="text-left">
                    Is the annual plan different from the monthly plan?
                  </AccordionTrigger>
                  <AccordionContent class="leading-6 text-muted-foreground">
                    Both plans include the same Premium features across every
                    league you manage. The only difference is billing. The
                    annual plan renews once per year, while the monthly plan
                    renews each month. You can cancel either plan anytime and
                    access will continue through the end of your current billing
                    period.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="examples">
                  <AccordionTrigger class="text-left">
                    Can I see the Premium features in action?
                  </AccordionTrigger>
                  <AccordionContent class="leading-6 text-muted-foreground">
                    <p>
                      Yes. You can explore finished examples before you
                      subscribe:
                    </p>
                    <div class="flex flex-col items-start gap-1 mt-2">
                      <a
                        href="https://ffwrapped.com/report/1BJ_ktCJQl1Ocjwy"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="font-medium text-primary hover:underline"
                        @click="trackPremiumExampleClick('weekly_report')"
                      >
                        Read a complete weekly report
                      </a>
                      <RouterLink
                        to="/fantasy-football-video-recap-example"
                        class="font-medium text-primary hover:underline"
                        @click="trackPremiumExampleClick('video_recap')"
                      >
                        Watch a 25-second video recap
                      </RouterLink>
                      <RouterLink
                        to="/fantasy-football-draft-room-example"
                        class="font-medium text-primary hover:underline"
                        @click="trackPremiumExampleClick('draft_room')"
                      >
                        Preview Draft Room scouting
                      </RouterLink>
                      <RouterLink
                        to="/fantasy-football-manager-profiles-rivalry-report-example"
                        class="font-medium text-primary hover:underline"
                        @click="
                          trackPremiumExampleClick(
                            'manager_profiles_rivalry_report'
                          )
                        "
                      >
                        Preview manager profiles and rivalry reports
                      </RouterLink>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="renewal">
                  <AccordionTrigger class="text-left">
                    Do my league mates need Premium to view shared reports?
                  </AccordionTrigger>
                  <AccordionContent class="leading-6 text-muted-foreground">
                    No. You can choose which extra insights appear with the full
                    Premium report, share the link with the entire league, and
                    they can open it without purchasing their own plan.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="video-recaps" class="border-b-0">
                  <AccordionTrigger class="text-left">
                    How do Premium video recaps work?
                  </AccordionTrigger>
                  <AccordionContent class="leading-6 text-muted-foreground">
                    Premium includes up to 3 new video generations per rolling 7
                    days. Finished videos remain available for 15 days, so
                    download a copy during that window to keep it.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  </PageContainer>
</template>
