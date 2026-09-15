import { BOSS_BY_ID } from "@pokerancher/shared";
import type { StageCard } from "../api/client.js";
import { PokeSprite } from "./PokeSprite.js";
import { PixelIcon, type Palette } from "./pixel.js";

/**
 * The ten expeditions, as a road you climb.
 *
 * A locked stage is shown, not hidden: seeing that stage 7 ends on a Latias is
 * most of the reason to finish stage 6. What is hidden is only the boss's
 * *name* until you have beaten it — the silhouette is the tease.
 */

const BIOME: Record<string, { label: string; sky: string; ground: string }> = {
  prairie: { label: "Prairie", sky: "#9fdbe8", ground: "#7fb069" },
  foret: { label: "Forêt", sky: "#5f9a5e", ground: "#24452f" },
  grotte: { label: "Grotte", sky: "#5b5674", ground: "#3b3752" },
  cote: { label: "Côte", sky: "#5aa8c4", ground: "#c9a06a" },
  volcan: { label: "Volcan", sky: "#e07a86", ground: "#66452c" },
  cime: { label: "Cime", sky: "#c2bcd6", ground: "#fffdf5" },
};

const LOCK: Palette = { i: "currentColor" };
const LOCK_ART = [
  "..iiii..",
  ".i....i.",
  ".i....i.",
  "iiiiiiii",
  "iiiiiiii",
  "iii..iii",
  "iii..iii",
  "iiiiiiii",
];

const CHECK_ART = [
  "......ii",
  ".....ii.",
  "ii..ii..",
  ".ii.ii..",
  "..iiii..",
  "...ii...",
  "........",
  "........",
];

interface Props {
  stages: StageCard[];
  selected: string | null;
  onSelect: (stageId: string) => void;
}

/**
 * The ten expeditions, as a frieze across the top of the screen.
 *
 * Horizontal because the ten are a *road*: stage 3 comes after stage 2, and a
 * vertical list says that far less clearly than a line does. The connectors
 * between the tiles are the road; a cleared one lights up.
 */
export function StageSelect({ stages, selected, onSelect }: Props) {
  return (
    <ol className="stage-frieze">
      {stages.map((stage) => {
        const biome = BIOME[stage.biome] ?? BIOME.prairie;
        const boss = BOSS_BY_ID[stage.boss];
        const state = stage.cleared ? "done" : stage.unlocked ? "open" : "locked";

        return (
          <li key={stage.id} className={`frieze-step ${stage.cleared ? "frieze-step-done" : ""}`}>
            <button
              className={`stage-card stage-${state} ${selected === stage.id ? "stage-picked" : ""}`}
              style={{
                ["--stage-sky" as string]: biome.sky,
                ["--stage-ground" as string]: biome.ground,
              }}
              disabled={!stage.unlocked}
              onClick={() => onSelect(stage.id)}
              aria-pressed={selected === stage.id}
            >
              <span className="stage-index">{stage.index}</span>

              <span className="stage-boss">
                {boss && (
                  <span className={stage.cleared ? "" : "stage-boss-hidden"}>
                    <PokeSprite dex={boss.dex} name={boss.name} size={54} />
                  </span>
                )}
              </span>

              <span className="stage-body">
                <span className="stage-name">{stage.name}</span>
                <span className="stage-facts">
                  <span>Niv. {stage.level}</span>
                  <span>
                    ×{stage.foes}
                  </span>
                  <span>{stage.rows} étapes</span>
                </span>
                <span className="stage-boss-name">{stage.cleared ? boss?.name : "boss ???"}</span>
              </span>

              <span className="stage-flag">
                {state === "locked" && <PixelIcon art={LOCK_ART} palette={LOCK} size={18} />}
                {state === "done" && <PixelIcon art={CHECK_ART} palette={LOCK} size={18} />}
                {stage.inProgress && <span className="stage-live">en cours</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
