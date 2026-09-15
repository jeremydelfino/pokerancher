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
  evolvesTo: ["arcanine"],  // facultatif — plusieurs cibles = évolution à choix
  evolvesAtLevel: 36,       // à partir de quel niveau l'évolution est proposée
}
```

⚠️ **La rareté suit la famille d'évolution, pas le goût.** Bulbizarre est
commun, Herbizarre rare, Florizarre épique. C'est ce qui fait qu'évoluer *donne
un trait* (le budget de traits est fixé par la rareté, voir plus bas) et pas
seulement des points de stats. Un stade final commun, ou un premier stade
épique, casse cette lecture — ne le fais pas sans le vouloir.

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

**`shared/src/data/species-battle.ts`** — sa fiche de combat : ses types, son
`tier` (1 commun → 5 boss) et la liste des attaques qu'il apprend, par niveau.

```ts
growlithe: { types: ["feu"], tier: 2, learnset: [...FEU, at(20, "crocs_feu")] },
```

Les listes `FEU`, `PLANTE`, `EAU`… sont des échelles d'attaques partagées par
type : une espèce part de l'échelle de son type et n'ajoute que ce qui lui est
propre. C'est ce qui permet d'avoir 84 espèces cohérentes sans écrire 84 fois
la même progression.

⚠️ **Une espèce sans entrée ici ne sait pas se battre.** Les trois fichiers vont
ensemble ; un test échoue si l'un des trois oublie une espèce.

### ⚠️ Le nombre de traits n'est pas libre

Il est fixé par la rareté (`TRAITS_PER_RARITY` dans `data/traits.ts`) et
**vérifié par un test** — `data/roster.test.ts` fait échouer le build si tu te
trompes :

| rareté | traits | composition |
|---|---|---|
| commun | 1 | son métier, rien d'autre |
| rare | 2 | métier + 1 transversal |
| épique | 3 | métier + 2 transversaux |
| légendaire | 4 | métier + 2 transversaux + **sa signature** |

Une espèce sans métier (Keldeo) a le même budget, elle dépense juste les quatre
lignes en traits transversaux.

Pourquoi ce tableau plutôt que des chiffres plus gros : le métier est imposé par
l'enclos, il ne crée donc aucune décision. Tout ce qui est au-dessus du métier
*est* la décision. Faire acheter à la rareté **des traits en plus** plutôt que
des multiplicateurs en plus, c'est ce qui rend un légendaire structurant au lieu
d'être un simple gros bâton.

### Les signatures

Un trait marqué `exclusive: true` dans `data/traits.ts` est porté par **une
seule espèce** et sa synergie s'allume à **1 porteur** — posséder le légendaire
*est* le seuil. Le test vérifie les trois : un seul porteur, un seul signature
par légendaire, seuil à 1.

L'interface les dessine en or partout (puce, filtre du Codex) sans que tu aies
rien à faire : le flag suffit.

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

⚠️ **`capacity` est la vraie récompense.** Un palier n'ajoute pas qu'un
multiplicateur, il ajoute des **places** : niveau 0/1 → 1 Pokémon, niveau 2 → 2,
niveau 3 → 3, niveau 4 → 4. Et une place, c'est un porteur de trait de plus qui
compte dans **toutes** les synergies — c'est là que l'argent achète de la
composition et pas seulement du rendement.

Les places sont lues depuis l'échelle (`slotCapacity()`), jamais calculées à
partir du niveau : tu peux faire sauter le niveau 2 directement à trois places
sans toucher une ligne de code.

Le rendement d'un enclos à plusieurs est la somme des occupants, chacun pondéré
par son siège (`SLOT_OCCUPANT_WEIGHTS`, tout à 1 aujourd'hui), et le
multiplicateur d'enclos s'applique **une fois** sur le total — sinon une
synergie serait comptée quatre fois dans un enclos plein.

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

## 6bis. Un Pokémon, un travail

Un Pokémon affecté à un enclos **ne peut pas** partir en expédition, et un
Pokémon parti en expédition ne peut pas être affecté à un enclos. Deux
mécanismes, pas un :

- l'unique SQL sur `RefugeAssignment.pokemonUnitId` empêche qu'il travaille deux
  enclos à la fois — c'est la base de données qui le garantit, pas du code ;
- `startRun` refuse toute recrue présente dans un enclos, et `assignPokemonToSlot`
  refuse toute recrue présente dans la run active (lue dans l'état stocké, pas
  dans une colonne dupliquée qui pourrait diverger).

Côté interface, les deux sélecteurs affichent les indisponibles **en grisé avec
la raison** plutôt que de les cacher : une règle qu'on découvre par un message
d'erreur est une règle mal expliquée.

Conséquence de design à garder en tête en équilibrant : agrandir un enclos
*retire* des Pokémon de tes expéditions. C'est la tension voulue — le Refuge et
l'exploration se disputent le même roster.

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

**`shared/src/data/battlers.ts`**, section `WILD_SPECIES` :

```ts
{ id: "malosse", name: "Malosse", dex: 228, types: ["tenebres", "feu"],
  moves: ["morsure", "flammeche", "vibrobscur", "lance_flammes"], tier: 3 },
```

Un ennemi est un Pokémon comme un autre : mêmes types, mêmes attaques, même
formule de dégâts. Ce qui décide où il apparaît, ce n'est plus lui — c'est le
`wild` du stage dans `stages.ts`. Ajouter un Pokémon sauvage ne le fait donc
apparaître nulle part tant qu'un stage ne l'a pas listé, ce qui est voulu : la
difficulté se compose stage par stage, pas espèce par espèce.

⚠️ Le `dex` est obligatoire, et c'est lui qui charge le vrai sprite.

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

## 11bis. Le combat

Un combat est **1 contre 1, au tour par tour, avec de vraies attaques**. Ce
n'est plus un calcul : c'est une suite de décisions que le joueur prend et que
le serveur résout.

### Les types

`data/types-chart.ts` stocke, pour chaque type, trois listes courtes —
`strongAgainst`, `weakAgainst`, `noEffect` — plutôt qu'une grille 18×18. Une
grille, c'est 324 cases que personne ne relit ; « le feu bat la plante » se
vérifie d'un coup d'œil. `effectiveness()` construit le multiplicateur à partir
de ces listes, et il se multiplie sur un double type (Roche contre
Insecte/Vol = ×4).

### Les attaques

```ts
tonnerre: {
  id: "tonnerre", name: "Tonnerre", type: "electrik",
  category: "speciale", power: 100, accuracy: 0.8, pp: 8,
  description: "Foudroie la cible — quand ça touche.",
}
```

`power: 0` veut dire « n'inflige rien » ; ce que l'attaque fait à la place est
dans `effect` (`heal`, `buff_attack`, `buff_defense`, `debuff_attack`,
`debuff_defense`). `priority` passe avant la vitesse — c'est ce qui fait
marcher Vive-Attaque.

Garde peu d'attaques de statut : un combat où toutes les options sont un
ajustement de stat cesse d'être un combat.

### Qui se bat

Trois groupes, une seule forme (types, `tier`, attaques) :

| groupe | fichier | rôle |
|---|---|---|
| `SPECIES_BATTLE` | `data/species-battle.ts` | la collection, par id de `pokemon-data.ts` |
| `WILD_SPECIES` | `data/battlers.ts` | ce qu'on croise sur le sentier, jamais collectionnable |
| `BOSS_SPECIES` | `data/battlers.ts` | un légendaire par stage |

⚠️ **Les ids sauvages sont préfixés `wild_`.** Sans ça un Rattata sauvage et le
Rattata de ta collection se disputent la même clé, et `battlerSource` rend
silencieusement le mauvais des deux.

Un membre de la collection ne porte pas quatre attaques écrites en dur : il
porte un **learnset**, et ses quatre attaques sortent de son niveau et de ce que
le joueur a coché (section 11quinquies).

Le `dex` d'un Pokémon sauvage est ce qui fait charger son vrai sprite. Sans
source de sprites configurée, l'interface retombe sur la créature paramétrique.

### La formule

`data/battle-config.ts`, et rien n'est codé en dur ailleurs :

```
base   = ((2 × niveau / 5 + 2) × puissance × Attaque / Défense) / 50 + 2
dégâts = base × efficacité × STAB × aléa(0.85 … 1)
```

`minDamage: 1` n'est pas de la politesse : sans plancher, une attaque résistée
contre un mur arrondit à zéro et le combat ne finit jamais.

### Le tour

1. le joueur envoie **un choix** — une attaque, ou un remplacement ;
2. l'IA adverse choisit la sienne (elle pèse ses attaques par ce qu'elles
   feraient réellement : une Nuée qui affronte un Steelix cherche ce qui passe
   au lieu de spammer Charge) ;
3. l'ordre vient de la priorité, puis de la vitesse, puis d'un tirage seedé ;
4. K.O. gérés entre les coups, jamais après les deux.

Le journal du tour (`BattleEvent[]`) porte les PV des deux côtés après chaque
ligne : l'écran rejoue le tour ligne par ligne et les barres suivent le texte,
au lieu de tomber avant que le texte explique pourquoi.

---

## 11ter. Les dix expéditions

`data/stages.ts`. Un stage se débloque en battant le précédent — et **seul le
légendaire compte** : rentrer avec le butin ne débloque rien, ce qui est
exactement la tension du choix « rentrer ou continuer ».

Trois choses changent d'un stage au suivant, délibérément pas dix :

* la longueur du sentier (`rows`) ;
* la force de ce qui y vit (`level`, et le `wild` disponible) ;
* **combien il y en a à la fois** (`foes`, de 1 à 3).

Le boss est toujours un légendaire, et toujours seul : un légendaire qui arrive
accompagné cesse d'être un duel, et le duel est le but.

Ajouter un onzième stage, c'est une entrée ici plus un légendaire dans
`battlers.ts`. Rien d'autre ne sait qu'il y en a dix.

### Le niveau de ton équipe

C'est **celui de tes Pokémon**, pas celui du stage. Le `level` affiché sur une
expédition est une recommandation, pas un plafond ni un plancher : partir au
stage 8 avec une équipe niveau 20 est autorisé, et ça fait mal.

C'est ce qui relie l'Idle au roguelite. Les baies, le bois, le minerai et le
poisson que produit le Refuge ne servent plus seulement à agrandir les enclos :
ils **achètent des niveaux**, et les niveaux sont ce qui ouvre le stage suivant.

---

## 11quater. Les œufs

`data/eggs.ts`. Deux familles, et c'est toute la raison d'en avoir plusieurs :

* les œufs **ciblés** (`slots`) sont peu chers et étroits — on les achète quand
  on sait quel enclos manque, en acceptant un commun une fois sur deux ;
* les œufs **loterie** sont chers et larges — on les achète quand on veut un
  légendaire sans idée précise.

La rareté est tirée **avant** l'espèce, sinon les chances affichées dériveraient
avec le nombre d'espèces présentes dans chaque rareté. `eggOdds()` publie
exactement les chances que `rollEggSpecies()` applique, et la page lit la même
fonction — ce que l'écran promet et ce que le serveur fait viennent d'un seul
endroit.

Un poids à 0 veut dire « jamais » : l'Œuf Prisme ne peut pas sortir de commun,
même en dernier recours.

Chaque œuf porte aussi sa `shinyChance` (1/350 pour le plus commun, 1/45 pour
l'Œuf Prisme). Voir plus bas ce qu'un chromatique débloque exactement.

---

## 11quinquies. Grandir : niveaux, attaques, évolutions, chromatiques

Tout ce que le joueur fait à un Pokémon se passe sur **une seule fiche**, celle
qui s'ouvre en cliquant une carte du Codex. Quatre choses, parce que ce sont
quatre réponses à la même question — « j'en fais quoi, de celui-là ? » — et que
les répartir sur quatre écrans obligerait à retenir le niveau en regardant les
attaques.

Les règles vivent dans `shared/src/progression.ts` (pur) et `data/levelling.ts`
(les nombres). L'écran et le serveur appellent **les mêmes fonctions** : un
bouton ne propose donc jamais quelque chose que le serveur refusera.

### Les niveaux s'achètent, ils ne se gagnent pas

Un combat ne donne aucune expérience. Un niveau se **paye**, avec la ressource
du métier de l'espèce :

| métier | ressource |
|---|---|
| Champ de baies | baies |
| Ponton de pêche | poissons |
| Coupe de bois | bois |
| Mine | minerai |
| *aucun métier* | pièces |

C'est volontaire, et c'est le cœur de la boucle : le Refuge produit, la
production monte les niveaux, les niveaux ouvrent les stages, les stages
rapportent de quoi produire plus. Un Pokémon qui n'a pas de métier (Keldeo,
Salamèche) coûte des pièces — donc de l'hôtel de vente — plutôt que d'être
gratuit.

```ts
coût(niveau) = arrondi((base + growth × niveau²) × facteurDeRareté)
```

Quadratique : passer de 5 à 15 est une formalité, de 80 à 90 un projet. Les
quatre `rarityFactor` (1 → 2.6) font qu'un légendaire coûte cher à monter, ce
qui compense qu'il soit meilleur à niveau égal.

⚠️ **`+10 niveaux` achète ce que la bourse permet, pas dix.** `affordableLevels`
calcule combien de paliers passent, et le serveur débite le prix du *niveau
réellement atteint*. Il n'y a pas de cas où le joueur paye dix et en reçoit
trois.

### Les attaques viennent du niveau

Un Pokémon **connaît** tout ce que son learnset lui donne à son niveau ou en
dessous, et en **emporte quatre**. Les deux sont différents et c'est le point :
la fiche montre toute l'échelle, y compris ce qui est encore verrouillé, parce
que voir « Lance-Soleil — N.45 requis » est la moitié de la raison de monter
jusqu'à 45.

⚠️ `activeMoves` ne complète à quatre **que si le joueur n'a rien choisi de
légal**. Auto-compléter systématiquement rendait impossible de décocher une
attaque : elle revenait aussitôt.

Monter de niveau renvoie la liste de ce qui vient d'être appris
(`movesLearnedBetween`), et l'écran l'annonce — sinon un gain de niveau est un
chiffre qui bouge et rien d'autre.

### Les évolutions

`evolvesTo` peut contenir **plusieurs** cibles : Évoli propose Aquali, Voltali
et Pyroli, et le joueur choisit. Le serveur vérifie les deux conditions — la
cible est bien une évolution *directe* de l'espèce, et le niveau est atteint —
et les messages d'erreur distinguent les deux cas, parce que « Chenipan n'évolue
pas en Papilusion — il devient Chrysacier » et « il évolue au niveau 7 » sont
deux problèmes différents.

Évoluer **fusionne** : si tu possèdes déjà l'espèce cible, l'exemplaire rejoint
la pile existante, qui garde le meilleur des deux niveaux et le déblocage
chromatique. Une évolution ne fait donc jamais perdre d'étoiles de fusion.

⚠️ Une évolution est interdite pendant que le Pokémon est en expédition : le
`RunState` porte une copie de ses stats, et le faire changer d'espèce en cours
de route donnerait deux vérités.

### Les chromatiques

Deux états, à ne pas confondre :

* `shinyUnlocked` — tu as **obtenu** un chromatique de cette espèce, une fois.
  Ça ne se perd pas, ça survit à l'évolution et à la fusion.
* `shiny` — tu **affiches** la forme chromatique. Un simple interrupteur sur la
  fiche, réservé à qui l'a débloquée.

Séparer les deux évite la punition idiote : avoir éclos un Florizarre
chromatique puis l'avoir fusionné ne doit pas reprendre la couleur. Le sprite
chromatique est une autre URL du même atlas ; sans source de sprites
configurée, tout retombe sur la créature paramétrique et le jeu reste jouable.

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
- ✅ choisir une attaque est un **choix**, pas un résultat : `POST /run/battle`
  n'accepte qu'un identifiant d'attaque ou un remplaçant, et le serveur résout
  le tour lui-même depuis l'état stocké
- ✅ `enterNode` refuse d'avancer tant qu'un combat est ouvert — la carte vide
  côté interface est une politesse, pas une règle
- ✅ le marché suit la même règle : le client envoie « quoi » et « combien »,
  jamais un prix ni un total. `sellQuote()` est rejoué côté serveur contre le
  stock que la base affirme, et le débit est conditionnel (`quantity >= …`)
  pour que deux ventes simultanées ne puissent pas créer de pièces.
- ✅ la fiche Pokémon aussi : `POST /pokemon/:id/level` envoie **un nombre de
  paliers**, jamais un niveau cible ni un coût. Le serveur reprix chaque palier
  et débite conditionnellement, épinglé sur le niveau qu'il vient de lire — deux
  onglets ouverts ne peuvent pas acheter le même niveau deux fois. Même chose
  pour `/moves` (l'attaque doit être dans le learnset au niveau atteint),
  `/evolve` (cible directe, niveau atteint) et `/shiny` (l'espèce doit avoir été
  débloquée).

Le client peut exécuter les mêmes fonctions pour afficher en avance ; ça ne
change rien, puisque ce qui compte est recalculé côté serveur.

---

## 13. La boucle

```
REFUGE ──▶ production ──▶ ressources ──┬──▶ œufs ──▶ nouvelles espèces
   ▲                          │        │                      │
   │                          ▼        └──▶ NIVEAUX ──┐       │
   │                    HÔTEL DE VENTE ──▶ pièces ──┬─┤       │
   │                                                │ │       │
   │                          paliers d'enclos ◀────┘ ▼       ▼
   └────── butin ◀── EXPÉDITION ◀── équipes plus fortes ──────┘
```

Les deux moitiés partagent les mêmes données : un Pokémon obtenu en expédition
change les synergies que le Refuge peut atteindre, et un Refuge mieux composé
finance les expéditions suivantes. Depuis que les niveaux s'achètent avec les
ressources du Refuge, la flèche est explicite : les baies que produit un
Bulbizarre sont ce qui paye le niveau 30 qui permet de passer le stage 5. Les œufs gagnés en run **éclosent au retour**
plutôt que de donner un bon d'achat, précisément pour que le retour de run soit
un moment de collection et pas un moment de comptabilité.

---

## 14. Vérifier que tu n'as rien cassé

```bash
npm run test --workspace shared   # 133 tests : roster, progression, traits, combat, run, marché
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
