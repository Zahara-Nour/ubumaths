# Scripts pnpm — référence

Toutes les commandes `pnpm <script>` définies dans `package.json`, par catégorie.

> Convention : `pnpm dev` lance le serveur, `pnpm <script>` lance un script.
> Ports : **5175** (réservé Claude), **5173** (David), **54321** (Supabase local).

---

## 🚀 Développement

| Commande            | Effet                                         | Notes                                        |
| ------------------- | --------------------------------------------- | -------------------------------------------- |
| `pnpm dev`          | Serveur de dev Vite (HMR)                     | `pnpm dev -- --port 5175` pour fixer le port |
| `pnpm build`        | Build de production (`vite build`, heap 8 Go) | Identique au build Vercel                    |
| `pnpm preview`      | Sert le build de prod en local                | À lancer après `pnpm build`                  |
| `pnpm kill:servers` | Tue les serveurs dev restés ouverts           | Pratique si un port est bloqué               |

---

## ✅ Qualité — types, lint, format

| Commande                 | Effet                                                                  | Notes                                    |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------- |
| `pnpm check`             | **Le check CI** : `svelte-check` sur `tsconfig.check.json` (heap 8 Go) | Lourd (~12 min), scope source            |
| `pnpm check:incremental` | Même scope que la CI, **avec cache** (`--incremental`)                 | Rapide (~20-40s) — le check du quotidien |
| `pnpm check:watch`       | `svelte-check` en mode watch                                           | Pendant le dev                           |
| `pnpm check:fast`        | `tsc --noEmit --incremental`                                           | Types only, sans la couche Svelte        |
| `pnpm check:safe`        | `svelte-check` sur `tsconfig.json` (scope large)                       | Diagnostic ponctuel                      |
| `pnpm check:changed`     | Check des fichiers modifiés (git)                                      | Voir `scripts/check-changed.sh`          |
| `pnpm check:staged`      | Check des fichiers stagés                                              | Utilisé en pre-commit                    |
| `pnpm format`            | `prettier --write` (passer des chemins)                                | Ex. `pnpm format "src/**/*.ts"`          |
| `pnpm format:all`        | Prettier sur tout le repo                                              | Lourd                                    |
| `pnpm lint`              | `eslint` (passer des chemins)                                          | Ex. `pnpm lint src/lib/x.ts`             |
| `pnpm lint:all`          | ESLint sur tout le repo (avec cache)                                   | Lourd                                    |

> ⚠️ `check:incremental` filtre `extern/` (présent en local, absent en CI). Si une
> erreur ressemble à un fantôme (fichier supprimé), purger le cache :
> `rm -rf .svelte-kit/.svelte-check && pnpm check:incremental`.

---

## 🧪 Tests

| Commande                      | Effet                                      | Notes                                       |
| ----------------------------- | ------------------------------------------ | ------------------------------------------- |
| `pnpm test`                   | = `test:changed`                           | Tests des fichiers modifiés                 |
| `pnpm test:changed`           | Vitest sur les fichiers changés            | `--passWithNoTests`                         |
| `pnpm test:server`            | Tests serveur (env node)                   | La vraie gate de régression                 |
| `pnpm test:client`            | Tests client (Chromium/Playwright)         | Composants `*.svelte.test.ts`               |
| `pnpm test:integration`       | Tests d'intégration (Supabase requis)      | Config dédiée                               |
| `pnpm test:integration:watch` | idem en watch                              |                                             |
| `pnpm test:e2e`               | Tests end-to-end Playwright                |                                             |
| `pnpm test:lint-rules`        | Teste la règle ESLint maison (require-zod) |                                             |
| `pnpm test:triggers`          | Tests de triggers DB (Docker)              | ⛔ Ne marche pas en local — ne pas utiliser |

> Les tests `*-real.svelte.test.ts` (vrai Pyodide) sont exclus de la CI et tournent
> en local ou via le job nightly. Cf. `vite.config.ts`.

---

## 🗄️ Base de données (Supabase)

| Commande               | Effet                                      | Notes                           |
| ---------------------- | ------------------------------------------ | ------------------------------- |
| `pnpm db:start`        | Démarre Supabase local (Docker)            | Port 54321                      |
| `pnpm db:stop`         | Arrête Supabase local                      |                                 |
| `pnpm db:reset`        | Reset complet de la base locale            | Rejoue les migrations           |
| `pnpm db:migrate`      | Pousse les migrations (`supabase db push`) | Vers le projet lié              |
| `pnpm db:types`        | Régénère `src/lib/types/database.ts`       | Après tout changement de schéma |
| `pnpm db:link`         | Lie le projet Supabase                     |                                 |
| `pnpm db:status`       | Compte profils manquants vs users          | Diagnostic d'intégrité          |
| `pnpm db:fix-profiles` | Corrige les users sans profil              | Migration 005                   |

---

## 🔁 CI & statut de déploiement (GitHub)

| Commande             | Effet                                         | Notes                         |
| -------------------- | --------------------------------------------- | ----------------------------- |
| `pnpm ci`            | Suit le run en cours en live (`gh run watch`) | Bloquant                      |
| `pnpm ci:list`       | Liste les 10 derniers runs                    |                               |
| `pnpm ci:status`     | État job par job du dernier commit `main`     |                               |
| `pnpm ci:fail`       | Logs des seules étapes rouges du dernier run  | Le plus utile en debug        |
| `pnpm ci:web`        | Ouvre le run dans le navigateur               |                               |
| `pnpm deploy:status` | État + URL du déploiement Vercel (via GitHub) |                               |
| `pnpm status`        | **CI + Vercel en une commande**               | `ci:status` + `deploy:status` |

> Nécessite `gh` authentifié. Vercel est interrogé via l'API GitHub (pas de lien requis).

---

## ▲ Vercel & maintenance

| Commande                  | Effet                                                | Notes                      |
| ------------------------- | ---------------------------------------------------- | -------------------------- |
| `pnpm vercel:env`         | Liste les variables d'env Production                 | Lecture seule              |
| `pnpm vercel:deploy`      | `vercel --prod` (déploie l'arbre local)              |                            |
| `pnpm env:pull`           | Synchronise `.env.local` depuis Vercel (development) | ⚠️ vraies clés en local    |
| `pnpm env:pull:prod`      | idem, variables de **production**                    | ⚠️ secrets de prod         |
| `pnpm maintenance:status` | État du mode maintenance                             | Lecture seule              |
| `pnpm maintenance:on`     | Active la maintenance (503) + redeploy               | Génère le secret de bypass |
| `pnpm maintenance:off`    | Désactive la maintenance + redeploy                  |                            |

> Nécessite le CLI `vercel` (≥ 54) authentifié + projet lié (`.vercel/project.json`).
> `maintenance:on/off` redéploient le **dernier déploiement prod** (sans déployer
> l'arbre local). Détails : `docs/wip/maintenance-page-progress.md`.

---

## 🏷️ Releases

| Commande             | Effet                                             | Notes                  |
| -------------------- | ------------------------------------------------- | ---------------------- |
| `pnpm release`       | Version auto selon les commits (standard-version) | Bump + CHANGELOG + tag |
| `pnpm release:patch` | Force un bump patch                               |                        |
| `pnpm release:minor` | Force un bump minor                               |                        |
| `pnpm release:major` | Force un bump major                               |                        |

> Après : `git push --follow-tags origin main`. Le tag déclenche la Release GitHub auto.

---

## 📦 Migration de questions / données

| Commande                         | Effet                                  |
| -------------------------------- | -------------------------------------- |
| `pnpm migrate:phase1`            | Migration des questions (phase 1)      |
| `pnpm migrate:phase1:dry`        | Dry-run (aucune écriture)              |
| `pnpm migrate:phase1:resume`     | Reprend une migration interrompue      |
| `pnpm migrate:phase1:rollback`   | Annule la migration                    |
| `pnpm migrate:phase1:validate`   | Valide les questions migrées           |
| `pnpm migration:import`          | Importe les questions en base          |
| `pnpm migration:import:dry`      | Dry-run de l'import                    |
| `pnpm migration:import:approved` | N'importe que les questions approuvées |
| `pnpm migration:rollback`        | Rollback de l'import                   |
| `pnpm migration:rollback:dry`    | Dry-run du rollback                    |
| `pnpm migration:rollback:all`    | Rollback complet                       |
| `pnpm migrate:sanitize`          | Nettoie les notifications existantes   |

---

## 🎮 Jeu (navadra) & assets

| Commande                      | Effet                          |
| ----------------------------- | ------------------------------ |
| `pnpm game:setup-assets`      | Prépare les assets du jeu      |
| `pnpm game:import-challenges` | Importe les challenges navadra |
| `pnpm game:seed-spells`       | Seed des définitions de sorts  |

---

## 🧰 Divers

| Commande                | Effet                                      |
| ----------------------- | ------------------------------------------ |
| `pnpm math`             | CLI mathAST (`src/lib/mathAST/cli/cli.ts`) |
| `pnpm docs:check-links` | Vérifie les liens des docs                 |
| `pnpm openapi:generate` | Génère la spec OpenAPI                     |
| `pnpm prepare`          | Hook husky (auto à l'install)              |

---

## Notes Claude Code (rappel CLAUDE.md)

- **Quotidien** : `pnpm check:incremental` (pas `pnpm check`/`check:fast`/`check:safe`
  qui sont lourds), `pnpm format "<chemins>"`, `pnpm lint <fichiers>`.
- **Tests ciblés** : `pnpm test:server <path>` / `pnpm test:client <path>`.
- Ne pas lancer `format:all` / `lint:all` / `test:triggers` (lourd ou cassé en local).
