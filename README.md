# PokéRancher 🎮

Fan-game web Pokémon (Idle + Roguelite + Gacha), 100% gratuit, sans pub ni micro-transaction.

Trois boucles qui se nourrissent : le **Refuge** produit des ressources en continu, les
ressources achètent des **œufs** et des **niveaux**, et les équipes ainsi montées vont
chercher les dix **expéditions** — dont chaque boss est un légendaire.

---

## 📋 Prérequis

Avant de commencer, assure-toi d'avoir :

- **Node.js** (v22+) : https://nodejs.org/
- **npm** (v10+) : installé avec Node
- **Git** : https://git-scm.com/
- Un compte **Supabase** (gratuit) : https://supabase.com
- Un compte **Discord** : https://discord.com

---

## 🚀 Installation complète (Nouveau PC)

### Étape 1 : Cloner le projet

```powershell
git clone https://github.com/jeremydelfino/pokerancher.git
cd pokerancher
```

### Étape 2 : Installer les dépendances

```powershell
npm install
```

⏳ Ça peut prendre 1-2 minutes.

### Étape 3 : Configurer Supabase (Base de données)

**Sur Supabase :**

1. Va sur https://supabase.com et crée un nouveau projet
2. Attends que le projet soit initialisé (~2-3 min)
3. Va à **Settings** → **Database** → **Connection Strings** → **URI**
4. Copie la chaîne (elle ressemble à `postgresql://postgres:password@...`)

**Localement :**

1. Crée un fichier `.env` à la racine du projet
2. Copie ce contenu et **remplis-le** :

```env
# --- Database (de Supabase) ---
DATABASE_URL="postgresql://postgres:VOTRE_PASSWORD@VOTRE_HOST:5432/postgres"

# --- JWT Secret (n'importe quel texte long) ---
JWT_SECRET="dev-secret-changezmoi-en-production-1234567890"

# --- Discord OAuth2 (voir étape 4) ---
DISCORD_CLIENT_ID="VIENT_DE_DISCORD"
DISCORD_CLIENT_SECRET="VIENT_DE_DISCORD"
DISCORD_REDIRECT_URI="http://localhost:4000/auth/discord/callback"

# --- URLs locales ---
CLIENT_URL="http://localhost:5173"
VITE_API_URL="http://localhost:4000"

# --- Other ---
PORT=4000
NODE_ENV=development
```

3. **Copie aussi le `.env` dans le dossier `server/`** :
   ```powershell
   Copy-Item .env server/.env
   ```

### Étape 4 : Configurer Discord OAuth2

**Sur Discord :**

1. Va sur https://discord.com/developers/applications
2. Clique **"New Application"**
3. Donne un nom (ex: "PokéRancher Dev")
4. Clique **"Create"**

5. Va à l'onglet **OAuth2** → **General**
6. **Copie** le `Client ID` → mets-le dans `.env` comme `DISCORD_CLIENT_ID`
7. Clique **"Reset Secret"** → **Copie** → mets-le comme `DISCORD_CLIENT_SECRET`

8. Scroll down à **"Redirects"**
9. Ajoute : `http://localhost:4000/auth/discord/callback`
10. Clique **"Save Changes"**

### Étape 5 : Créer et migrer la base de données

```powershell
npm run db:migrate
```

Ça va :
- Créer les tables Prisma dans Supabase
- Générer le client Prisma

### Étape 6 : Compiler le package `shared`

```powershell
npm run build --workspace shared
```

### Étape 7 : Démarrer le projet

Ouvre **3 terminaux PowerShell** (ou 3 onglets dans VS Code) :

**Terminal 1 - Serveur** :
```powershell
npm run dev:server
# Devrait afficher : Pokerancher API listening on http://localhost:4000
```

**Terminal 2 - Client** :
```powershell
npm run dev:client
# Devrait afficher : http://localhost:5173/
```

**Terminal 3 (optionnel) - Watch shared** :
```powershell
npm run dev --workspace shared
```

### Étape 8 : Ouvrir le navigateur

Va sur **http://localhost:5173** 🎉

Tu devrais voir le bouton "Se connecter avec Discord".

---

## 🎮 Utilisation

### Connexion
- Clique **"Se connecter avec Discord"**
- Tu seras redirigé vers Discord pour autoriser
- Reviens automatiquement, un compte est créé, tu reçois 150 `egg_shard`

### Refuge (Idle)
- Assigne des Pokémons aux 4 enclos (Baies, Pêche, Bois, Minerai)
- Un enclos tient **autant de Pokémon que son niveau** : 1 au départ, puis 2, 3 et 4
  — et chaque place en plus est un porteur de trait de plus pour tes synergies
- Le bouton **UP** sur un enclos ouvre son échelle d'améliorations (il brille quand
  tu peux te payer le palier suivant)
- Les ressources s'accumulent automatiquement (même hors-ligne, limité à 12h)
- Clique **"Récolter"** pour les collecter

### La Couveuse (gacha)
- **6 types d'œufs** avec leurs propres chances, affichées sur chaque œuf
- Trois sont **ciblés** (Mousse, Marée, Roche) et ne sortent qu'un métier — utiles quand
  il te manque un enclos précis ; les autres sont des loteries larges
- L'Œuf Prisme ne sort **jamais** de commun
- Chaque œuf a sa **chance de chromatique** (de 1/350 à 1/45 pour l'Œuf Prisme). En éclore
  un **débloque définitivement** la forme chromatique de l'espèce : tu peux ensuite
  l'afficher ou non depuis sa fiche, et ça survit à la fusion comme à l'évolution
- Les doublons fusionnent et augmentent les stats (paliers ⭐)

### Marché (hôtel de vente)
- Vends tes récoltes à **prix fixe** : baies 1, poissons 2, bois 3, minerai 5 pièces l'unité
- Les pièces servent à acheter des œufs et à **améliorer les enclos** — l'amélioration se
  fait au Refuge, via le bouton **UP** sur l'enclos concerné
- Un palier **remplace** le précédent : le niveau 3 n'est pas le niveau 2 plus un bonus

### Traits & synergies
- Un Pokémon peut être **à la fois** travailleur et combattant : le métier (quel enclos
  il occupe) et le profil de combat sont deux choses indépendantes…
- …mais **pas en même temps** : un Pokémon au travail ne part pas en expédition, et
  inversement. Agrandir un enclos, c'est retirer du monde à tes expéditions
- Le nombre de traits dépend de la rareté : **commun 1, rare 2, épique 3, légendaire 4**,
  dont une **signature** portée par cette seule espèce
- Les traits ne comptent que là où tu **choisis** les Pokémon : les enclos du Refuge et
  l'équipe de départ d'une expédition (1 à 6 membres)
- Chaque Pokémon porte des **traits** ; réunir assez de porteurs allume un **palier**
- Les paliers actifs multiplient la production des enclos et notent leur efficacité en étoiles
- Le panneau Synergies affiche le prochain seuil, ce qu'il manque pour l'atteindre, et
  surtout **ce que le palier fait vraiment**, en français et séparé en 🌱 Refuge et
  ⚔️ Expédition — clique une synergie pour déplier toute son échelle

### Codex (la collection) — et la fiche d'un Pokémon
- **84 espèces**, en familles d'évolution complètes ; la rareté suit la famille
  (Bulbizarre commun → Herbizarre rare → Florizarre épique)
- Statistiques de complétion sur le côté, tri par trait, filtre « possédés »
- **Clique une carte possédée** pour ouvrir sa fiche, où tout se passe :
  - **Monter son niveau** (jusqu'à 100), payé avec la ressource de son métier —
    baies, poissons, bois ou minerai, et en **pièces** pour un Pokémon sans métier.
    `+1` et `+10` affichent le prix réel ; `+10` n'achète que ce que ta bourse permet
  - **Choisir ses 4 attaques** parmi tout ce qu'il a appris. Le reste de l'échelle
    reste affiché, verrouillé, avec le niveau requis
  - **Le faire évoluer** quand il atteint le niveau — Évoli propose ses trois formes,
    et évoluer vers une espèce déjà possédée fusionne les deux piles
  - **Basculer en chromatique** si tu en as déjà éclos un de cette espèce
- Un Pokémon en expédition est gelé : sa fiche s'ouvre, mais rien n'est modifiable

### Exploration (roguelite)
- **10 expéditions** de difficulté croissante, présentées en **frise en haut de l'écran** ;
  battre le légendaire d'un stage débloque le suivant. La frise montre ce qui est fait,
  ce qui est ouvert, ce qui est verrouillé, et le boss de chaque stage en silhouette
- Compose une équipe (1 à 6), choisis ton chemin sur une carte à embranchements
- **Combats Pokémon 1v1 au tour par tour** : vraies attaques, 18 types avec table
  d'efficacité, PP, précision, priorité, changements de Pokémon. Tu affrontes 1 à 3
  Pokémon sauvages selon le stage
- Le **boss de chaque stage est un légendaire** (Artikodin, Électhor… jusqu'à Mewtwo)
- Événements, échoppes, reliques temporaires
- Aux points de décision : **rentrer** avec tout, **sécuriser** une partie, ou **continuer**
- Mourir fait perdre le butin non sécurisé ; les œufs gagnés éclosent au retour
- **À la fin, une pop-up récapitule tout** : butin rapporté, œufs éclos, reliques trouvées,
  qui est rentré debout, et l'expédition que ça vient d'ouvrir. Elle ne se ferme qu'en
  cliquant **Récolter** — ni Échap, ni clic à côté
- ⚠️ **Rentrer avec le butin n'est pas terminer l'expédition** : seul le légendaire
  débloque la suivante, et le récapitulatif le dit clairement
- **Ton équipe part au niveau de tes Pokémon**, pas à celui du stage : le niveau affiché
  sur une expédition est une recommandation. C'est ce qui relie l'Idle au roguelite —
  les ressources du Refuge achètent les niveaux, et les niveaux ouvrent les stages

---

## 🛠️ Commandes utiles

```powershell
# Voir tous les pokémons de la DB
npm run db:studio    # Ouvre une UI Prisma

# Relancer une migration
npm run db:migrate   # Depuis le dossier racine

# Vérifier les types TypeScript
npm run typecheck    # Sur tous les packages

# Lancer les tests (recompile shared automatiquement)
npm run test         # Tests unitaires du package shared
```

---

## ❌ Troubleshooting

### Erreur : `DATABASE_URL not found`
→ Vérifiez que le `.env` est à la **racine** ET dans le dossier **server/** 

```powershell
Copy-Item .env server/.env
```

### Erreur : `Discord token exchange failed: 401 invalid_client`
→ Le `DISCORD_CLIENT_ID` ou `DISCORD_CLIENT_SECRET` est incorrect
1. Retourne dans https://discord.com/developers/applications
2. **Reset Secret** et copie le nouveau
3. Redémarre le serveur avec `npm run dev:server`

### Erreur : `Cannot find package '@pokerancher/shared'` ou `does not provide an export named …`
→ Le package shared n'a pas été recompilé après une modification. Les scripts
`dev:server`, `dev:client` et `test` le font désormais tout seuls, mais si tu
lances un workspace directement :
```powershell
npm run build --workspace shared
```

### Le client ne voit pas le serveur
→ Vérifiez que :
- Le serveur tourne sur `http://localhost:4000` (Terminal 1)
- Le client a `VITE_API_URL="http://localhost:4000"` dans le `.env`
- Les deux sont dans le `.env` AND `server/.env`

### Prisma lent au démarrage
→ Normal, laisse quelques secondes à la première exécution

---

## 📁 Structure du projet

```
pokerancher/
├── shared/                  # Logique pure + types (testés)
│   └── src/
│       ├── game-logic.ts    # Production, gacha, paliers d'étoiles
│       ├── market.ts        # Ventes et paliers d'enclos (règles)
│       ├── progression.ts   # Niveaux, attaques apprises, évolutions
│       ├── battle/          # Combat Pokémon 1v1 : types, dégâts, tours
│       ├── pokemon-data.ts  # Espèces, familles d'évolution, rareté
│       ├── types.ts         # Interfaces TypeScript
│       ├── traits/          # Moteur de traits, effets, synergies, étoiles
│       ├── run/             # RNG seedé, carte, combat, machine à états
│       └── data/            # ⚙️ TOUT LE GAME DESIGN — voir GAME-DESIGN.md
│
├── server/                  # Backend Node + Express + Prisma
│   ├── src/
│   │   ├── routes/          # API endpoints (auth, refuge, gacha, market, run, pokemon, codex)
│   │   ├── services/        # Logique métier
│   │   └── auth/            # Discord OAuth2 + JWT
│   └── prisma/
│       ├── schema.prisma    # Modèle de base de données
│       └── migrations/      # Historique des migrations
│
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── pages/           # Landing, Refuge, Explore, Market, Gacha, Codex
│   │   ├── state/           # AuthContext
│   │   └── api/             # Appels au serveur
│   └── vite.config.ts
│
├── .env                     # Variables d'environnement (à créer)
└── package.json             # Workspace racine
```

---

## 🎛️ Ajouter du contenu (Pokémon, traits, synergies…)

Tout l'équilibrage vit dans `shared/src/data/` et le moteur n'a pas besoin d'être
touché pour ajouter quoi que ce soit.

**👉 [Guide de game design complet](GAME-DESIGN.md)** — ajouter un Pokémon, un
trait, une synergie, une relique, un événement, une récompense, un ennemi ; le
vocabulaire des effets ; les deux règles de cumul à ne pas rater ; et le contrat
anti-triche à respecter.

⚠️ Après toute modification dans `shared/`, relance `npm run build --workspace shared` —
le client et le serveur consomment la version compilée.

## 🎨 Les sprites des créatures

Le rendu des créatures est **interchangeable**, piloté par `VITE_SPRITE_SOURCE` dans le `.env` :

| Valeur | Ce que tu vois | À savoir |
|---|---|---|
| `svg` | Créatures originales dessinées en SVG | Rien à licencier, aucun risque |
| `pokeapi` | **Vrais sprites 2D** chargés depuis le miroir PokeAPI | Images appartenant à Nintendo / Game Freak / The Pokémon Company |
| `custom` | Ton propre jeu de sprites depuis `VITE_SPRITE_BASE_URL` (`<base>/<dex>.png`) | À toi de voir |

**Aucun sprite n'est stocké dans ce dépôt** — ils sont chargés par URL à l'exécution. C'est volontaire : ce qui fait tomber un dépôt GitHub sur signalement, c'est d'y **héberger** les fichiers, pas de les afficher en local.

Si une image ne charge pas (hors-ligne, URL morte, source indisponible), le jeu retombe automatiquement sur les créatures SVG — jamais d'image cassée.

⚠️ **Avant toute mise en ligne publique**, repasse sur `VITE_SPRITE_SOURCE="svg"`. Les sprites sont l'élément le plus surveillé : un fan-game qui reste en local ne dérange personne, un site public qui les affiche est la cible habituelle des demandes de retrait.

### Configuration des sprites

**Pour le développement local**, utilise `VITE_SPRITE_SOURCE="pokeapi"` :
```env
VITE_SPRITE_SOURCE="pokeapi"
VITE_SPRITE_BASE_URL=""
```

**Si les sprites ne s'affichent pas** :
1. Vérifie que `.env` a `VITE_SPRITE_SOURCE="pokeapi"` (pas `"custom"`)
2. Si c'est `"custom"`, tu dois servir des sprites sur `VITE_SPRITE_BASE_URL` (ex: un serveur HTTP local)
3. Relance le serveur client : `npm run dev:client`

**Pour servir des sprites locaux** (mode `"custom"`), télécharge les images Pokémon en `.png` et serve-les :
```bash
# Exemple : servir des sprites depuis le port 8099
python3 -m http.server 8099 --directory ./sprites
```
Puis configure :
```env
VITE_SPRITE_SOURCE="custom"
VITE_SPRITE_BASE_URL="http://localhost:8099"
```

## 🖼️ Ton logo

Dépose `logo_blank.png` dans **`client/public/assets/`**. Il est repris
automatiquement dans la barre du haut. Tant que le fichier n'est pas là, la
marque pixel dessinée en SVG sert de repli — rien ne casse.

---

## 🔐 Sécurité

- ⚠️ **Ne partage JAMAIS** ton `.env` publiquement (contient secrets Discord + DB)
- ⚠️ **Ne commit JAMAIS** le `.env` (il est dans `.gitignore`)
- Avant de pousser du code : `git status` pour vérifier
- En production : utiliser des variables d'environnement du host (Vercel, Railway, etc.)

---

## 🎯 Prochaines étapes (roadmap)

- [x] Traits, synergies à seuils, étoiles d'activité
- [x] Donjons procéduraux (roguelite) + reliques + risque/récompense
- [x] Collection / Codex
- [x] Hôtel de vente + améliorations d'enclos payantes
- [x] Enclos multi-Pokémon, exclusivité Refuge / exploration
- [x] Arène de combat animée avec barre de vie par Pokémon
- [x] Combat Pokémon 1v1 au tour par tour avec vraies attaques et table des types
- [x] 10 stages de difficulté, boss légendaire, progression débloquante
- [x] Plusieurs types d'œufs
- [x] 84 espèces en familles d'évolution, avec learnsets par niveau
- [x] Niveaux achetés avec les ressources, attaques au choix, évolutions, chromatiques
- [ ] Compositions sauvegardées (builds nommés)
- [ ] Combats PvE hardcore (patterns de boss)
- [ ] PvP asynchrone + paris virtuels
- [ ] Déploiement zero-cost (Vercel + Railway + Supabase)

---

## 📚 Architecture & Philosophie

**Anti-triche par design** : Le serveur ne fait jamais confiance au client pour les timestamps. Production `= now() - lastCollectedAt`, plafonné à 12h → impossible de tricher en changeant l'horloge.

**Monorepo NPM workspaces** : `shared/` réutilisable, `server/` stateless, `client/` en React.

**Stack moderne** : TypeScript partout, tests unitaires (vitest), migrations de DB (Prisma), OAuth2 standards.

---

## 💬 Questions ?

- Vérifiez les logs serveur (Terminal 1)
- Relancez les serveurs après chaque changement de `.env`
- Assurez-vous que port 4000 et 5173 sont libres

Bon développement ! 🚀
