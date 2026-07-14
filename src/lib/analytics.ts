type AnalyticsValue = string | number | boolean;
type AnalyticsProperties = Record<string, AnalyticsValue | undefined>;
type AnalyticsClient = {
  capture: (
    eventName: string,
    properties?: Record<string, AnalyticsValue>
  ) => void;
  identify: (userId: string, properties?: AnalyticsProperties) => void;
  setPersonProperties: (properties: Record<string, AnalyticsValue>) => void;
  reset: () => void;
};
type PendingAnalyticsOperation = (client: AnalyticsClient) => void;

const postHogKey = import.meta.env.VITE_POSTHOG_KEY;
const hasPostHogKey = Boolean(postHogKey);
const pendingOperations: PendingAnalyticsOperation[] = [];
let analyticsClient: AnalyticsClient | null = null;
let analyticsLoadPromise: Promise<AnalyticsClient | null> | null = null;

const runWithAnalytics = (operation: PendingAnalyticsOperation) => {
  if (!hasPostHogKey) return;
  if (analyticsClient) {
    operation(analyticsClient);
    return;
  }
  pendingOperations.push(operation);
};

const loadAnalytics = () => {
  if (!postHogKey) return Promise.resolve(null);
  if (analyticsLoadPromise) return analyticsLoadPromise;

  analyticsLoadPromise = import("posthog-js").then(({ default: posthog }) => {
    analyticsClient = posthog.init(postHogKey, {
      api_host: "https://us.i.posthog.com",
      capture_pageview: false,
      persistence: "localStorage",
      autocapture: false,
    });

    pendingOperations.splice(0).forEach((operation) => {
      if (analyticsClient) operation(analyticsClient);
    });
    return analyticsClient;
  });

  return analyticsLoadPromise;
};

export const initializeAnalytics = () => {
  if (!hasPostHogKey) return;

  const scheduleLoad = () => {
    const requestIdleCallback = (
      window as Window &
        typeof globalThis & {
          requestIdleCallback?: (callback: IdleRequestCallback) => number;
        }
    ).requestIdleCallback;

    if (requestIdleCallback) {
      requestIdleCallback(() => void loadAnalytics());
      return;
    }
    window.setTimeout(() => void loadAnalytics(), 1500);
  };

  if (document.readyState === "complete") {
    scheduleLoad();
    return;
  }
  window.addEventListener("load", scheduleLoad, { once: true });
};

export const trackEvent = (
  eventName: string,
  properties: AnalyticsProperties = {}
) => {
  if (!hasPostHogKey) return;

  runWithAnalytics((posthog) => {
    posthog.capture(eventName, compactProperties(properties));
  });
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

  const currentUrl = window.location.href;
  const currentTitle = title ?? document.title;
  runWithAnalytics((posthog) => {
    posthog.capture("$pageview", {
      $current_url: currentUrl,
      path,
      title: currentTitle,
    });
  });
};

export const identifyUser = (
  userId: string,
  properties: AnalyticsProperties = {}
) => {
  if (!hasPostHogKey) return;

  runWithAnalytics((posthog) => posthog.identify(userId, properties));
};

export const setUserProperties = (properties: AnalyticsProperties) => {
  if (!hasPostHogKey) return;

  runWithAnalytics((posthog) =>
    posthog.setPersonProperties(compactProperties(properties))
  );
};

export const resetAnalytics = () => {
  if (!hasPostHogKey) return;

  runWithAnalytics((posthog) => posthog.reset());
};

const compactProperties = (properties: AnalyticsProperties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  ) as Record<string, AnalyticsValue>;
