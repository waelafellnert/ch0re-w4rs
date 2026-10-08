// Full-screen "how to play" walkthrough for new players, opened from the
// welcome screen. Pure presentation — reuses the real game visuals (ship,
// role icons, system bars) so the tutorial matches what players will see.
import { useEffect } from "react";
import type { Role } from "../lib/gameTypes";
import { ROLE_META } from "../lib/gameTypes";
import { Spaceship } from "./Spaceship";
import { HudPanel, RoleIcon, SystemBar } from "./ui";

const ROLES: Role[] = ["clearer", "cleaner", "finisher"];

export function HowToPlay({ onClose }: { onClose: () => void }) {
  // Escape closes; lock the page behind the overlay while it's open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="howto-overlay" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="howto-sheet">
        <header className="howto-head">
          <h2 className="howto-title">HOW TO PLAY</h2>
          <button className="howto-close" onClick={onClose} aria-label="Close how to play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            CLOSE
          </button>
        </header>

        <p className="howto-intro">
          Chore Wars turns cleaning your home into a co-op space mission. Real
          chores power a shared spaceship — finish them all and launch together.
        </p>

        <HudPanel tone="blue" className="howto-step">
          <div className="howto-step-head">
            <span className="howto-step-num">1</span>
            <h3 className="howto-step-title">ASSEMBLE YOUR CREW</h3>
          </div>
          <p className="howto-step-text">
            One player taps <strong>CREATE MISSION</strong> and picks a room and
            mission length. You get a 4-letter room code — crewmates scan the QR
            code or type it on <strong>their own phone</strong>. 2–3 players per
            ship.
          </p>
          <div className="howto-fig">
            <div className="howto-code" aria-hidden="true">
              {["S", "U", "D", "S"].map((c, i) => (
                <span key={i} className="howto-code-char">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </HudPanel>

        <HudPanel tone="yellow" className="howto-step">
          <div className="howto-step-head">
            <span className="howto-step-num">2</span>
            <h3 className="howto-step-title">GET YOUR ROLE</h3>
          </div>
          <p className="howto-step-text">
            Each crew member gets a role in join order, and each role powers one
            ship system. The <strong>Clearer</strong> picks up and puts away, the{" "}
            <strong>Cleaner</strong> wipes and shines, the <strong>Finisher</strong>{" "}
            locks in the final reset.
          </p>
          <div className="howto-fig">
            <div className="howto-roles">
              {ROLES.map((role) => (
                <div key={role} className={`howto-role howto-role-${role}`}>
                  <RoleIcon role={role} size={22} />
                  <span className="howto-role-name">{ROLE_META[role].label}</span>
                  <span className="howto-role-sys">{ROLE_META[role].system.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </HudPanel>

        <HudPanel tone="red" className="howto-step">
          <div className="howto-step-head">
            <span className="howto-step-num">3</span>
            <h3 className="howto-step-title">DO REAL CHORES</h3>
          </div>
          <p className="howto-step-text">
            Your phone lists your tasks for the room. Do the chore for real,
            then tap it done — your ship system charges up. Some tasks wait on a
            teammate: the Cleaner can&apos;t wipe a counter the Clearer hasn&apos;t
            cleared yet.
          </p>
          <div className="howto-fig howto-fig-col">
            <div className="howto-tasks" aria-hidden="true">
              <div className="howto-task done">
                <span className="howto-task-box">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l6 6L20 6" />
                  </svg>
                </span>
                Clear the counters
              </div>
              <div className="howto-task">
                <span className="howto-task-box" />
                Wipe counters down
              </div>
              <div className="howto-task locked">
                <span className="howto-task-box" />
                Take the trash out
                <span className="howto-task-lock">CLEANER UNLOCKS</span>
              </div>
            </div>
            <SystemBar role="cleaner" label="ENGINES" value={0.67} />
          </div>
        </HudPanel>

        <HudPanel tone="white" className="howto-step">
          <div className="howto-step-head">
            <span className="howto-step-num">4</span>
            <h3 className="howto-step-title">LAUNCH TOGETHER</h3>
          </div>
          <p className="howto-step-text">
            When every task is done, all systems come online. The whole crew
            holds <strong>LAUNCH</strong> on their own phones at the same time —
            the countdown syncs across every screen, and the ship lifts off.
          </p>
          <div className="howto-fig howto-launch">
            <Spaceship nav={1} eng={1} shields={1} mode="grounded" />
            <span className="howto-hold-btn" aria-hidden="true">
              HOLD TO LAUNCH
            </span>
          </div>
        </HudPanel>

        <button className="btn btn-primary btn-xl" onClick={onClose}>
          GOT IT — LET&apos;S FLY
        </button>
      </div>
    </div>
  );
}
