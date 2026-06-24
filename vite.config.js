import react from "@vitejs/plugin-react";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = realpathSync(fileURLToPath(new URL(".", import.meta.url)));
const githubPagesRepo = process.env.GITHUB_REPOSITORY?.split("/")[1] || "kin-ai-companion";
const base = process.env.GITHUB_PAGES === "true" ? `/${githubPagesRepo}/` : "/";

function kinHtmlEntryPlugin() {
  const staticLoaderPattern =
    /[ \t]*<!-- kin-static-loader-start -->[\s\S]*?<!-- kin-static-loader-end -->\r?\n?/g;

  return {
    name: "kin-html-entry",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace(staticLoaderPattern, "")
          .replace("<!-- kin-vite-entry -->", '<script type="module" src="/src/main.jsx"></script>');
      },
    },
  };
}

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
  base,
  plugins: [kinHtmlEntryPlugin(), react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  server: {
    port: 988,
    strictPort: true,
    allowedHosts: getAllowedHosts(),
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
});
