import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  authenticatedBackendFetch: vi.fn(),
}));

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
};

vi.mock("../src/lib/supabase.ts", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithOAuth: mocks.signInWithOAuth,
      getSession: mocks.getSession,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  }),
}));

vi.mock("../src/lib/backendApi.ts", () => ({
  authenticatedBackendFetch: mocks.authenticatedBackendFetch,
}));

import { useAuthStore } from "../src/store/auth.ts";

const pendingGooglePreferenceKey =
  "pending-google-auth-weekly-report-emails";

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.signUp.mockReset();
  mocks.signInWithOAuth.mockReset();
  mocks.getSession.mockReset();
  mocks.exchangeCodeForSession.mockReset();
  mocks.onAuthStateChange.mockReset();
  mocks.authenticatedBackendFetch.mockReset();
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  vi.stubGlobal("sessionStorage", createStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth store initialization", () => {
  test("concurrent callers wait for the same session initialization", async () => {
    let resolveSession;
    mocks.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      })
    );
    vi.stubGlobal("window", {
      location: { href: "https://ffwrapped.com/account" },
    });
    const store = useAuthStore();

    const firstInitialization = store.initialize();
    let secondInitializationFinished = false;
    const secondInitialization = store.initialize().then(() => {
      secondInitializationFinished = true;
    });

    await Promise.resolve();
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(secondInitializationFinished).toBe(false);

    resolveSession({ data: { session: null } });
    await Promise.all([firstInitialization, secondInitialization]);

    expect(store.initialized).toBe(true);
    expect(mocks.onAuthStateChange).toHaveBeenCalledOnce();
  });
});

describe("auth store signup", () => {
  test("submits a successful email signup", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    const store = useAuthStore();

    await store.signUpWithPassword("new@example.com", "password");

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password",
      options: {
        data: {
          weekly_report_emails_enabled: false,
          weekly_report_emails_opted_at: expect.any(String),
          weekly_report_emails_source: "signup",
        },
      },
    });
    expect(store.loading).toBe(false);
  });

  test("passes weekly report email opt-in during email signup", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    const store = useAuthStore();

    await store.signUpWithPassword("new@example.com", "password", true);

    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({
            weekly_report_emails_enabled: true,
            weekly_report_emails_source: "signup",
          }),
        }),
      })
    );
  });

  test("propagates an email signup failure", async () => {
    const signupError = new Error("Email already registered");
    mocks.signUp.mockResolvedValue({ error: signupError });
    const store = useAuthStore();

    await expect(
      store.signUpWithPassword("existing@example.com", "password")
    ).rejects.toThrow("Email already registered");

    expect(store.loading).toBe(false);
  });
});

describe("auth store Google signup", () => {
  test("stores an unchecked weekly email preference outside the OAuth URL", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    const store = useAuthStore();

    await store.signInWithGoogle(
      "https://ffwrapped.com/account?intent=premium",
      false
    );

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://ffwrapped.com/account?intent=premium",
      },
    });
    expect(sessionStorage.getItem(pendingGooglePreferenceKey)).toBe("false");
  });

  test("applies the signup preference after Google authentication", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    vi.stubGlobal("window", {
      location: { href: "https://ffwrapped.com/account" },
    });
    const store = useAuthStore();

    await store.signInWithGoogle("https://ffwrapped.com/account", true);
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: { id: "user-id", user_metadata: {} },
        },
      },
    });
    mocks.authenticatedBackendFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ weekly_report_emails_enabled: true }),
    });
    await store.initialize();

    await store.applyPendingGoogleAuthPreference();

    expect(mocks.authenticatedBackendFetch).toHaveBeenCalledWith(
      "/api/userPref",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          weekly_report_emails_enabled: true,
        }),
      })
    );
    expect(store.weeklyReportEmailsEnabled).toBe(true);
    expect(sessionStorage.getItem(pendingGooglePreferenceKey)).toBeNull();
  });

  test("does not write a preference during a normal Google login", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    const store = useAuthStore();

    await store.signInWithGoogle("https://ffwrapped.com/account");

    expect(mocks.authenticatedBackendFetch).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(pendingGooglePreferenceKey)).toBeNull();
  });

  test("a successful manual update supersedes a failed pending signup preference", async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    vi.stubGlobal("window", {
      location: { href: "https://ffwrapped.com/account" },
    });
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: { id: "user-id", user_metadata: {} },
        },
      },
    });
    mocks.authenticatedBackendFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ weekly_report_emails_enabled: false }),
      });
    const store = useAuthStore();

    await store.signInWithGoogle("https://ffwrapped.com/account", true);
    await store.initialize();

    await expect(store.applyPendingGoogleAuthPreference()).rejects.toThrow(
      "Unable to update notification preferences."
    );
    expect(sessionStorage.getItem(pendingGooglePreferenceKey)).toBe("true");

    await store.updateWeeklyReportEmailsPreference(false);
    expect(sessionStorage.getItem(pendingGooglePreferenceKey)).toBeNull();

    await store.applyPendingGoogleAuthPreference();
    expect(mocks.authenticatedBackendFetch).toHaveBeenCalledTimes(2);
    expect(store.weeklyReportEmailsEnabled).toBe(false);
  });

  test("ignores email preference query parameters without pending session state", async () => {
    vi.stubGlobal("window", {
      location: {
        href: "https://ffwrapped.com/account?google_auth_weekly_report_emails=true",
      },
    });
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          user: { id: "user-id", user_metadata: {} },
        },
      },
    });
    const store = useAuthStore();
    await store.initialize();

    await store.applyPendingGoogleAuthPreference();

    expect(mocks.authenticatedBackendFetch).not.toHaveBeenCalled();
  });
});
