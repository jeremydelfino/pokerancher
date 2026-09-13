import { useMemo } from "react";

/** Decorative, non-interactive backdrop: sky, drifting clouds, rolling hills, floating pollen. */

function Cloud({ width, opacity }: { width: number; opacity: number }) {
  return (
    <svg width={width} viewBox="0 0 200 80" fill="currentColor" aria-hidden="true">
      <g opacity={opacity}>
        <ellipse cx="60" cy="52" rx="44" ry="26" />
        <ellipse cx="104" cy="40" rx="36" ry="30" />
        <ellipse cx="142" cy="54" rx="32" ry="22" />
        <rect x="40" y="52" width="120" height="24" rx="12" />
      </g>
    </svg>
  );
}

const CLOUDS = [
  { top: "9%", width: 220, opacity: 0.95, duration: 96, delay: -12 },
  { top: "20%", width: 150, opacity: 0.7, duration: 132, delay: -58 },
  { top: "32%", width: 280, opacity: 0.85, duration: 118, delay: -86 },
  { top: "5%", width: 120, opacity: 0.55, duration: 158, delay: -30 },
];

export function Ambience({ variant = "soft" }: { variant?: "full" | "soft" }) {
  const pollen = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 5.7 + ((i * 37) % 11)) % 100}%`,
        duration: 16 + ((i * 7) % 13),
        delay: -((i * 3.3) % 20),
        drift: `${((i * 29) % 90) - 45}px`,
        scale: 0.6 + ((i * 13) % 9) / 10,
      })),
    []
  );

  const blades = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        height: 26 + ((i * 17) % 44),
        duration: `${3.2 + ((i * 7) % 22) / 10}s`,
        delay: `${-((i * 4) % 30) / 10}s`,
      })),
    []
  );

  return (
    <div className="ambience" aria-hidden="true">
      <div className="ambience-sky" />
      <div className="ambience-sun" />

      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: cloud.top,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <Cloud width={cloud.width} opacity={cloud.opacity} />
        </div>
      ))}

      <div className="pollen-field">
        {pollen.map((p, i) => (
          <span
            key={i}
            className="pollen"
            style={{
              left: p.left,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              transform: `scale(${p.scale})`,
              ["--pollen-x" as string]: p.drift,
            }}
          />
        ))}
      </div>

      <svg className="hills" viewBox="0 0 1440 420" preserveAspectRatio="none">
        <path d="M0 214 C220 150 340 240 560 214 C760 190 900 128 1120 168 C1270 196 1360 186 1440 166 L1440 420 L0 420 Z" fill="var(--meadow-far)" opacity="0.85" />
        <path d="M0 282 C200 232 360 306 600 282 C820 260 980 208 1200 246 C1300 264 1380 258 1440 246 L1440 420 L0 420 Z" fill="var(--meadow-near)" opacity="0.92" />
        <path d="M0 350 C240 316 420 372 680 352 C900 336 1080 300 1440 330 L1440 420 L0 420 Z" fill="var(--meadow-deep)" />
      </svg>

      {variant === "full" && (
        <div className="grass-blades">
          {blades.map((b, i) => (
            <span
              key={i}
              className="blade"
              style={{ height: b.height, animationDuration: b.duration, animationDelay: b.delay }}
            />
          ))}
        </div>
      )}

      {variant === "soft" && <div className="ambience-veil" />}
    </div>
  );
}
