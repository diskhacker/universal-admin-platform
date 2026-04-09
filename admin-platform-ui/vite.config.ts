import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Optional: proxy to UAP backend in dev to avoid CORS issues.
      // Uses VITE_API_BASE_URL in production builds.
      "/api": {
        target: "http://localhost:4100",
        changeOrigin: true,
      },
    },
  },
});
