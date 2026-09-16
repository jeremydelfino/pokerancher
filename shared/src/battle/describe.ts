import { MOVES, type MoveDefinition } from "../data/moves.js";

/**
 * Explaining a move in words, with its numbers.
 *
 * "Plante · 55 puis. · 95 % · 15 PP" tells a player who already knows Pokémon
 * what the move is. It tells everyone else nothing, and it says nothing at all
 * about the half of the catalogue whose point is its `effect`.
 *
 * The rules encoded here are the engine's, not a paraphrase of them — in
 * particular that a drain move heals from the damage it dealt while a status
 * heal works off max hit points. Getting that wrong in the interface is how a
 * player picks Vampigraine expecting Synthèse.
 */

/** 0.95 → "95 %", and never "95.00000000000001 %". */
const pct = (value: number) => `${Math.round(value * 100)} %`;

/** 1.5 → "50 %", 0.75 → "25 %". The size of the change, not the multiplier. */
const shift = (value: number) => `${Math.round(Math.abs(1 - value) * 100)} %`;

export interface MoveFacts {
  /** "Physique", "Spéciale", "Statut". */
  category: string;
  /** Short chips, in reading order: type, power, accuracy, PP. */
  chips: string[];
  /** Full sentences: the flavour line, then what the move mechanically does. */
  lines: string[];
}

const CATEGORY_LABEL: Record<MoveDefinition["category"], string> = {
  physique: "Physique",
  speciale: "Spéciale",
  statut: "Statut",
};

/** What the move's `effect` does, spelled out with its number. */
export function describeMoveEffect(move: MoveDefinition): string | null {
  const { effect } = move;
  if (!effect) return null;

  switch (effect.kind) {
    case "heal":
      // Two different rules behind one effect kind, and the engine picks by
      // whether the move deals damage. Say which one applies here.
      return move.power > 0
        ? `Rend à l'utilisateur ${pct(effect.value)} des dégâts infligés.`
        : `Rend ${pct(effect.value)} des PV maximum de l'utilisateur.`;

    case "buff_attack":
      return `Augmente l'attaque de l'utilisateur de ${shift(effect.value)} pour le reste du combat.`;

    case "buff_defense":
      return `Augmente la défense de l'utilisateur de ${shift(effect.value)} pour le reste du combat.`;

    case "debuff_attack":
      return `Réduit l'attaque de la cible de ${shift(effect.value)} pour le reste du combat.`;

    case "debuff_defense":
      return `Réduit la défense de la cible de ${shift(effect.value)} pour le reste du combat.`;

    default:
      return null;
  }
}

/** Everything the sheet needs to render one move, already worded. */
export function describeMove(moveId: string): MoveFacts | null {
  const move = MOVES[moveId];
  if (!move) return null;

  const chips = [
    move.power > 0 ? `${move.power} puissance` : "aucun dégât",
    `${pct(move.accuracy)} de réussite`,
    `${move.pp} PP`,
  ];

  const lines = [move.description];

  const effect = describeMoveEffect(move);
  if (effect) lines.push(effect);

  if (move.priority && move.priority > 0) {
    lines.push("Passe avant l'adversaire, quelle que soit la vitesse.");
  }

  if (move.accuracy < 1) {
    lines.push(`Échoue environ une fois sur ${Math.max(2, Math.round(1 / (1 - move.accuracy)))}.`);
  }

  return { category: CATEGORY_LABEL[move.category], chips, lines };
}
