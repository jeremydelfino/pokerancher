import { useMemo } from "react";
import { PixelIcon, PixelLayer, makeGrid, noise, ridge, stamp, toRows, type Palette } from "./pixel.js";

/**
 * The animated backdrop: a banded sky, sun rays, drifting pixel clouds, a
 * celestial body, layered hill silhouettes with tree lines, and fireflies over
 * the meadow. Every colour is a themed variable, and the pieces that only suit
 * one hour (stars, fireflies, rays) fade out via their own opacity token
 * rather than being conditionally rendered.
 *
 * Purely decorative — it never reacts to input.
 */

const SKY_PALETTE: Palette = {
  i: "var(--cloud)",
  j: "var(--cloud-shade)",
  o: "var(--celestial)",
  n: "var(--celestial-mark)",
};

const HILL_PALETTE: Palette = {
  a: "var(--hill-far)",
  b: "var(--hill-mid)",
  c: "var(--hill-tree-a)",
  d: "var(--hill-tree-b)",
  n: "var(--hill-near)",
  e: "var(--hill-deep)",
};

const MOON = [
  "....oooooo....",
  "..oooooooooo..",
  ".oooooooooooo.",
  ".oooooooooooo.",
  "oooooonooooooo",
  "ooooonnooooooo",
  "ooooooooonnooo",
  "oooooooooonooo",
  ".oooooooooooo.",
  ".oooooooooooo.",
  "..oooooooooo..",
  "....oooooo....",
];

const CLOUD_SMALL = [
  "...iiii....",
  ".iiiiiiii..",
  "iiiiiiiiiii",
  ".jjjjjjjjj.",
];

const CLOUD_MID = [
  "......iiii......",
  "...iiiiiiiiii...",
  ".iiiiiiiiiiiiii.",
  "iiiiiiiiiiiiiiii",
  ".jjjjjjjjjjjjjj.",
];

const CLOUD_BIG = [
  ".......iiiiii.......",
  "....iiiiiiiiiiii....",
  "..iiiiiiiiiiiiiiii..",
  "iiiiiiiiiiiiiiiiiiii",
  "..jjjjjjjjjjjjjjjj..",
];

const CLOUDS = [
  { art: CLOUD_BIG, top: "8%", scale: 5, duration: 118, delay: -20, opacity: 0.5 },
  { art: CLOUD_MID, top: "17%", scale: 4, duration: 152, delay: -74, opacity: 0.38 },
  { art: CLOUD_SMALL, top: "27%", scale: 3, duration: 96, delay: -44, opacity: 0.3 },
  { art: CLOUD_MID, top: "36%", scale: 6, duration: 186, delay: -120, opacity: 0.26 },
];

/** Dark conifer silhouette dotted along the ridge lines. */
const PINE = [
  "..x..",
  ".xxx.",
  "..x..",
  ".xxx.",
  "xxxxx",
  "..x..",
];

const HILL_W = 240;
const HILL_H = 60;

function buildHills(): string[] {
  const g = makeGrid(HILL_W, HILL_H);

  // Three ridges, each a sum of two sines so the crests never repeat visibly.
  ridge(g, (x) => 22 + Math.sin(x / 19) * 4 + Math.sin(x / 6.5 + 1.3) * 2, "a");
  ridge(g, (x) => 33 + Math.sin(x / 13 + 2) * 4 + Math.sin(x / 5 + 0.4) * 1.5, "b");

  // Tree line rides the second ridge before the front hill buries its feet.
  for (let i = 0; i < 34; i++) {
    const x = Math.round(noise(i * 3.1) * HILL_W);
    const top = 33 + Math.sin(x / 13 + 2) * 4 + Math.sin(x / 5 + 0.4) * 1.5;
    const art = PINE.map((row) => row.replace(/x/g, noise(i * 7.7) > 0.5 ? "d" : "c"));
    stamp(g, art, x, Math.round(top) - PINE.length + 1);
  }

  ridge(g, (x) => 44 + Math.sin(x / 23 + 4) * 3 + Math.sin(x / 9) * 1.2, "n");
  ridge(g, (x) => 53 + Math.sin(x / 31 + 1) * 2, "e");

  return toRows(g);
}

export function Ambience({ variant = "soft" }: { variant?: "full" | "soft" }) {
  const hills = useMemo(buildHills, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        left: `${noise(i * 1.7) * 100}%`,
        top: `${noise(i * 4.3) * 92}%`,
        duration: `${2.2 + noise(i * 2.9) * 3.4}s`,
        delay: `${-noise(i * 5.1) * 4}s`,
        big: noise(i * 8.3) > 0.86,
      })),
    []
  );

  const fireflies = useMemo(
    () =>
      Array.from({ length: variant === "full" ? 20 : 10 }, (_, i) => ({
        left: `${noise(i * 2.3) * 100}%`,
        bottom: `${noise(i * 6.1) * 40}%`,
        duration: `${7 + noise(i * 3.7) * 7}s`,
        delay: `${-noise(i * 9.2) * 12}s`,
        x: `${(noise(i * 11.3) - 0.5) * 70}px`,
        y: `${-40 - noise(i * 13.1) * 90}px`,
      })),
    [variant]
  );

  return (
    <div className="ambience" aria-hidden="true">
      <div className="ambience-sky" />

      {/* Sits right after the sky so document order keeps it above the sky and
          below everything else — no z-index, which would escape to the wrong
          stacking context. */}
      <div className="ray-anchor">
        <div className="sun-rays" />
      </div>

      <div className="ambience-stars">
        {stars.map((star, i) => (
          <span
            key={i}
            className={`star ${star.big ? "star-big" : ""}`}
            style={{
              left: star.left,
              top: star.top,
              animationDuration: star.duration,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      <div className="ambience-moon">
        <PixelIcon art={MOON} palette={SKY_PALETTE} size={72} />
      </div>

      {CLOUDS.map((cloud, i) => (
        <div
          key={i}
          className="cloud"
          style={{
            top: cloud.top,
            opacity: cloud.opacity,
            animationDuration: `${cloud.duration}s`,
            animationDelay: `${cloud.delay}s`,
          }}
        >
          <PixelIcon
            art={cloud.art}
            palette={SKY_PALETTE}
            size={cloud.art[0].length * cloud.scale}
          />
        </div>
      ))}

      <svg
        className="hills"
        viewBox={`0 0 ${HILL_W} ${HILL_H}`}
        preserveAspectRatio="xMidYMax slice"
        shapeRendering="crispEdges"
      >
        <PixelLayer rows={hills} palette={HILL_PALETTE} />
      </svg>

      <div className="firefly-field">
        {fireflies.map((fly, i) => (
          <span
            key={i}
            className="firefly"
            style={{
              left: fly.left,
              bottom: fly.bottom,
              animationDuration: fly.duration,
              animationDelay: fly.delay,
              ["--ff-x" as string]: fly.x,
              ["--ff-y" as string]: fly.y,
            }}
          />
        ))}
      </div>

      <div className="ambience-dither" />
      <div className="ambience-veil" />
    </div>
  );
}
