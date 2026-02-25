<script setup lang="ts">
import { onMounted, ref } from "vue";
import { toast } from "vue-sonner";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input/Input.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const authStore = useAuthStore();
const email = ref("");
const password = ref("");
const dialogOpen = ref(false);

onMounted(() => {
  authStore.initialize();
});

const resetForm = () => {
  email.value = "";
  password.value = "";
};

const signIn = async () => {
  try {
    await authStore.signInWithPassword(email.value, password.value);
    toast.success("Signed in");
    dialogOpen.value = false;
    resetForm();
  } catch (error: any) {
    toast.error(error?.message ?? "Unable to sign in");
  }
};

const signUp = async () => {
  try {
    await authStore.signUpWithPassword(email.value, password.value);
    toast.success("Account created. Check your email for confirmation.");
    dialogOpen.value = false;
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
  <div class="flex items-center gap-2">
    <template v-if="authStore.isAuthenticated">
      <span
        class="hidden text-xs truncate max-w-48 text-muted-foreground sm:inline"
      >
        {{ authStore.user?.email }}
      </span>
      <Button
        :disabled="authStore.loading"
        variant="outline"
        size="sm"
        @click="signOut"
      >
        Sign out
      </Button>
    </template>
    <template v-else>
      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button variant="outline" size="sm">Sign in</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>
              Enter your email and password to sign in or create an account.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-2">
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
          <DialogFooter class="flex gap-2">
            <Button
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>
  </div>
</template>
