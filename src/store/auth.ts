import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const isPasswordRecovery = ref(false);

  let unsubscribeAuthChange: (() => void) | null = null;

  const isAuthenticated = computed(() => Boolean(session.value?.access_token));
  const isConfigured = computed(() => isSupabaseConfigured());

  const initialize = async () => {
    if (initialized.value) return;
    initialized.value = true;

    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseClient();
    const callbackUrl = new URL(window.location.href);
    const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ""));
    const recoveryType =
      callbackUrl.searchParams.get("type") ?? hashParams.get("type");
    isPasswordRecovery.value = recoveryType === "recovery";

    const {
      data: { session: initialSession },
    } = await supabase.auth.getSession();

    session.value = initialSession;
    user.value = initialSession?.user ?? null;

    if (!initialSession) {
      const authCode = callbackUrl.searchParams.get("code");
      if (authCode) {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(authCode);
        if (!error) {
          session.value = data.session;
          user.value = data.session?.user ?? null;
        }
      }

      if (!session.value?.access_token) {
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            session.value = data.session;
            user.value = data.session?.user ?? null;
          }
        }
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        isPasswordRecovery.value = true;
      }
      session.value = nextSession;
      user.value = nextSession?.user ?? null;
    });

    unsubscribeAuthChange = () => data.subscription.unsubscribe();
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      loading.value = false;
    }
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      loading.value = false;
    }
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });
      if (error) throw error;
    } finally {
      loading.value = false;
    }
  };

  const sendPasswordResetEmail = async (email: string, redirectTo?: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    } finally {
      loading.value = false;
    }
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      isPasswordRecovery.value = false;
    } finally {
      loading.value = false;
    }
  };

  const clearPasswordRecovery = () => {
    isPasswordRecovery.value = false;
  };

  const signOut = async () => {
    if (!isSupabaseConfigured()) return;
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      loading.value = false;
    }
  };

  const dispose = () => {
    if (unsubscribeAuthChange) {
      unsubscribeAuthChange();
      unsubscribeAuthChange = null;
    }
  };

  return {
    session,
    user,
    loading,
    initialized,
    isPasswordRecovery,
    isAuthenticated,
    isConfigured,
    initialize,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    sendPasswordResetEmail,
    updatePassword,
    clearPasswordRecovery,
    signOut,
    dispose,
  };
});
