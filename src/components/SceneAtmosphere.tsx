"use client";

import type { CSSProperties } from "react";

/**
 * Feature 4 — Atmosphäre über dem Fixbild.
 * Wasser = untere ~40% (Wasserlinie ca. bei 60% von oben).
 *
 * Schichten:
 *  A2 WaterlineGlow  — Schimmer auf der Wasserlinie
 *  A3 Caustics       — Lichtflecken unter Wasser
 *  A4 Sparkles       — kleine Glitzerpunkte im Wasser
 *  A5 Birds          — Silhouetten am Himmel
 *  A6 SunGlint       — Sonnenblitz am Horizont (Insel-Seite)
 */
export function SceneAtmosphere() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      {/* A2 — WaterlineGlow (Meeresspiegel ~60%) */}
      <div data-atm="A2-waterline" className="atm-waterline" />

      {/* A3 — Caustics (nur untere 40%) */}
      <div data-atm="A3-caustics" className="atm-caustics" />

      {/* A4 — Sparkles im Wasser */}
      <div data-atm="A4-sparkles" className="atm-sparkles">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="atm-sparkle"
            style={
              {
                "--sx": `${8 + ((i * 17) % 84)}%`,
                "--sy": `${62 + ((i * 11) % 32)}%`,
                "--sd": `${(i % 7) * 0.45}s`,
                "--ss": `${0.7 + (i % 4) * 0.25}`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* A5 — Birds (sichtbarer, ohne Überfüllung) */}
      <div data-atm="A5-birds" className="atm-birds">
        <Bird className="atm-bird atm-bird-a" width={36} height={15} opacity={0.5} />
        <Bird className="atm-bird atm-bird-b" width={26} height={11} opacity={0.4} />
        <Bird className="atm-bird atm-bird-c" width={22} height={9} opacity={0.35} />
        <Bird className="atm-bird atm-bird-d" width={30} height={13} opacity={0.42} />
        <Bird className="atm-bird atm-bird-e" width={20} height={8} opacity={0.32} />
        <Bird className="atm-bird atm-bird-f" width={24} height={10} opacity={0.38} />
        <Bird className="atm-bird atm-bird-g" width={18} height={7} opacity={0.3} />
      </div>

      {/* A6 — SunGlint nahe Horizont / Insel (rechts) */}
      <div data-atm="A6-sunglint" className="atm-sunglint" />
    </div>
  );
}

function Bird({
  className,
  width,
  height,
  opacity,
}: {
  className: string;
  width: number;
  height: number;
  opacity: number;
}) {
  return (
    <svg className={className} viewBox="0 0 40 16" width={width} height={height}>
      <path
        d="M2 10 Q12 2 20 10 Q28 2 38 10"
        fill="none"
        stroke={`rgba(30,45,55,${opacity})`}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
