import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 988,
    strictPort: true,
    allowedHosts: ["darkroom-alley.taild04360.ts.net"],
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
