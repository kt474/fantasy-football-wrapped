import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

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

import { useAuthStore } from "../src/store/auth.ts";

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.signUp.mockReset();
  mocks.signInWithOAuth.mockReset();
  mocks.getSession.mockReset();
  mocks.exchangeCodeForSession.mockReset();
  mocks.onAuthStateChange.mockReset();
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
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
