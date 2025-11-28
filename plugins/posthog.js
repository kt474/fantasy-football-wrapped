//./plugins/posthog.js
import posthog from "posthog-js";

export default {
  install(app) {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    if (!key) {
      console.warn("PostHog key not set; analytics disabled.");
      return;
    }
    app.config.globalProperties.$posthog = posthog.init(key, {
      api_host: "https://us.i.posthog.com",
      persistence: "localStorage",
    });
  },
};
