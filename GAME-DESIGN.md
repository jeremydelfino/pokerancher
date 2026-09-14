# Guide de game design — PokéRancher

Tout l'équilibrage vit dans **`shared/src/data/`**. Le moteur, lui, est dans
`shared/src/traits/` et `shared/src/run/` et n'a pas besoin d'être touché pour
ajouter un Pokémon, un trait, une synergie, une relique, un événement, une
récompense ou un ennemi.

La règle que je me suis imposée en écrivant le moteur : **ajouter du contenu
doit coûter une entrée de données, pas une modification dans quinze fichiers.**
Si jamais tu tombes sur un cas où ce n'est pas vrai, c'est un défaut du moteur,
pas de ta façon d'écrire les données.

```
shared/src/data/
├── traits.ts           le catalogue des traits (nom, icône, description)
├── species-traits.ts   quel Pokémon porte quels traits
├── synergies.ts        les paliers et leurs effets
├── activity-stars.ts   comment un score d'enclos devient des étoiles
├── run-config.ts       la forme d'une expédition
├── enemies.ts          qui on affronte
├── relics.ts           les bonus temporaires de run
├── rewards.ts          les tables de butin
└── events.ts           les événements à choix
```

Chaque fichier commence par un bloc `TODO_GAME_DESIGN` : tout ce qui s'y trouve
aujourd'hui est du placeholder destiné à être remplacé.

---

## 1. Ajouter un Pokémon

Deux fichiers.

**`shared/src/pokemon-data.ts`** — l'espèce elle-même :

```ts
{
  id: "growlithe",          // identifiant interne, minuscules, sans accent
  name: "Caninos",          // nom affiché
  dex: 58,                  // numéro du Pokédex national — sert au sprite
  rarity: "rare",           // common | rare | epic | legendary
  role: "passive",          // profil de combat : passive encaisse, offensive frappe
  trait: { slot: "MINING", multiplier: 1.4 },  // le métier — facultatif
}
```

⚠️ **`role` n'est pas une permission.** Une espèce travaille un enclos si elle a
un `trait` (un métier), et se bat si tu l'emmènes en expédition — les deux sont
indépendants, donc un Pokémon peut faire les deux. `role` ne décide que de la
pondération de ses stats de combat. Mysdibule, dans le jeu de placeholder, est
`offensive` **et** mineur : c'est l'exemple à copier. Une espèce sans `trait`
(Keldeo) est un pur combattant, et une espèce `passive` avec un métier peut
quand même partir en run — elle sera juste plus solide que tranchante.

⚠️ **Attention au mot « trait ».** Le champ `trait` au singulier existe depuis
le début et désigne **le métier d'enclos** : quel enclos l'espèce peut occuper,
et son multiplicateur de production. Il n'a rien à voir avec les traits de
synergie. Je ne l'ai pas renommé pour ne rien casser, mais garde la distinction
en tête :

| | où | ce que c'est |
|---|---|---|
| `trait` (singulier) | `pokemon-data.ts` | le métier d'enclos |
| `traits` (pluriel) | `species-traits.ts` | les traits de synergie |

**`shared/src/data/species-traits.ts`** — ses traits de synergie :

```ts
growlithe: ["mineur", "carapace"],
```

C'est tout. Le Pokémon apparaît automatiquement dans le gacha, le codex, la
sélection d'équipe et le sélecteur d'enclos.

### Une contrainte à connaître avant d'attribuer les traits

Le Refuge n'a que **quatre enclos**, et chaque enclos n'accepte que les espèces
dont le métier correspond. La composition du Refuge est donc figée à un Pokémon
par métier : un trait « Fertilisation » porté uniquement par des espèces du
champ de baies ne pourra **jamais** dépasser 1 porteur et sa synergie ne
s'allumera jamais.

C'est pour ça que le jeu de placeholder donne **deux traits par espèce** : le
métier, plus un trait transversal. Le vrai choix du joueur devient « quel
Pokémon des baies je mets, celui qui apporte Carapace ou celui qui apporte
Explorateur ». Et Torterra porte `["bucheron", "fertilisation"]`, ce qui permet
d'atteindre Fertilisation 2 en le plaçant à la coupe de bois — un vrai combo.

Si tu veux que les métiers montent en palier au Refuge, il faudra soit ajouter
des enclos, soit distribuer les traits de métier en croix comme Torterra.

---

## 2. Ajouter un trait

**`shared/src/data/traits.ts`** :

```ts
pyromane: {
  id: "pyromane",
  name: "Pyromane",
  description: "Fait brûler ce qui doit brûler.",
  category: "combat",   // libre — sert seulement au regroupement d'affichage
  icon: "🔥",
},
```

Un trait défini ici s'affiche déjà partout (fiches, codex, sélection). Il ne
fait **rien** tant qu'il n'a pas de paliers.

---

## 3. Définir une synergie

**`shared/src/data/synergies.ts`** :

```ts
pyromane: {
  traitId: "pyromane",
  thresholds: [
    { count: 2, effects: [{ type: "combat_attack", value: 6 }] },
    { count: 4, effects: [{ type: "combat_attack", value: 15 }] },
  ],
},
```

### Deux règles à comprendre, sinon tu vas te faire avoir

**Le cumul.** Par défaut, **seul le palier le plus haut atteint s'applique**
(règle TFT). Les valeurs s'écrivent donc en **absolu** : le palier 4 ci-dessus
donne +15, pas +15 en plus des +6 du palier 2.

Si tu préfères que tous les paliers atteints s'additionnent, déclare-le :

```ts
stacking: "cumulative",
```

…et écris alors les effets en **incréments**. Se tromper ici multiplie
silencieusement toute ton échelle — c'est exactement le bug que j'ai attrapé en
testant, où un butin annoncé à ×1,45 sortait à ×1,74 parce que les paliers se
composaient. Il y a un test qui garde cette propriété
(`shared/src/traits/traits.test.ts`, « does not multiply the whole ladder »).

**Le comptage.** Par défaut, **un porteur par espèce** : un second Bulbizarre ne
fait pas avancer Fertilisation deux fois. C'est ce qui force à élargir la
collection plutôt qu'à empiler une bonne espèce. Pour compter chaque exemplaire :

```ts
countMode: "per-member",
```

---

## 4. Les effets

Un effet est volontairement un simple triplet :

```ts
{ type: "combat_attack", target: "MINING", value: 1.5, mode: "mult" }
```

| champ | rôle |
|---|---|
| `type` | ce que ça modifie. Texte libre — **le moteur ne l'interprète jamais** |
| `target` | affine la portée. Absent = joker, s'applique à toutes les cibles du type |
| `value` | la valeur |
| `mode` | `add` (somme, défaut) · `mult` (produit) · `max` (on garde le plus grand) |

### Le vocabulaire actuellement écouté

| type | mode | cible | effet |
|---|---|---|---|
| `slot_rate` | `mult` | un `SlotType` | production de cet enclos |
| `resource_rate` | `mult` | une ressource | production de cette ressource |
| `activity_score` | `add` | un `SlotType` | alimente les étoiles de l'enclos |
| `combat_attack` | `add` | — | dégâts en expédition |
| `combat_hp` | `add` | — | points de vie en expédition |
| `run_loot` | `mult` | une ressource | taille du butin |
| `run_luck` | `add` | — | penche les tirages vers le rare |

Les effets `slot_rate` et `resource_rate` se **composent** : un trait peut
booster « la mine » et une relique booster « le minerai » sans qu'aucun des deux
n'ait à connaître l'autre. Les paliers d'enclos achetés au marché écrivent dans
ce même vocabulaire (section 6) : le moteur ne fait aucune différence entre un
bonus gagné et un bonus acheté.

### Inventer un nouveau type d'effet

Trois étapes, aucune dans `traits/` :

1. Écris-le dans une synergie ou une relique. Il est déjà accumulé.
2. Va là où il doit mordre et lis-le : `bag.flat("mon_effet")`,
   `bag.multiplier("mon_effet", cible)` ou `bag.cap("mon_effet")`.
3. Documente-le dans le tableau ci-dessus.

Exemple — « les œufs coûtent moins cher » :

```ts
// dans synergies.ts
{ count: 3, effects: [{ type: "egg_cost", value: 0.8, mode: "mult" }] }

// dans le service du gacha
const cost = Math.ceil(GACHA_EGG_COST.amount * bag.multiplier("egg_cost"));
```

---

## 5. Les étoiles d'activité

**`shared/src/data/activity-stars.ts`** :

```ts
MINING: { baseScore: 1, thresholds: [1, 2, 3, 4, 6] },
```

Un enclos occupé part de `baseScore`, tout ce qui contribue un effet
`activity_score` visant cet enclos s'ajoute, et le total est comparé à
l'échelle. Cinq seuils = cinq étoiles ; mets-en six, l'interface suit toute
seule. Un enclos vide vaut zéro : les étoiles décrivent ce qui est produit, pas
ce qui pourrait l'être.

---

## 6. L'hôtel de vente et les améliorations d'enclos

**`shared/src/data/market.ts`** contient toute l'économie marchande : les prix
de vente, l'échelle d'améliorations, et le prix d'un œuf en pièces.

### Les prix

```ts
{ resource: "ore", unitPrice: 5, grade: "epic", blurb: "Rare, lourd, et la forge en veut encore." },
```

Les prix sont **fixes**. Pas d'offre et de demande, pas de fluctuation : c'est
un choix, pas un raccourci. Un prix fixe permet au joueur de calculer de tête
« encore deux heures de mine et j'achète le palier suivant », et c'est tout
l'intérêt du puits.

Remarque que l'échelle des prix est l'**inverse** de celle des rendements des
enclos : les baies sortent à 60/h et valent 1, le minerai sort à 20/h et vaut 5,
donc une heure de n'importe quel enclos rapporte à peu près pareil. Casse cette
symétrie exprès si tu veux qu'un enclos devienne la vraie mine d'or.

`grade` ne sert qu'à l'affichage (la couleur de l'auvent de l'étal) et à
justifier le prix. Aucune règle ne le lit.

### La pièce

La pièce (`coin`) n'est produite par **aucun** enclos et ne tombe d'**aucune**
expédition. La seule entrée, c'est la vente ; les seules sorties, ce sont les
améliorations d'enclos et les œufs. Garde cette boucle fermée et tu pourras
toujours raisonner sur l'économie ; ajoute une troisième source et tu ne
sauras plus d'où vient l'inflation.

Pour rendre une ressource vendable, ajoute-la à `SELLABLE_RESOURCES`
(`shared/src/types.ts`) **et** donne-lui une entrée dans `MARKET_LISTINGS`. Sans
les deux, la vente est refusée — volontairement : une ressource à prix inconnu
ne doit pas pouvoir se vendre à zéro.

### Les paliers d'enclos

```ts
{
  level: 2,
  label: "Enclos agrandi",
  cost: 500,                                  // pièces pour passer du niveau 1 au 2
  effects: [
    { type: "slot_rate", value: 1.35, mode: "mult" },
    { type: "activity_score", value: 1 },
  ],
}
```

Les effets utilisent **exactement le même vocabulaire que les synergies** (voir
la section 4) — ils tombent dans le même `EffectBag`, et ni la production ni les
étoiles ne savent qu'un « achat » existe. C'est aussi pour ça qu'un palier
augmente le score d'activité : les étoiles de l'enclos montent sans une ligne
de moteur en plus.

⚠️ **Pas de cible dans les données.** Tu n'écris jamais `target` ici : le moteur
y colle le type d'enclos concerné au moment de résoudre. Un palier ne peut donc
physiquement pas booster le mauvais enclos.

⚠️ **Un palier remplace le précédent.** `SLOT_UPGRADES_REPLACE_PREVIOUS = true`
applique la règle « highest » des synergies : atteindre le niveau 3 n'applique
**pas** aussi les niveaux 1 et 2. Écris donc chaque palier comme la valeur
absolue voulue à ce niveau, jamais comme un incrément. Passe la constante à
`false` et l'échelle ci-dessus se met à compounder jusqu'à ×4,86.

Aujourd'hui les quatre enclos partagent la même échelle. Pour en donner une par
enclos, transforme `SLOT_UPGRADE_TIERS` en `Record<SlotType, SlotUpgradeTier[]>`
et adapte `slotUpgradeLadder()` — c'est la seule fonction qui touche cette
constante.

### Les œufs en pièces

`EGG_COIN_COST` fixe le prix d'un œuf payé en pièces ; le prix en éclats reste
dans `GACHA_EGG_COST` (`shared/src/game-logic.ts`). Deux monnaies, un seul œuf :
les éclats ne viennent que des expéditions, les pièces que du marché, donc les
deux boucles nourrissent le gacha sans se remplacer.

---

## 7. Les reliques

**`shared/src/data/relics.ts`** :

```ts
braise: {
  id: "braise",
  name: "Braise éternelle",
  description: "Toute l'équipe gagne le trait Pyromane.",
  effects: [{ type: "combat_attack", value: 3 }],
  grantsTraits: ["pyromane"],   // optionnel
},
```

`grantsTraits` est le levier le plus intéressant du jeu, et le moteur de la
boucle « encore une run » : donner un trait à toute l'équipe la pousse vers un
palier que la collection seule ne permettait pas d'atteindre. Un joueur bloqué à
3 Fertilisation à qui on propose « +1 Fertilisation pour tout le monde » ne se
voit pas offrir une statistique, il se voit offrir un palier.

Les reliques alimentent exactement le même sac d'effets que les synergies : une
relique qui dit `combat_attack +4` est lue par le code qui lit une synergie
disant la même chose. Aucun cas particulier nulle part.

---

## 8. Les récompenses

**`shared/src/data/rewards.ts`** :

```ts
{
  id: "big_haul",
  label: "Gros filon",
  description: "Le wagonnet est plein.",
  weight: 8,        // poids relatif dans le tirage
  rarity: 0.7,      // 0 = banal, 1 = rare. La chance penche vers le haut
  resources: { ore: 200 },
  eggs: 0,
  // relic: true      → tire une relique au lieu de donner du butin
  // healPercent: 0.4 → soigne au lieu de donner du butin
}
```

`run_luck` n'augmente pas le butin, il **penche le tirage vers la moitié rare de
la table**. Un joueur qui empile Chanceux voit plus souvent des reliques et des
œufs, pas des tas de baies plus gros. C'est une décision de design que tu peux
inverser dans `rollRewardChoice` (`shared/src/run/engine.ts`).

---

## 9. Les événements

**`shared/src/data/events.ts`** :

```ts
{
  id: "ruines",
  title: "Ruines fumantes",
  prompt: "Quelque chose bouge sous les décombres.",
  options: [
    { id: "creuser", label: "Creuser", description: "…",
      grantLoot: { resources: { ore: 120 }, eggs: 0 }, damagePercent: 0.1 },
    { id: "fuir", label: "S'éloigner", description: "…" },
  ],
}
```

Les options d'événement partagent la forme des options de récompense, donc le
moteur les applique par le même chemin : `grantLoot`, `grantRelic`,
`grantTraits`, `healPercent`, `damagePercent`.

---

## 10. Les ennemis

**`shared/src/data/enemies.ts`** :

```ts
{ id: "spectre", name: "Spectre", tiers: ["elite", "boss"], hp: 200, attack: 18, scaling: 1.2 }
```

`tiers` dit dans quels types de nœud l'ennemi peut apparaître — ajouter un boss
est donc une entrée avec `tiers: ["boss"]`. `scaling` multiplie le durcissement
par la profondeur défini dans `run-config.ts`.

---

## 11. La forme d'une expédition

**`shared/src/data/run-config.ts`** — les leviers les plus structurants :

| clé | effet |
|---|---|
| `teamSize` | combien de Pokémon partent |
| `rows` | longueur de la run avant le boss |
| `minWidth` / `maxWidth` | largeur des rangées, donc le nombre de chemins |
| `earlyWeights` / `lateWeights` | fréquence des types de nœud, interpolée du début à la fin |
| `secureAfter` | après quels nœuds on propose de faire le point |
| `secureKeepRatio` | ce qu'on garde en mettant à l'abri (0,75 = ça coûte 25 %) |
| `defeatKeepRatio` | ce qu'on garde du butin non sécurisé en mourant |
| `depthScaling` | à quel point chaque rangée durcit les ennemis |

### Le risque / récompense

Trois options apparaissent aux points de décision, et elles doivent rester
distinctes sinon le choix meurt :

- **Rentrer** — la run s'arrête, tu gardes **tout**. Sûr, petit.
- **Sécuriser** — met `secureKeepRatio` du butin en cours à l'abri, puis
  continue. Tu paies pour la sécurité.
- **Continuer** — rien n'est mis à l'abri. Tout reste en jeu.

Si tu mets `secureKeepRatio` à 1, « Sécuriser » devient gratuit et « Continuer »
n'a plus aucune raison d'exister. C'est le réglage à ne pas rater.

---

## 12. Le contrat anti-triche

À respecter en ajoutant des mécaniques, sinon la protection tombe.

Une expédition se stocke en **une graine plus le chemin parcouru**, jamais en
résultats tirés. Le serveur régénère la carte, refait le combat, retire le
butin. Le client n'envoie que des **choix** : un identifiant de nœud, un
identifiant d'option. Il n'existe aucune forme dans laquelle il peut annoncer
avoir gagné.

Donc, concrètement :

- ✅ tout ce qui touche au hasard passe par `makeRng(subSeed(seed, étape, …))`
- ✅ toute fonction du moteur reste **pure** : état en entrée, nouvel état en sortie
- ❌ jamais de `Math.random()` dans `shared/src/run/`
- ❌ jamais de `Date.now()` dans une résolution de nœud
- ❌ jamais de route qui accepte un résultat depuis le client
- ✅ le marché suit la même règle : le client envoie « quoi » et « combien »,
  jamais un prix ni un total. `sellQuote()` est rejoué côté serveur contre le
  stock que la base affirme, et le débit est conditionnel (`quantity >= …`)
  pour que deux ventes simultanées ne puissent pas créer de pièces.

Le client peut exécuter les mêmes fonctions pour afficher en avance ; ça ne
change rien, puisque ce qui compte est recalculé côté serveur.

---

## 13. La boucle

```
REFUGE ──▶ production ──▶ ressources ──▶ œufs ──▶ nouvelles espèces
   ▲                          │                           │
   │                          ▼                           │
   │                    HÔTEL DE VENTE ──▶ pièces ──┬──────┤
   │                                                │      │
   │                          paliers d'enclos ◀────┘      ▼
   └────── butin ◀── EXPÉDITION ◀── nouvelles compositions ─┘
```

Les deux moitiés partagent les mêmes données : un Pokémon obtenu en expédition
change les synergies que le Refuge peut atteindre, et un Refuge mieux composé
finance les expéditions suivantes. Les œufs gagnés en run **éclosent au retour**
plutôt que de donner un bon d'achat, précisément pour que le retour de run soit
un moment de collection et pas un moment de comptabilité.

---

## 14. Vérifier que tu n'as rien cassé

```bash
npm run test --workspace shared   # 68 tests : traits, synergies, run, marché
npm run typecheck                 # les trois paquets
npm run build --workspace shared  # à relancer après toute modif de données
```

⚠️ Le client et le serveur consomment `shared` **compilé**. Les scripts
`npm run dev:server`, `npm run dev:client` et `npm test` recompilent `shared`
tout seuls (hooks `pre*` dans le `package.json` racine), mais si tu lances un
workspace directement, relance `npm run build --workspace shared` ou garde
`npm run dev --workspace shared` en watch — sinon tes changements ne
remonteront pas, et tu récolteras une erreur du genre
`does not provide an export named …`.

Les tests couvrent en particulier les pièges décrits plus haut : le cumul des
paliers, le comptage par espèce, le déterminisme de la carte et du combat, et le
fait qu'une run se termine toujours quelle que soit la graine.
