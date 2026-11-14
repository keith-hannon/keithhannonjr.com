import { defineConfig } from "vite";
import { resolve } from "path";
import { SITE } from "./site.config.js";

// Fills %SITE_NAME% / %SITE_TAGLINE% / %SITE_URL% in the HTML pages from
// site.config.js at build time, so link previews and search engines see them.
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const injectSite = {
  name: "inject-site-config",
  transformIndexHtml(html) {
    return html
      .replaceAll("%SITE_NAME%", esc(SITE.name))
      .replaceAll("%SITE_TAGLINE%", esc(SITE.tagline))
      .replaceAll("%SITE_URL%", SITE.url.replace(/\/$/, ""));
  },
};

export default defineConfig({
  base: "./",
  plugins: [injectSite],
  build: {
    target: "es2019",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        simple: resolve(__dirname, "simple.html"),
        daily: resolve(__dirname, "daily.html"),
      },
    },
  },
  server: { host: true },
});
