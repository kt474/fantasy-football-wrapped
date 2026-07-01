import posthog from "posthog-js";
import type { App, Plugin } from "vue";

const posthogPlugin: Plugin = {
  install(app: App) {
    if (!import.meta.env.VITE_POSTHOG_KEY) {
      return;
    }

    app.config.globalProperties.$posthog = posthog.init(
      import.meta.env.VITE_POSTHOG_KEY,
      {
        api_host: "https://us.i.posthog.com",
        capture_pageview: false,
        persistence: "localStorage",
      }
    );
  },
};

export default posthogPlugin;
