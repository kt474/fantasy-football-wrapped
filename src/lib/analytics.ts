import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean;
type AnalyticsProperties = Record<string, AnalyticsValue | undefined>;

const hasPostHogKey = Boolean(import.meta.env.VITE_POSTHOG_KEY);

export const trackEvent = (
  eventName: string,
  properties: AnalyticsProperties = {}
) => {
  if (!hasPostHogKey) return;

  posthog.capture(eventName, compactProperties(properties));
};

export const trackPremiumFunnelEvent = (
  step: string,
  properties: AnalyticsProperties = {}
) => {
  trackEvent("Premium Funnel Step", {
    step,
    path: typeof window === "undefined" ? undefined : window.location.pathname,
    ...properties,
  });
};

export const trackPageView = (path: string, title?: string) => {
  if (!hasPostHogKey) return;

  posthog.capture("$pageview", {
    $current_url: window.location.href,
    path,
    title: title ?? document.title,
  });
};

export const identifyUser = (
  userId: string,
  properties: AnalyticsProperties = {}
) => {
  if (!hasPostHogKey) return;

  posthog.identify(userId, properties);
};

export const setUserProperties = (properties: AnalyticsProperties) => {
  if (!hasPostHogKey) return;

  posthog.setPersonProperties(compactProperties(properties));
};

export const resetAnalytics = () => {
  if (!hasPostHogKey) return;

  posthog.reset();
};

const compactProperties = (properties: AnalyticsProperties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as Record<string, AnalyticsValue>;
