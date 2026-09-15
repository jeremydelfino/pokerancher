import type { RunNode } from "@pokerancher/shared";
import type { RunView } from "../api/client.js";
import { PixelIcon, type Palette } from "./pixel.js";

/**
 * The expedition trail.
 *
 * Drawn bottom-up: the entrance is at the bottom and the boss at the top, so
 * progress climbs the panel instead of falling down it. The dotted spine behind
 * the rows is what makes a branching map read as one road rather than a grid of
 * loose buttons.
 */

const MARK: Palette = {
  i: "currentColor",
  a: "var(--c-danger)",
  g: "var(--c-gold)",
  w: "var(--c-white)",
};

const ICONS: Record<string, string[]> = {
  combat: [
    "i.......i",
    ".i.....i.",
    "..i...i..",
    "...i.i...",
    "....i....",
    "...i.i...",
    "..ii.ii..",
    ".ii...ii.",
    "i.......i",
  ],
  elite: [
    "....g....",
    "i..ggg..i",
    ".i.ggg.i.",
    "..i...i..",
    "...i.i...",
    "...i.i...",
    "..ii.ii..",
    ".ii...ii.",
    "i.......i",
  ],
  boss: [
    "..iiiii..",
    ".iiiiiii.",
    "iiaiiiaii",
    "iiaiiiaii",
    "iiiiiiiii",
    "iiiiiiiii",
    ".iiiiiii.",
    "..i.i.i..",
    "..i.i.i..",
  ],
  event: [
    "..iiiii..",
    ".ii...ii.",
    ".......ii",
    "....iiii.",
    "...ii....",
    "...ii....",
    ".........",
    "...ii....",
    "...ii....",
  ],
  reward: [
    ".iiiiiii.",
    "ii.....ii",
    "iiiiiiiii",
    "iiiiiiiii",
    "iiii.iiii",
    "iiig.giii",
    "iiiiiiiii",
    "iiiiiiiii",
    ".iiiiiii.",
  ],
  shop: [
    "...ii....",
    "..i..i...",
    "..i..i...",
    ".iiiiii..",
    "iiiiiiii.",
    "ii.gg.ii.",
    "ii.gg.ii.",
    "iiiiiiii.",
    ".iiiiii..",
  ],
  rest: [
    "....g....",
    "...ggg...",
    "..gg.gg..",
    "..g...g..",
    "...ggg...",
    ".........",
    "i.......i",
    ".ii...ii.",
    "..iiiii..",
  ],
};

export const NODE_LABEL: Record<string, string> = {
  combat: "Combat",
  elite: "Élite",
  event: "Événement",
  reward: "Trésor",
  shop: "Échoppe",
  rest: "Camp",
  boss: "Boss",
};

interface Props {
  view: RunView;
  busy: boolean;
  onEnter: (nodeId: string) => void;
}

export function RunMapView({ view, busy, onEnter }: Props) {
  const visited = new Set(view.state.path);
  const available = new Set(view.available);
  const currentRow = view.map.rows.findIndex((row) =>
    row.some((node) => node.id === view.state.currentNodeId)
  );

  // Rendered in reverse so row 0 (the entrance) sits at the bottom.
  const rows = [...view.map.rows].reverse();

  return (
    <div className="trail">
      <span className="trail-spine" aria-hidden="true" />

      {rows.map((row, reversedIndex) => {
        const rowIndex = view.map.rows.length - 1 - reversedIndex;
        return (
          <div
            className={`trail-row ${rowIndex === currentRow ? "trail-row-here" : ""}`}
            key={rowIndex}
          >
            <span className="trail-depth" aria-hidden="true">
              {rowIndex + 1}
            </span>
            <div className="trail-nodes">
              {row.map((node: RunNode) => {
                const open = available.has(node.id);
                const done = visited.has(node.id);
                const here = node.id === view.state.currentNodeId;
                return (
                  <button
                    key={node.id}
                    className={`trail-node node-${node.type} ${open ? "node-open" : ""} ${
                      done ? "node-done" : ""
                    } ${here ? "node-here" : ""}`}
                    disabled={!open || busy}
                    onClick={() => onEnter(node.id)}
                    title={open ? `Aller au ${NODE_LABEL[node.type]}` : NODE_LABEL[node.type]}
                  >
                    <span className="trail-node-mark">
                      <PixelIcon art={ICONS[node.type] ?? ICONS.combat} palette={MARK} size={22} />
                    </span>
                    <span className="trail-node-label">{NODE_LABEL[node.type] ?? node.type}</span>
                    {done && (
                      <span className="trail-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
