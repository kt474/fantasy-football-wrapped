export type CheckoutPlan = "annual" | "monthly";

type PendingCheckout = {
  plan: CheckoutPlan;
  createdAt: number;
};

export const PENDING_CHECKOUT_KEY = "pending-premium-checkout";
export const PENDING_CHECKOUT_TTL_MS = 30 * 60 * 1000;

const isCheckoutPlan = (value: unknown): value is CheckoutPlan =>
  value === "annual" || value === "monthly";

export const savePendingCheckout = (
  plan: CheckoutPlan,
  storage: Storage = window.sessionStorage,
  now = Date.now()
) => {
  const pending: PendingCheckout = { plan, createdAt: now };
  storage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));
};

export const clearPendingCheckout = (
  storage: Storage = window.sessionStorage
) => {
  storage.removeItem(PENDING_CHECKOUT_KEY);
};

export const consumePendingCheckout = (
  storage: Storage = window.sessionStorage,
  now = Date.now()
): CheckoutPlan | null => {
  const raw = storage.getItem(PENDING_CHECKOUT_KEY);
  storage.removeItem(PENDING_CHECKOUT_KEY);
  if (!raw) return null;

  try {
    const pending = JSON.parse(raw) as Partial<PendingCheckout>;
    const expired =
      typeof pending.createdAt !== "number" ||
      now - pending.createdAt > PENDING_CHECKOUT_TTL_MS;

    return isCheckoutPlan(pending.plan) && !expired ? pending.plan : null;
  } catch {
    return null;
  }
};
