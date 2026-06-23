import { LifeBuoy } from "lucide-react";

export function SOSButton({ onClick, compact = false }) {
  return (
    <button className={compact ? "sos-button sos-button--compact" : "sos-button"} type="button" onClick={onClick}>
      <LifeBuoy size={compact ? 18 : 22} />
      <span>SOS</span>
    </button>
  );
}
