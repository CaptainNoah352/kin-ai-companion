const googleScriptSrc = "https://accounts.google.com/gsi/client?hl=en";
const driveScope = "https://www.googleapis.com/auth/drive.appdata";
const profileScope = "openid email profile";
const signInScope = `${profileScope} ${driveScope}`;
const googleUserInfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
const googleTokenTimeoutMs = 90000;
const defaultGoogleClientId = "524721215499-7jl63p40vilprfhin56vr9k8as4s1mm5.apps.googleusercontent.com";

let scriptPromise = null;

export function getGoogleClientId() {
  return import.meta.env?.VITE_GOOGLE_CLIENT_ID || defaultGoogleClientId;
}

export function isGoogleConfigured() {
  return Boolean(getGoogleClientId());
}

export async function loadGoogleIdentity() {
  if (typeof window === "undefined") throw new Error("Google login is available only in the browser.");
  if (window.google?.accounts) return window.google;
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${googleScriptSrc}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google));
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = googleScriptSrc;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google login script could not be loaded."));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export async function initializeGoogleSignIn({ buttonElement, onCredential }) {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
  const google = await loadGoogleIdentity();
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      const profile = decodeGoogleCredential(response.credential);
      onCredential({
        ...profile,
        credentialIssuedAt: new Date().toISOString(),
      });
    },
  });

  if (buttonElement) {
    google.accounts.id.renderButton(buttonElement, {
      theme: "outline",
      size: "large",
      type: "standard",
      shape: "rectangular",
      text: "continue_with",
      locale: "en",
      width: Math.min(320, buttonElement.clientWidth || 320),
    });
  }
}

export async function requestDriveAccessToken({ prompt = "consent" } = {}) {
  return requestGoogleAccessToken({ prompt, scope: driveScope });
}

export async function signInWithGoogle() {
  const accessToken = await requestGoogleAccessToken({ prompt: "consent", scope: signInScope });
  const profile = await fetchGoogleProfile(accessToken);
  return {
    ...profile,
    accessToken,
    signedInAt: new Date().toISOString(),
  };
}

async function requestGoogleAccessToken({ prompt = "consent", scope }) {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
  const google = await loadGoogleIdentity();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Google sign-in did not finish. Close the blank Google window and try again, or open Kin in Chrome/Safari."));
    }, googleTokenTimeoutMs);

    function finish(callback) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      callback();
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (response) => {
        if (response.error) {
          finish(() => reject(new Error(response.error_description || response.error)));
          return;
        }
        finish(() => resolve(response.access_token));
      },
      error_callback: (error) => {
        const type = error?.type || "unknown";
        const messages = {
          popup_failed_to_open: "Google sign-in popup could not open. Allow popups for Kin and try again.",
          popup_closed: "Google sign-in was closed before it finished.",
          unknown: "Google sign-in did not complete.",
        };
        finish(() => reject(new Error(messages[type] || messages.unknown)));
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(googleUserInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google profile could not be loaded.");
  }
  return {
    sub: data.sub || "",
    email: data.email || "",
    name: data.name || data.email || "Google user",
    picture: data.picture || "",
  };
}

export async function revokeGoogleToken(accessToken) {
  if (!accessToken) return;
  const google = await loadGoogleIdentity();
  google.accounts.oauth2.revoke(accessToken);
}

export function decodeGoogleCredential(credential) {
  if (!credential || typeof credential !== "string") {
    throw new Error("Google did not return a valid credential.");
  }
  const payload = credential.split(".")[1];
  const json = JSON.parse(base64UrlDecode(payload));
  return {
    sub: json.sub || "",
    email: json.email || "",
    name: json.name || json.email || "Google user",
    picture: json.picture || "",
    signedInAt: new Date().toISOString(),
  };
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  if (typeof atob === "function") {
    return decodeURIComponent(
      Array.from(atob(base64))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  }
  return Buffer.from(base64, "base64").toString("utf8");
}
