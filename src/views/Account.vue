<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/store/auth";
import { toast } from "vue-sonner";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
const authStore = useAuthStore();
const email = ref("");
const password = ref("");
const stripeCheckoutUrl = (import.meta.env.VITE_STRIPE_PAYMENT_LINK ??
  "") as string;

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
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign out");
  }
};
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
        </CardContent>
        <CardFooter>
          <a
            v-if="stripeCheckoutUrl"
            :href="stripeCheckoutUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>Start 7-day free trial</Button>
          </a>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
