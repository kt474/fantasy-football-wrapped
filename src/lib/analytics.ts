import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean;
type AnalyticsProperties = Record<string, AnalyticsValue>;

export const trackEvent = (
  eventName: string,
  properties: AnalyticsProperties = {}
) => {
  track(eventName, properties);
};
