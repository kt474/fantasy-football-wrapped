import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean;
type AnalyticsProperties = Record<string, AnalyticsValue>;

const hasPostHogKey = Boolean(import.meta.env.VITE_POSTHOG_KEY);

export const trackEvent = (
  eventName: string,
  properties: AnalyticsProperties = {}
) => {
  if (!hasPostHogKey) return;

  posthog.capture(eventName, properties);
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

  posthog.setPersonProperties(properties);
};

export const resetAnalytics = () => {
  if (!hasPostHogKey) return;

  posthog.reset();
};
