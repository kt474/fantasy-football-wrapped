<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import { authenticatedFetch } from "@/lib/authFetch";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SubscriptionStatusResponse = {
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const checkoutLoading = ref(false);
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

const subscriptionStatusLabel = computed(() => {
  if (subscriptionStatus.value === "none") return "Not subscribed";
  return subscriptionStatus.value;
});

const getCheckoutButtonText = computed(() => {
  if (checkoutLoading.value) return "Redirecting...";
  if (isPremium.value) return "Subscription active";
  return "Start 7-day free trial";
});

const resetForm = () => {
  email.value = "";
  password.value = "";
};

const signIn = async () => {
  try {
    await authStore.signInWithPassword(email.value, password.value);
    toast.success("Signed in");
    resetForm();
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign in");
  }
};

const signUp = async () => {
  try {
    await authStore.signUpWithPassword(email.value, password.value);
    toast.success("Account created. Check your email for confirmation.");
    resetForm();
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign up");
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
  console.log(billingApiPath);
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

onMounted(async () => {
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
        <p>Sign in or create an account</p>
        <div class="max-w-sm my-2 space-y-2">
          <Input
            v-model="email"
            type="email"
            placeholder="Email"
            autocomplete="email"
          />
          <Input
            v-model="password"
            type="password"
            placeholder="Password"
            autocomplete="current-password"
          />
        </div>
        <div class="">
          <Button
            class="mr-2"
            :disabled="authStore.loading || !email || !password"
            variant="outline"
            @click="signUp"
          >
            Create account
          </Button>
          <Button
            :disabled="authStore.loading || !email || !password"
            @click="signIn"
          >
            Sign in
          </Button>
        </div>
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
      <Card class="max-w-sm mt-6">
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
        <CardFooter>
          <Button
            :disabled="
              checkoutLoading ||
              subscriptionLoading ||
              authStore.loading ||
              !authStore.isAuthenticated ||
              isPremium
            "
            @click="startCheckout"
          >
            {{ getCheckoutButtonText }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
