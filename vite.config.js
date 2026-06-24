import react from "@vitejs/plugin-react";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = realpathSync(fileURLToPath(new URL(".", import.meta.url)));

function getAllowedHosts() {
  const configured = process.env.KIN_ALLOWED_HOSTS || "";
  const hosts = configured
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return hosts.length ? hosts : [".ts.net"];
}

export default defineConfig({
  root: projectRoot,
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
