import type { LeagueInfoType } from "@/types/types";

type AnalyticsValue = string | number | boolean;
export type AnalyticsProperties = Record<
  string,
  AnalyticsValue | undefined
>;
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

const FEATURE_NAMES = {
  Home: "home",
  Standings: "standings",
  "Power Rankings": "power_rankings",
  "Expected Wins": "expected_wins",
  "Roster Management": "roster_management",
  "Weekly Report": "weekly_report",
  Playoffs: "playoffs",
  "Start/Sit": "start_sit",
  "Season Forecast": "season_forecast",
  "Trade Lab": "trade_lab",
  Draft: "draft",
  "League History": "league_history",
  "Manager Profiles": "manager_profiles",
  Wrapped: "wrapped",
} as const;

export type AnalyticsFeature = (typeof FEATURE_NAMES)[keyof typeof FEATURE_NAMES];

export const getAnalyticsFeature = (tab: string): AnalyticsFeature | null =>
  FEATURE_NAMES[tab as keyof typeof FEATURE_NAMES] ?? null;

export const getLeagueSizeBucket = (leagueSize: number) => {
  if (leagueSize <= 8) return "8_or_less";
  if (leagueSize === 10) return "10";
  if (leagueSize === 12) return "12";
  if (leagueSize >= 14) return "14_plus";
  return "other";
};

export const getSeasonPhase = (
  league: Pick<
    LeagueInfoType,
    "status" | "lastScoredWeek" | "currentWeek" | "regularSeasonLength"
  >
) => {
  const status = league.status.toLowerCase();
  if (status === "complete") return "complete";
  if (status === "post_season") return "postseason";
  if (status === "pre_draft" || status === "drafting") return "preseason";
  if (
    league.lastScoredWeek > league.regularSeasonLength ||
    league.currentWeek > league.regularSeasonLength
  ) {
    return "playoffs";
  }
  if (league.lastScoredWeek <= 0) return "preseason";
  return "regular_season";
};

export const getLeagueAnalyticsProperties = (
  league?: LeagueInfoType
): AnalyticsProperties => {
  if (!league) {
    return { has_real_league: false };
  }

  return {
    has_real_league: true,
    platform: league.platform === "espn" ? "espn" : "sleeper",
    season: league.season,
    season_phase: getSeasonPhase(league),
    league_format: league.seasonType || "unknown",
    league_size_bucket: getLeagueSizeBucket(league.totalRosters),
  };
};

type FeatureViewInput = {
  path: string;
  tab: string;
  leagueKey?: string;
  properties?: AnalyticsProperties;
};

type AnalyticsCapture = (
  eventName: string,
  properties?: AnalyticsProperties
) => void;

export const createFeatureViewTracker = (
  capture: AnalyticsCapture = trackEvent
) => {
  let lastSignature = "";

  return ({ path, tab, leagueKey, properties = {} }: FeatureViewInput) => {
    if (path !== "/") {
      lastSignature = "";
      return false;
    }

    const feature = getAnalyticsFeature(tab);
    if (!feature) return false;

    const signature = `${path}:${feature}:${leagueKey || "demo"}`;
    if (signature === lastSignature) return false;
    lastSignature = signature;

    capture("Feature Viewed", {
      feature,
      ...properties,
    });
    return true;
  };
};
