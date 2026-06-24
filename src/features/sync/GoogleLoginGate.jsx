import { Cloud, Leaf, LogIn, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { isGoogleConfigured, signInWithGoogle } from "./googleAuthService.js";

export function GoogleLoginGate({ onSignIn }) {
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const configured = isGoogleConfigured();
  const origin = getCurrentOrigin();
  const preferredGoogleOrigin = getPreferredGoogleOrigin();
  const originProblem = getGoogleOriginProblem(origin);

  async function handleGoogleSignIn() {
    if (originProblem) {
      setError(
        preferredGoogleOrigin
          ? `Google sign-in cannot start from ${origin}. Open Kin from the HTTPS Tailscale URL instead.`
          : `Google sign-in cannot start from ${origin}. Set VITE_KIN_REMOTE_ORIGIN to your HTTPS Tailscale URL, then open Kin from that URL.`,
      );
      return;
    }
    setError("");
    setIsSigningIn(true);
    try {
      const profile = await signInWithGoogle();
      await onSignIn(profile);
    } catch (signInError) {
      setError(signInError.message || "Google sign-in did not complete.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="login-gate">
      <section className="login-card">
        <div className="brand login-card__brand">
          <div className="brand-mark">
            <Leaf size={28} />
          </div>
          <div>
            <h1>Kin</h1>
            <p>Private wellness support</p>
          </div>
        </div>

        <div className="login-card__body">
          <Cloud size={36} />
          <h2>Continue with Google</h2>
          <p>
            Kin uses your Google account to keep an encrypted Drive vault in your own app data folder. Private content
            stays hidden until you sign in and unlock your vault passcode.
          </p>
        </div>

        {configured && originProblem && (
          <div className="notice-strip notice-strip--warning origin-warning-card">
            <ShieldAlert size={18} />
            <span>
              Google sign-in cannot run from <code>{origin}</code>. Use your HTTPS Tailscale URL.
            </span>
            {preferredGoogleOrigin ? (
              <button className="secondary-button secondary-button--auto" type="button" onClick={() => openPreferredOrigin(preferredGoogleOrigin)}>
                Open secure Kin URL
              </button>
            ) : (
              <small>Set VITE_KIN_REMOTE_ORIGIN in .env.</small>
            )}
          </div>
        )}

        {configured ? (
          <button
            className="google-auth-button"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn || Boolean(originProblem)}
          >
            <span className="google-auth-button__mark">G</span>
            <span>{isSigningIn ? "Waiting for Google..." : "Continue with Google"}</span>
            <LogIn size={18} />
          </button>
        ) : (
          <div className="notice-strip">
            <ShieldAlert size={18} />
            Add <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google login.
          </div>
        )}

        {error && <p className="lock-error">{error}</p>}

        <div className="login-card__safety">
          <strong>Need immediate help?</strong>
          <p>In the U.S., call or text 988. Call emergency services if danger could be immediate.</p>
        </div>
      </section>
    </main>
  );
}

function getCurrentOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function getPreferredGoogleOrigin() {
  return import.meta.env?.VITE_KIN_REMOTE_ORIGIN || "";
}

function getGoogleOriginProblem(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (url.protocol === "https:") return "";
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return "";
    return "unsupported-http-origin";
  } catch {
    return "invalid-origin";
  }
}

function openPreferredOrigin(origin) {
  if (typeof window === "undefined") return;
  const nextUrl = new URL(origin);
  nextUrl.pathname = window.location.pathname;
  nextUrl.hash = window.location.hash;
  window.location.href = nextUrl.toString();
}
