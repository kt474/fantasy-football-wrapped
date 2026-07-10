import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { newUserAlert } from "@/api/api";
import { authenticatedFetch } from "@/lib/authFetch";

export const WEEKLY_REPORT_EMAILS_METADATA_KEY = "weekly_report_emails_enabled";

type NotificationPreferencesResponse = {
  weekly_report_emails_enabled?: boolean;
};

const backendBaseUrl = (import.meta.env.VITE_BACKEND_URL ?? "").replace(
  /\/$/,
  ""
);
const notificationPreferencesApiPath = `${backendBaseUrl}/api/userPref`;

export const useAuthStore = defineStore("auth", () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  const loading = ref(false);
  const initialized = ref(false);
  const initializing = ref(false);
  const isPasswordRecovery = ref(false);
  const weeklyReportEmailsPreference = ref(false);

  let unsubscribeAuthChange: (() => void) | null = null;
  let initializationPromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => Boolean(session.value?.access_token));
  const isConfigured = computed(() => isSupabaseConfigured());
  const weeklyReportEmailsEnabled = computed(() => {
    return weeklyReportEmailsPreference.value;
  });

  const initialize = (): Promise<void> => {
    if (initialized.value) return Promise.resolve();
    if (initializationPromise) return initializationPromise;

    if (!isSupabaseConfigured()) {
      initialized.value = true;
      return Promise.resolve();
    }

    initializing.value = true;
    initializationPromise = (async () => {
      try {
        const supabase = getSupabaseClient();
        const callbackUrl = new URL(window.location.href);
        const recoveryType =
          callbackUrl.searchParams.get("type") ??
          new URLSearchParams(callbackUrl.hash.replace(/^#/, "")).get("type");
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
        }

        const { data } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            if (event === "PASSWORD_RECOVERY") {
              isPasswordRecovery.value = true;
            }
            session.value = nextSession;
            user.value = nextSession?.user ?? null;
          }
        );

        unsubscribeAuthChange = () => data.subscription.unsubscribe();
        initialized.value = true;
      } catch (error) {
        initialized.value = false;
        console.error("Failed to initialize auth store:", error);
      } finally {
        initializing.value = false;
        initializationPromise = null;
      }
    })();

    return initializationPromise;
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

  const signUpWithPassword = async (
    email: string,
    password: string,
    shouldEmailWeeklyReports = false
  ) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            [WEEKLY_REPORT_EMAILS_METADATA_KEY]: shouldEmailWeeklyReports,
            weekly_report_emails_opted_at: new Date().toISOString(),
            weekly_report_emails_source: "signup",
          },
        },
      });
      if (error) throw error;
      await newUserAlert(email);
    } finally {
      loading.value = false;
    }
  };

  const verifySignUpOtp = async (email: string, token: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      if (error) throw error;
      session.value = data.session;
      user.value = data.user ?? null;
    } finally {
      loading.value = false;
    }
  };

  const resendSignUpOtp = async (email: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase auth is not configured.");
    }
    loading.value = true;
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
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
      await newUserAlert("google");
      // I know this will have false positives, it's good to have alerts anyway
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

  const updateWeeklyReportEmailsPreference = async (enabled: boolean) => {
    loading.value = true;
    try {
      const response = await authenticatedFetch(
        notificationPreferencesApiPath,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            [WEEKLY_REPORT_EMAILS_METADATA_KEY]: enabled,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Unable to update notification preferences.");
      }
      const payload =
        (await response.json()) as NotificationPreferencesResponse;
      weeklyReportEmailsPreference.value =
        payload.weekly_report_emails_enabled ?? enabled;
    } finally {
      loading.value = false;
    }
  };

  const fetchWeeklyReportEmailsPreference = async () => {
    if (!isAuthenticated.value) return;

    const response = await authenticatedFetch(notificationPreferencesApiPath);
    if (!response.ok) {
      throw new Error("Unable to load notification preferences.");
    }
    const payload = (await response.json()) as NotificationPreferencesResponse;
    weeklyReportEmailsPreference.value =
      payload.weekly_report_emails_enabled ?? false;
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
    weeklyReportEmailsEnabled,
    initialize,
    signInWithPassword,
    signUpWithPassword,
    verifySignUpOtp,
    resendSignUpOtp,
    signInWithGoogle,
    sendPasswordResetEmail,
    updatePassword,
    updateWeeklyReportEmailsPreference,
    fetchWeeklyReportEmailsPreference,
    clearPasswordRecovery,
    signOut,
    dispose,
  };
});
