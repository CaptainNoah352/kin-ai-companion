import test from "node:test";
import assert from "node:assert/strict";
import {
  buildKinApiUrl,
  getKinApiBaseUrl,
  getKinHostingMode,
  isGithubPagesRuntime,
  isKinApiBaseUrlStaticHost,
  shouldUseKinApiBackend,
  shouldUseLocalApi,
} from "../src/lib/runtimeMode.js";

test("runtime mode defaults to local API support", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

  try {
    delete globalThis.__KIN_HOSTING_MODE__;
    delete globalThis.__KIN_API_BASE_URL__;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "127.0.0.1" },
    });

    assert.equal(getKinHostingMode(), "");
    assert.equal(getKinApiBaseUrl(), "");
    assert.equal(isGithubPagesRuntime(), false);
    assert.equal(shouldUseLocalApi(), true);
    assert.equal(shouldUseKinApiBackend(), true);
    assert.equal(buildKinApiUrl("/api/health"), "/api/health");
  } finally {
    restoreGlobal("location", previousLocation);
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

test("runtime mode disables local API on GitHub Pages", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;

  try {
    globalThis.__KIN_HOSTING_MODE__ = "github-pages";
    delete globalThis.__KIN_API_BASE_URL__;

    assert.equal(getKinHostingMode(), "github-pages");
    assert.equal(isGithubPagesRuntime(), true);
    assert.equal(shouldUseLocalApi(), false);
    assert.equal(shouldUseKinApiBackend(), false);
  } finally {
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

test("github.io hostname is treated as static hosted mode", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

  try {
    delete globalThis.__KIN_HOSTING_MODE__;
    delete globalThis.__KIN_API_BASE_URL__;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "brand.github.io" },
    });

    assert.equal(isGithubPagesRuntime(), true);
    assert.equal(shouldUseLocalApi(), false);
  } finally {
    restoreGlobal("location", previousLocation);
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

test("hosted runtime uses configured Kin API backend", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;

  try {
    globalThis.__KIN_HOSTING_MODE__ = "github-pages";
    globalThis.__KIN_API_BASE_URL__ = "https://api.example.com/";

    assert.equal(getKinApiBaseUrl(), "https://api.example.com");
    assert.equal(isKinApiBaseUrlStaticHost(), false);
    assert.equal(shouldUseLocalApi(), false);
    assert.equal(shouldUseKinApiBackend(), true);
    assert.equal(buildKinApiUrl("/api/chat"), "https://api.example.com/api/chat");
    assert.equal(buildKinApiUrl("api/health"), "https://api.example.com/api/health");
  } finally {
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

test("configured Kin API backend strips accidental trailing api path", () => {
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;

  try {
    globalThis.__KIN_API_BASE_URL__ = "https://api.example.com/api/";

    assert.equal(getKinApiBaseUrl(), "https://api.example.com");
    assert.equal(buildKinApiUrl("/api/health"), "https://api.example.com/api/health");
  } finally {
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

test("github pages origin is detected as a bad Kin API backend", () => {
  const previousApiBaseUrl = globalThis.__KIN_API_BASE_URL__;

  try {
    globalThis.__KIN_API_BASE_URL__ = "https://captainnoah352.github.io/kin-ai-companion";

    assert.equal(getKinApiBaseUrl(), "https://captainnoah352.github.io/kin-ai-companion");
    assert.equal(isKinApiBaseUrlStaticHost(), true);
  } finally {
    restoreValue("__KIN_API_BASE_URL__", previousApiBaseUrl);
  }
});

function restoreValue(key, value) {
  if (value === undefined) delete globalThis[key];
  else globalThis[key] = value;
}

function restoreGlobal(key, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, key, descriptor);
  } else {
    delete globalThis[key];
  }
}
