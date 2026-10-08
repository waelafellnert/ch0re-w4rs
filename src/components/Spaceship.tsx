// The shared ship. Every crew member sees the same hull; each system's glow
// is driven by real chore progress: navigation (Clearer, blue), engines
// (Cleaner, yellow), shields (Finisher, red). A null system means nobody
// picked that chore this mission — the hardware was never installed.

interface SpaceshipProps {
  nav: number | null; // 0..1, null = no Clearer aboard
  eng: number | null; // 0..1, null = no Cleaner aboard
  shields: number | null; // 0..1, null = no Finisher aboard
  mode?: "grounded" | "launching" | "flying";
  className?: string;
}

export function Spaceship({
  nav,
  eng,
  shields,
  mode = "grounded",
  className = "",
}: SpaceshipProps) {
  const navOn = nav !== null && nav >= 1;
  const engOn = eng !== null && eng >= 1;
  const shdOn = shields !== null && shields >= 1;
  const flame = mode === "launching" || mode === "flying" ? 1 : (eng ?? 0);

  return (
    <svg
      viewBox="0 0 220 300"
      className={`ship ship-${mode} ${className}`}
      role="img"
      aria-label="Crew spaceship status"
    >
      <defs>
        <linearGradient id="hullGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8e9cb8" />
          <stop offset="45%" stopColor="#e8edf6" />
          <stop offset="100%" stopColor="#6b7891" />
        </linearGradient>
        <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="40%" stopColor="#ffd23f" />
          <stop offset="100%" stopColor="#ff7a3d" />
        </linearGradient>
        <radialGradient id="windowGrad" cx="0.5" cy="0.4" r="0.8">
          <stop offset="0%" stopColor="#d9f6ff" />
          <stop offset="60%" stopColor="#35d6ff" />
          <stop offset="100%" stopColor="#0a5e8f" />
        </radialGradient>
      </defs>

      {/* shield bubble */}
      {shields !== null && (
        <ellipse
          cx="110"
          cy="150"
          rx="92"
          ry="128"
          className={`ship-shield ${shdOn ? "on" : ""}`}
          style={{ opacity: 0.12 + shields * 0.55 }}
        />
      )}

      {/* ground pad */}
      {mode === "grounded" && (
        <g className="ship-pad">
          <rect x="40" y="268" width="140" height="6" rx="3" fill="#1b2740" />
          <rect x="60" y="276" width="100" height="4" rx="2" fill="#141d31" />
        </g>
      )}

      <g className="ship-body">
        {/* engine flames */}
        <g
          className="ship-flames"
          style={{ opacity: flame > 0 ? 0.35 + flame * 0.65 : 0 }}
        >
          <polygon
            className="flame flame-big"
            points="92,252 110,252 101,296"
            fill="url(#flameGrad)"
            style={{ transform: `scaleY(${0.5 + flame * (mode === "grounded" ? 0.5 : 1.3)})` }}
          />
          <polygon
            className="flame flame-big flame-right"
            points="110,252 128,252 119,296"
            fill="url(#flameGrad)"
            style={{ transform: `scaleY(${0.5 + flame * (mode === "grounded" ? 0.5 : 1.3)})` }}
          />
          <polygon
            className="flame flame-core"
            points="100,252 120,252 110,286"
            fill="#fffdf0"
            style={{ transform: `scaleY(${0.4 + flame * 0.8})` }}
          />
        </g>

        {/* landing legs */}
        {mode === "grounded" && (
          <g stroke="#4a5a78" strokeWidth="6" strokeLinecap="round">
            <line x1="72" y1="232" x2="56" y2="266" />
            <line x1="148" y1="232" x2="164" y2="266" />
          </g>
        )}

        {/* fins */}
        <path d="M66 180 L36 248 L70 236 Z" fill="#ff3d5a" stroke="#b01f38" strokeWidth="3" />
        <path d="M154 180 L184 248 L150 236 Z" fill="#ff3d5a" stroke="#b01f38" strokeWidth="3" />

        {/* hull */}
        <path
          d="M110 18 C140 52 152 96 152 150 C152 198 144 232 134 252 L86 252 C76 232 68 198 68 150 C68 96 80 52 110 18 Z"
          fill="url(#hullGrad)"
        />
        <path
          d="M110 18 C140 52 152 96 152 150 C152 198 144 232 134 252 L86 252 C76 232 68 198 68 150 C68 96 80 52 110 18 Z"
          fill="none"
          stroke="#222f4d"
          strokeWidth="4"
        />
        {/* nose cone */}
        <path
          d="M110 18 C122 32 130 48 134 64 L86 64 C90 48 98 32 110 18 Z"
          fill="#ff3d5a"
          stroke="#b01f38"
          strokeWidth="3"
        />

        {/* panel lines */}
        <line x1="72" y1="150" x2="148" y2="150" stroke="#9fb0cc" strokeWidth="2" />
        <line x1="76" y1="196" x2="144" y2="196" stroke="#9fb0cc" strokeWidth="2" />
        <circle cx="128" cy="172" r="4" fill="#9fb0cc" />
        <circle cx="92" cy="172" r="4" fill="#9fb0cc" />

        {/* nav dish */}
        <g className={`ship-dish ${navOn ? "on" : ""}`} style={{ opacity: 0.35 + (nav ?? 0) * 0.65 }}>
          <line x1="110" y1="18" x2="110" y2="2" stroke="#35d6ff" strokeWidth="3" />
          <circle className="dish-light" cx="110" cy="2" r="4" fill="#35d6ff" />
        </g>

        {/* cockpit window = navigation */}
        <circle
          cx="110"
          cy="104"
          r="22"
          fill="url(#windowGrad)"
          stroke="#223355"
          strokeWidth="4"
          className={`ship-window ${navOn ? "on" : ""}`}
          style={{ opacity: 0.25 + (nav ?? 0) * 0.75 }}
        />
        <circle cx="103" cy="97" r="6" fill="#ffffff" opacity={0.3 + (nav ?? 0) * 0.6} />

        {/* system indicator lights */}
        <g className="ship-lights">
          <rect x="84" y="206" width="52" height="18" rx="6" fill="#141d31" stroke="#2a3a5f" strokeWidth="2" />
          <circle cx="97" cy="215" r="5" className={`sys-light ${navOn ? "lit" : ""}`} fill={nav === null ? "#1a2238" : navOn ? "#35d6ff" : "#1f3350"} />
          <circle cx="110" cy="215" r="5" className={`sys-light ${engOn ? "lit" : ""}`} fill={eng === null ? "#1a2238" : engOn ? "#ffd23f" : "#3d3516"} />
          <circle
            cx="123"
            cy="215"
            r="5"
            className={`sys-light ${shdOn ? "lit" : ""}`}
            fill={shields === null ? "#1a2238" : shdOn ? "#ff3d5a" : "#44202a"}
          />
        </g>

        {/* engine nozzles */}
        <path d="M88 252 L84 264 L104 264 L104 252 Z" fill="#39466b" stroke="#222f4d" strokeWidth="3" />
        <path d="M132 252 L136 264 L116 264 L116 252 Z" fill="#39466b" stroke="#222f4d" strokeWidth="3" />
        <rect
          x="88"
          y="240"
          width="44"
          height="10"
          rx="4"
          className={`ship-engine-bar ${engOn ? "on" : ""}`}
          fill="#ffd23f"
          style={{ opacity: 0.15 + (eng ?? 0) * 0.85 }}
        />
      </g>
    </svg>
  );
}
