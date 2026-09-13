# PokéRancher

Fan-game web Pokémon (Idle + Roguelite + Gacha), 100% gratuit, sans pub ni micro-transaction.

Ce dépôt contient la première brique : **connexion Discord**, **Refuge (idle)** et **Gacha (fusion de doublons)**.

## Stack

- `shared/` — types, données de jeu (espèces, slots, table de rareté) et logique pure (production, paliers d'étoiles, tirage gacha), testés unitairement.
- `server/` — Node + Express + TypeScript + Prisma/PostgreSQL. OAuth2 Discord, calcul de production **côté serveur** (anti-triche), gacha.
- `client/` — React + Vite + TypeScript.

## Pourquoi c'est "anti-triche" par design

Le client ne fixe jamais l'horodatage utilisé pour calculer la production : le serveur stocke `lastCollectedAt` et calcule toujours `elapsed = now() - lastCollectedAt`, plafonné à `MAX_OFFLINE_MS` (12h). Le client peut afficher un aperçu, mais seul le `POST /refuge/slots/:type/claim` fait foi.

## Démarrer en local

```bash
npm install

# Base de données Postgres locale (ou Supabase/Neon en prod)
cp .env.example .env
# éditer .env : DATABASE_URL, JWT_SECRET, DISCORD_CLIENT_ID/SECRET (voir ci-dessous)

npm run db:migrate   # applique le schema Prisma
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

### Créer l'app Discord (liaison de compte)

1. https://discord.com/developers/applications → New Application
2. OAuth2 → Redirects : ajouter `http://localhost:4000/auth/discord/callback`
3. Copier `Client ID` / `Client secret` dans `.env`
4. Scope utilisé : `identify` uniquement (pas d'email, pas de guilds)

Le flow : `GET /auth/discord/login` (redirige vers Discord, state anti-CSRF en cookie) → `GET /auth/discord/callback` (échange le code, upsert le `User` par `discordId`, pose un cookie de session JWT httpOnly) → redirection vers `/refuge` côté client.

## Boucle actuelle

1. **Inscription** : bouton "Se connecter avec Discord" → compte créé/lié automatiquement, crédité de `STARTER_EGG_SHARDS` (150) pour pouvoir lancer son premier œuf.
2. **Gacha** (`POST /gacha/roll`, coûte 50 `egg_shard`) : tirage pondéré par rareté parmi le roster (`shared/src/pokemon-data.ts`). Un doublon incrémente la colonne `quantity` de `PokemonUnit` (pas de nouvelle ligne) et fait progresser les paliers d'étoiles (2/4/8/16 exemplaires → ×1.1/×1.25/×1.5/×2).
3. **Refuge** : chaque Pokémon "passif" (trait lié à un slot : `BERRY_FARM`, `FISHING_DOCK`, `WOODCUTTING`, `MINING`) peut être assigné à son slot. `POST /refuge/slots/:type/claim` (ou `/refuge/claim-all`) crédite les ressources accumulées depuis le dernier claim, plafonné à 12h de production hors-ligne.

Les Pokémon "offensifs" (Keldeo, Mysdibule) sont dans les données mais n'ont pas encore de rôle — réservés à la boucle donjon à venir.

## Prochaines étapes (non incluses ici)

- Donjons procéduraux (roguelite) et validation de fin de run
- PvE Hardcore (boss), PvP asynchrone + paris virtuels
- Déploiement zero-cost (Vercel/Cloudflare + Render/Railway + Supabase/Neon)

## Tests

```bash
npm run test        # vitest sur shared (logique pure)
npm run typecheck    # tsc --noEmit sur les 3 packages
```

La logique de production/gacha/paliers a aussi été vérifiée manuellement contre une vraie instance PostgreSQL (migration Prisma appliquée, endpoints testés via curl) : calcul de production correct, plafond anti-triche à 12h vérifié, fusion de doublons (paliers d'étoiles) vérifiée sur plusieurs tirages.
