"use client";

/**
 * Feature 4 — Atmosphäre über dem Fixbild.
 * Wasser = untere ~40% (Wasserlinie ca. bei 60% von oben).
 *
 * Schichten zum Abwählen:
 *  A1 WindSwooshes   — Striche am Himmel
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
      {/* A1 — WindSwooshes */}
      <svg
        data-atm="A1-wind"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          className="atm-wind-stroke atm-wind-1"
          d="M8,18 Q22,14 36,19 T58,16 T82,20"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.35"
          strokeLinecap="round"
        />
        <path
          className="atm-wind-stroke atm-wind-2"
          d="M12,28 Q30,24 48,29 T78,26"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.28"
          strokeLinecap="round"
        />
        <path
          className="atm-wind-stroke atm-wind-3"
          d="M5,12 Q25,8 45,13 T70,10 T95,14"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.22"
          strokeLinecap="round"
        />
      </svg>

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
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* A5 — Birds */}
      <div data-atm="A5-birds" className="atm-birds">
        <svg className="atm-bird atm-bird-a" viewBox="0 0 40 16" width="28" height="12">
          <path
            d="M2 10 Q12 2 20 10 Q28 2 38 10"
            fill="none"
            stroke="rgba(30,45,55,0.45)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <svg className="atm-bird atm-bird-b" viewBox="0 0 40 16" width="20" height="9">
          <path
            d="M2 10 Q12 2 20 10 Q28 2 38 10"
            fill="none"
            stroke="rgba(30,45,55,0.35)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <svg className="atm-bird atm-bird-c" viewBox="0 0 40 16" width="16" height="7">
          <path
            d="M2 10 Q12 2 20 10 Q28 2 38 10"
            fill="none"
            stroke="rgba(30,45,55,0.3)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* A6 — SunGlint nahe Horizont / Insel (rechts) */}
      <div data-atm="A6-sunglint" className="atm-sunglint" />
    </div>
  );
}
