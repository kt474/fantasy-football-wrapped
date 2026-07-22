import type { CheckoutPlan } from "@/lib/pendingCheckout";

export const PREMIUM_CHECKOUT_ATTRIBUTION_KEY =
  "premium-checkout-attribution";
export const PREMIUM_CHECKOUT_ATTRIBUTION_TTL_MS = 24 * 60 * 60 * 1000;

export type PremiumCheckoutAttribution = {
  funnelId: string;
  funnelSource: string;
  feature: string;
  plan: CheckoutPlan;
  billingInterval: string;
  priceUsd: number;
  bestValue: boolean;
};

type StoredPremiumCheckoutAttribution = PremiumCheckoutAttribution & {
  createdAt: number;
};

const isCheckoutPlan = (value: unknown): value is CheckoutPlan =>
  value === "annual" || value === "monthly";

export const createPremiumFunnelId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const savePremiumCheckoutAttribution = (
  attribution: PremiumCheckoutAttribution,
  storage: Storage = window.sessionStorage,
  now = Date.now()
) => {
  storage.setItem(
    PREMIUM_CHECKOUT_ATTRIBUTION_KEY,
    JSON.stringify({ ...attribution, createdAt: now })
  );
};

export const readPremiumCheckoutAttribution = (
  storage: Storage = window.sessionStorage,
  now = Date.now()
): PremiumCheckoutAttribution | null => {
  const raw = storage.getItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY);
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Partial<StoredPremiumCheckoutAttribution>;
    const expired =
      typeof value.createdAt !== "number" ||
      now - value.createdAt > PREMIUM_CHECKOUT_ATTRIBUTION_TTL_MS;
    if (
      expired ||
      typeof value.funnelId !== "string" ||
      typeof value.funnelSource !== "string" ||
      typeof value.feature !== "string" ||
      !isCheckoutPlan(value.plan) ||
      typeof value.billingInterval !== "string" ||
      typeof value.priceUsd !== "number" ||
      typeof value.bestValue !== "boolean"
    ) {
      storage.removeItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY);
      return null;
    }

    return {
      funnelId: value.funnelId,
      funnelSource: value.funnelSource,
      feature: value.feature,
      plan: value.plan,
      billingInterval: value.billingInterval,
      priceUsd: value.priceUsd,
      bestValue: value.bestValue,
    };
  } catch {
    storage.removeItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY);
    return null;
  }
};

export const clearPremiumCheckoutAttribution = (
  storage: Storage = window.sessionStorage
) => {
  storage.removeItem(PREMIUM_CHECKOUT_ATTRIBUTION_KEY);
};
