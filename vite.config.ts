import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: "autoUpdate",
      // Disable SW minification to avoid occasional terser renderChunk crashes
      minify: false,
      includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
      manifest: {
        name: "Fantasy Football Wrapped",
        short_name: "Fantasy Wrapped",
        description: "Fantasy football league insights",
        theme_color: "#f8fafc",
        display: "standalone",
        icons: [
          {
            src: "192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Skip minifying the generated service worker to avoid terser renderChunk crashes
        mode: "development",
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            // Always go to network for admin UI and API calls; avoid SW cache or fallback
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/api\.sleeper\.app\/v1/,
            handler: "CacheFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        navigateFallbackDenylist: [/^\/admin\//, /^\/api\//],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ["vue", "vue-router", "pinia"],
          charts: ["apexcharts", "vue3-apexcharts"],
          analytics: ["posthog-js", "@vercel/analytics"],
        },
      },
    },
  },
});
