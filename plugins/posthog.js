//./plugins/posthog.js
import posthog from "posthog-js";

export default {
  install(app) {
    app.config.globalProperties.$posthog = posthog.init(
      import.meta.env.VITE_POSTHOG_KEY,
      {
        api_host: "https://www.ffwrapped.com/ingest",
        ui_host: "https://us.posthog.com",
        persistence: "localStorage",
      }
    );
  },
};
