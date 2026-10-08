// Deep-space background: three parallax star layers + a drifting nebula glow.
// Star positions come from a seeded PRNG so SSR and client render identically.

import { useMemo } from "react";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starShadows(seed: number, count: number, color: string): string {
  const rand = mulberry32(seed);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(rand() * 2000);
    const y = Math.round(rand() * 2000);
    parts.push(`${x}px ${y}px ${color}`);
  }
  return parts.join(",");
}

export function Starfield({ warp = false }: { warp?: boolean }) {
  const layers = useMemo(
    () => [
      { shadow: starShadows(7, 110, "#8fa3c8"), size: 1, dur: 220 },
      { shadow: starShadows(23, 60, "#cfe4ff"), size: 2, dur: 150 },
      { shadow: starShadows(41, 24, "#ffffff"), size: 3, dur: 95 },
    ],
    [],
  );
  return (
    <div className={`starfield ${warp ? "starfield-warp" : ""}`} aria-hidden="true">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      {layers.map((l, i) => (
        <div
          key={i}
          className="star-layer"
          style={{
            width: l.size,
            height: l.size,
            boxShadow: l.shadow,
            animationDuration: `${warp ? l.dur / 30 : l.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
