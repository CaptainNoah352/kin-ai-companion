import test from "node:test";
import assert from "node:assert/strict";
import { getKinHostingMode, isGithubPagesRuntime, shouldUseLocalApi } from "../src/lib/runtimeMode.js";

test("runtime mode defaults to local API support", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

  try {
    delete globalThis.__KIN_HOSTING_MODE__;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "127.0.0.1" },
    });

    assert.equal(getKinHostingMode(), "");
    assert.equal(isGithubPagesRuntime(), false);
    assert.equal(shouldUseLocalApi(), true);
  } finally {
    restoreGlobal("location", previousLocation);
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
  }
});

test("runtime mode disables local API on GitHub Pages", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;

  try {
    globalThis.__KIN_HOSTING_MODE__ = "github-pages";

    assert.equal(getKinHostingMode(), "github-pages");
    assert.equal(isGithubPagesRuntime(), true);
    assert.equal(shouldUseLocalApi(), false);
  } finally {
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
  }
});

test("github.io hostname is treated as static hosted mode", () => {
  const previousMode = globalThis.__KIN_HOSTING_MODE__;
  const previousLocation = Object.getOwnPropertyDescriptor(globalThis, "location");

  try {
    delete globalThis.__KIN_HOSTING_MODE__;
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: { hostname: "brand.github.io" },
    });

    assert.equal(isGithubPagesRuntime(), true);
    assert.equal(shouldUseLocalApi(), false);
  } finally {
    restoreGlobal("location", previousLocation);
    restoreValue("__KIN_HOSTING_MODE__", previousMode);
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
