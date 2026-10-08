// Small shared HUD components.
import { useSyncExternalStore } from "react";
import type { Role } from "../lib/gameTypes";
import { ROLE_META } from "../lib/gameTypes";
import type { GameToast } from "../lib/useMission";
import { getSettings, setSettings, sfx, subscribeSettings, vibrate } from "../lib/sound";

/** Panel with sci-fi corner brackets. */
export function HudPanel({
  children,
  className = "",
  tone = "blue",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "blue" | "yellow" | "red" | "white";
}) {
  return (
    <div className={`hud-panel hud-${tone} ${className}`}>
      <span className="hud-corner hud-tl" />
      <span className="hud-corner hud-tr" />
      <span className="hud-corner hud-bl" />
      <span className="hud-corner hud-br" />
      {children}
    </div>
  );
}

export function RoleIcon({ role, size = 20 }: { role: Role; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (role === "clearer") {
    // open box: picking things up and putting them away
    return (
      <svg {...common} aria-hidden="true">
        <path d="M3 9l9-5 9 5-9 5-9-5z" />
        <path d="M3 9v7l9 5 9-5V9" />
        <path d="M12 14v7" />
      </svg>
    );
  }
  if (role === "cleaner") {
    // sparkle: wiping and shining
    return (
      <svg {...common} aria-hidden="true">
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
        <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z" />
      </svg>
    );
  }
  // finisher: shield
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12 3l8 3v6c0 4.4-3.2 7.6-8 9-4.8-1.4-8-4.6-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function RoleBadge({ role, small = false }: { role: Role; small?: boolean }) {
  const meta = ROLE_META[role];
  return (
    <span className={`role-badge role-${role} ${small ? "role-badge-sm" : ""}`}>
      <RoleIcon role={role} size={small ? 14 : 18} />
      {meta.label}
    </span>
  );
}

/** Progress bar for a ship system, in the owning role's color. */
export function SystemBar({
  role,
  label,
  value,
  sub,
}: {
  role: Role;
  label: string;
  value: number; // 0..1
  sub?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className={`sysbar sysbar-${role}`}>
      <div className="sysbar-head">
        <span className="sysbar-label">
          <RoleIcon role={role} size={14} />
          {label}
        </span>
        <span className="sysbar-pct">{value >= 1 ? "ONLINE" : `${pct}%`}</span>
      </div>
      <div className="sysbar-track">
        <div className="sysbar-fill" style={{ width: `${Math.max(pct, 2)}%` }} />
        <div className="sysbar-ticks" />
      </div>
      {sub && <div className="sysbar-sub">{sub}</div>}
    </div>
  );
}

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: GameToast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          className={`toast ${t.role ? `toast-${t.role}` : "toast-neutral"}`}
          onClick={() => onDismiss(t.id)}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}

function useSettings() {
  return useSyncExternalStore(subscribeSettings, getSettings, getSettings);
}

export function SettingsToggles() {
  const s = useSettings();
  return (
    <div className="settings-toggles">
      <button
        className={`toggle-btn ${s.sound ? "on" : ""}`}
        onClick={() => {
          setSettings({ sound: !s.sound });
          if (!s.sound) sfx.tap();
        }}
        aria-pressed={s.sound}
        aria-label={s.sound ? "Mute sound" : "Enable sound"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          {s.sound ? (
            <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
          ) : (
            <path d="M16 9l6 6M22 9l-6 6" />
          )}
        </svg>
        SND
      </button>
      <button
        className={`toggle-btn ${s.vibration ? "on" : ""}`}
        onClick={() => {
          setSettings({ vibration: !s.vibration });
          if (!s.vibration) vibrate(40);
        }}
        aria-pressed={s.vibration}
        aria-label={s.vibration ? "Disable vibration" : "Enable vibration"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="8" y="3" width="8" height="18" rx="2" />
          {s.vibration && <path d="M4 8v8M20 8v8" />}
        </svg>
        VIB
      </button>
    </div>
  );
}
