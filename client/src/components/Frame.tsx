import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import { PixelIcon, type Palette } from "./pixel.js";

/**
 * The wooden frame every panel on the site sits in.
 *
 * The plank band itself is CSS — layered repeating gradients for grain, four
 * hard box-shadows for the pixel outline, and four background-positioned
 * squares for the iron pegs. Only the greenery is a sprite, because leaves need
 * an actual silhouette and a gradient cannot give you one.
 *
 * Greenery is decorative and `aria-hidden`; nothing here is in the tab order.
 */

const IVY: Palette = {
  d: "var(--c-forest)",
  g: "var(--c-grass-mid)",
  h: "var(--c-grass-hi)",
  s: "var(--c-wood-dk)",
  f: "var(--c-blush)",
};

/** A leafy sprig that hangs over a corner. */
const SPRIG = [
  "....dd......",
  "...dggd.....",
  "..dghhgd....",
  "..dggggd....",
  "...dddd.....",
  "....ss......",
  "...ss.......",
  "..ss...dd...",
  ".ss...dggd..",
  ".s...dghhgd.",
  "s....dggggd.",
  "......dddd..",
];

/** A longer trailing vine with a single flower, for the tall panels. */
const VINE = [
  "..ss..",
  "..ss..",
  ".dds..",
  "dggds.",
  "dghgds",
  ".dds..",
  "..ss..",
  "..ss..",
  "..sdd.",
  ".sdggd",
  ".sdghg",
  "..sdd.",
  "..ss..",
  "..ss..",
  ".ffs..",
  "fhffs.",
  ".ffs..",
  "..ss..",
];

export type FrameTone = "paper" | "sunken" | "dark";

interface FrameProps {
  children: ReactNode;
  /** Inner surface colour. */
  tone?: FrameTone;
  /** Thin band, no pegs, no greenery — for cards inside a frame. */
  thin?: boolean;
  /** Which corners get a sprig. Ignored when `thin`. */
  greenery?: "none" | "corner" | "both" | "vine";
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "article" | "aside";
  onClick?: MouseEventHandler<HTMLElement>;
  role?: string;
  "aria-modal"?: boolean;
  "aria-label"?: string;
}

export function Frame({
  children,
  tone = "paper",
  thin = false,
  greenery = "corner",
  className = "",
  style,
  as: Tag = "section",
  ...rest
}: FrameProps) {
  const decorated = !thin && greenery !== "none";

  return (
    <Tag
      className={`frame frame-${tone} ${thin ? "frame-thin" : ""} ${className}`.trim()}
      style={style}
      {...rest}
    >
      {decorated && (
        <span className="frame-green frame-green-tl" aria-hidden="true">
          <PixelIcon art={SPRIG} palette={IVY} size={30} />
        </span>
      )}
      {decorated && (greenery === "both" || greenery === "vine") && (
        <span className="frame-green frame-green-br" aria-hidden="true">
          <PixelIcon art={greenery === "vine" ? VINE : SPRIG} palette={IVY} size={greenery === "vine" ? 34 : 26} />
        </span>
      )}
      <div className="frame-inner">{children}</div>
    </Tag>
  );
}
