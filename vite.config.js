// Explicit multi-page build inputs for the existing customer site and admin pages.
// This does not change routes, APIs, or rendering behavior.
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        website: resolve(process.cwd(), "index.html"),
        studio: resolve(process.cwd(), "admin.html"),
        templates: resolve(process.cwd(), "admin-templates.html"),
        videos: resolve(process.cwd(), "admin-videos.html"),
        drafts: resolve(process.cwd(), "admin-drafts.html")
      }
    }
  }
});
