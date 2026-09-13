# PokéRancher 🎮

Fan-game web Pokémon (Idle + Roguelite + Gacha), 100% gratuit, sans pub ni micro-transaction.

Ce projet implémente les trois briques essentielles : **connexion Discord**, **Refuge (idle)** et **Gacha (fusion de doublons)**.

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
- Assigne des Pokémons aux 4 slots (Baies, Pêche, Bois, Minerai)
- Les ressources s'accumulent automatiquement (même hors-ligne, limité à 12h)
- Clique **"Récolter"** pour les collecter

### Gacha
- Clique **"Ouvrir un œuf"** (coûte 50 `egg_shard`)
- Les doublons fusionnent et augmentent les stats (paliers ⭐)

---

## 🛠️ Commandes utiles

```powershell
# Voir tous les pokémons de la DB
npm run db:studio    # Ouvre une UI Prisma

# Relancer une migration
npm run db:migrate   # Depuis le dossier racine

# Vérifier les types TypeScript
npm run typecheck    # Sur tous les packages

# Lancer les tests
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

### Erreur : `Cannot find package '@pokerancher/shared'`
→ Le package shared n'a pas été compilé
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
│       ├── pokemon-data.ts  # Espèces, slots, rareté
│       └── types.ts         # Interfaces TypeScript
│
├── server/                  # Backend Node + Express + Prisma
│   ├── src/
│   │   ├── routes/          # API endpoints (auth, refuge, gacha)
│   │   ├── services/        # Logique métier
│   │   └── auth/            # Discord OAuth2 + JWT
│   └── prisma/
│       ├── schema.prisma    # Modèle de base de données
│       └── migrations/      # Historique des migrations
│
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── pages/           # Landing, Refuge, Gacha
│   │   ├── state/           # AuthContext
│   │   └── api/             # Appels au serveur
│   └── vite.config.ts
│
├── .env                     # Variables d'environnement (à créer)
└── package.json             # Workspace racine
```

---

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

## 🔐 Sécurité

- ⚠️ **Ne partage JAMAIS** ton `.env` publiquement (contient secrets Discord + DB)
- ⚠️ **Ne commit JAMAIS** le `.env` (il est dans `.gitignore`)
- Avant de pousser du code : `git status` pour vérifier
- En production : utiliser des variables d'environnement du host (Vercel, Railway, etc.)

---

## 🎯 Prochaines étapes (roadmap)

- [ ] Donjons procéduraux (roguelite)
- [ ] Combats PvE hardcore (boss patterns)
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
