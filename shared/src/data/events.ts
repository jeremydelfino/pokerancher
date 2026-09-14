import type { RunChoiceOption } from "../run/types.js";

/**
 * TODO_GAME_DESIGN — events.
 *
 * An event is a prompt and a handful of options. The options reuse the same
 * shape as reward options, so the engine applies them through one code path:
 * loot, relics, traits, healing, damage. Adding an event is one entry.
 */
export interface RunEvent {
  id: string;
  title: string;
  prompt: string;
  options: RunChoiceOption[];
}

export const RUN_EVENTS: RunEvent[] = [
  {
    id: "source",
    title: "Source chaude",
    prompt: "Une source fume entre les rochers. L'équipe a l'air tentée.",
    options: [
      {
        id: "baigner",
        label: "Se baigner",
        description: "Récupère 35 % des points de vie.",
        healPercent: 0.35,
      },
      {
        id: "fouiller",
        label: "Fouiller le fond",
        description: "Des éclats brillent sous l'eau, mais c'est glissant.",
        grantLoot: { resources: { egg_shard: 40 }, eggs: 0 },
        damagePercent: 0.12,
      },
    ],
  },
  {
    id: "marchand",
    title: "Colporteur",
    prompt: "Un vieil homme déballe son sac sur une souche.",
    options: [
      {
        id: "troc",
        label: "Troquer",
        description: "Il échange votre bois contre une relique.",
        grantRelic: "besace",
      },
      {
        id: "ecouter",
        label: "Écouter ses histoires",
        description: "Il connaît les chemins. Butin en hausse.",
        grantTraits: ["explorateur"],
      },
      {
        id: "passer",
        label: "Passer son chemin",
        description: "Rien à signaler.",
      },
    ],
  },
  {
    id: "autel",
    title: "Autel fendu",
    prompt: "Une pierre gravée vibre quand on l'approche.",
    options: [
      {
        id: "offrande",
        label: "Faire une offrande",
        description: "Sacrifie 15 % des points de vie pour une relique.",
        damagePercent: 0.15,
        grantRelic: "croc",
      },
      {
        id: "briser",
        label: "Briser la pierre",
        description: "Du minerai, et rien d'autre.",
        grantLoot: { resources: { ore: 80 }, eggs: 0 },
      },
    ],
  },
  {
    id: "nid",
    title: "Nid abandonné",
    prompt: "Un œuf est resté là, tiède.",
    options: [
      {
        id: "prendre",
        label: "L'emporter",
        description: "Un œuf de plus dans la besace.",
        grantLoot: { resources: {}, eggs: 1 },
      },
      {
        id: "couver",
        label: "Rester le couver",
        description: "L'équipe se repose en attendant.",
        healPercent: 0.25,
        grantLoot: { resources: { egg_shard: 20 }, eggs: 0 },
      },
    ],
  },
];
