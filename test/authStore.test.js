import { beforeEach, describe, expect, test, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  newUserAlert: vi.fn(),
}));

vi.mock("../src/lib/supabase.ts", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithOAuth: mocks.signInWithOAuth,
    },
  }),
}));

vi.mock("../src/api/api.ts", () => ({
  newUserAlert: mocks.newUserAlert,
}));

import { useAuthStore } from "../src/store/auth.ts";

beforeEach(() => {
  setActivePinia(createPinia());
  mocks.signUp.mockReset();
  mocks.signInWithOAuth.mockReset();
  mocks.newUserAlert.mockReset();
});

describe("auth store signup alerts", () => {
  test("alerts only after a successful email signup", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    mocks.newUserAlert.mockResolvedValue(undefined);
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
    expect(mocks.newUserAlert).toHaveBeenCalledOnce();
    expect(mocks.newUserAlert).toHaveBeenCalledWith("new@example.com");
    expect(store.loading).toBe(false);
  });

  test("passes weekly report email opt-in during email signup", async () => {
    mocks.signUp.mockResolvedValue({ error: null });
    mocks.newUserAlert.mockResolvedValue(undefined);
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

  test("does not alert when email signup fails", async () => {
    const signupError = new Error("Email already registered");
    mocks.signUp.mockResolvedValue({ error: signupError });
    const store = useAuthStore();

    await expect(
      store.signUpWithPassword("existing@example.com", "password")
    ).rejects.toThrow("Email already registered");

    expect(mocks.newUserAlert).not.toHaveBeenCalled();
    expect(store.loading).toBe(false);
  });
});
