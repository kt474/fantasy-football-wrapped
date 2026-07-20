import path from "node:path";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    ...(mode === "development" ? [vueDevTools()] : []),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.webp", "robots.txt"],
      manifest: {
        name: "ffwrapped",
        short_name: "ffwrapped",
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
        cleanupOutdatedCaches: true,
        // Keep installation lightweight. Feature bundles are cached only after
        // a user visits them instead of downloading the entire app up front.
        // The plugin adds the manifest, its icons, and includeAssets entries.
        globPatterns: ["index.html"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css|webp)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "app-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
