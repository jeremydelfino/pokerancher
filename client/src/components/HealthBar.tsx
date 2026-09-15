import { useEffect, useRef, useState } from "react";

/**
 * A pixel health bar with a trailing "lost" layer.
 *
 * The white ghost behind the fill hangs back for a beat before catching up, so
 * a hit reads as an amount taken off rather than a bar that is simply shorter
 * than it was. That lag is the whole reason this is a component and not a div.
 */

const GHOST_DELAY = 260;

export function HealthBar({
  hp,
  maxHp,
  size = "md",
  showNumbers = true,
  label,
}: {
  hp: number;
  maxHp: number;
  size?: "sm" | "md" | "lg";
  showNumbers?: boolean;
  label?: string;
}) {
  const safeMax = Math.max(1, maxHp);
  const ratio = Math.max(0, Math.min(1, hp / safeMax));
  const [ghost, setGhost] = useState(ratio);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Only the drop is worth dramatising — healing should snap straight up.
    if (ratio >= ghost) {
      setGhost(ratio);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setGhost(ratio), GHOST_DELAY);
    return () => clearTimeout(timer.current);
  }, [ratio, ghost]);

  const state = ratio <= 0 ? "out" : ratio < 0.25 ? "low" : ratio < 0.55 ? "hurt" : "ok";

  return (
    <span className={`hp hp-${size} hp-${state}`} title={label ?? `${hp} / ${maxHp} PV`}>
      <span className="hp-track">
        <span className="hp-ghost" style={{ transform: `scaleX(${ghost})` }} />
        <span className="hp-fill" style={{ transform: `scaleX(${ratio})` }} />
        <span className="hp-gloss" aria-hidden="true" />
      </span>
      {showNumbers && (
        <span className="hp-numbers">
          {Math.max(0, Math.round(hp))}
          <span className="hp-max">/{Math.round(safeMax)}</span>
        </span>
      )}
    </span>
  );
}
