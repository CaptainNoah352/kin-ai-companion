import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { storageKeys } from "../src/lib/storage.js";

const root = resolve(import.meta.dirname, "..");

test("web app manifest is installable and phone-friendly", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "public", "site.webmanifest"), "utf8"));

  assert.equal(manifest.name, "Kin");
  assert.equal(manifest.short_name, "Kin");
  assert.equal(manifest.id, ".");
  assert.equal(manifest.start_url, ".");
  assert.equal(manifest.scope, ".");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#05140f");
  assert.equal(manifest.background_color, "#05140f");
  assert.equal(manifest.orientation, "portrait");
  assert.equal(manifest.prefer_related_applications, false);
  assert.ok(manifest.icons.some((icon) => icon.src === "kin-icon-192.png" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.src === "kin-maskable-512.png" && icon.purpose === "maskable"));
});

test("index includes iOS and browser install metadata", () => {
  const html = readFileSync(resolve(root, "index.html"), "utf8");

  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="Kin"/);
  assert.match(html, /name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="\/?kin-icon-180\.png"/);
  assert.match(html, /rel="manifest" href="\/?site\.webmanifest"/);
});

test("install hint dismissal has a local storage key", () => {
  assert.equal(storageKeys.installHintDismissed, "installHintDismissed");
});

test("navigation restore has local storage keys", () => {
  assert.equal(storageKeys.activeTab, "activeTab");
  assert.equal(storageKeys.pageScroll, "pageScroll");
});

test("public setup files do not hardcode a personal Tailscale address", () => {
  const publicSetupText = [
    readFileSync(resolve(root, "README.md"), "utf8"),
    readFileSync(resolve(root, ".env.example"), "utf8"),
    readFileSync(resolve(root, "vite.config.js"), "utf8"),
  ].join("\n");

  assert.equal(publicSetupText.includes("100.121.182.118"), false);
  assert.equal(publicSetupText.includes("darkroom-alley.taild04360.ts.net"), false);
});

test("google oauth client id is available for GitHub Pages builds", async () => {
  const { getGoogleClientId } = await import("../src/features/sync/googleAuthService.js");

  assert.match(getGoogleClientId(), /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/);
});

test("google sign-in requests Drive app-data scope for vault restore", () => {
  const authSource = readFileSync(resolve(root, "src", "features", "sync", "googleAuthService.js"), "utf8");

  assert.match(authSource, /openid email profile/);
  assert.match(authSource, /https:\/\/www\.googleapis\.com\/auth\/drive\.appdata/);
  assert.match(authSource, /signInScope/);
});
