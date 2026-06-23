import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function getAllowedHosts() {
  const configured = process.env.KIN_ALLOWED_HOSTS || "";
  const hosts = configured
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts.length ? hosts : [".ts.net"];
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 988,
    strictPort: true,
    allowedHosts: getAllowedHosts(),
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
