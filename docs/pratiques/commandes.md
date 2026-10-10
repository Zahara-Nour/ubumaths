# Scripts pnpm — référence

Toutes les commandes `pnpm <script>` de `package.json`, par usage. Vérifié contre `package.json` le 2026-10-10.

> Ports : **5175** (Claude), **5173** (David — ne jamais l'utiliser), **54321** (Supabase local).
> pnpm 12 : pas d'option `-s` (« unexpected argument »).

## Verrous (Mac mini, 24 Go)

- **Gros process** (`scripts/gros-process.sh`) : `check`, `check:incremental`, `build`, `lint` passent sous **un seul verrou**. Un second sort en **exit 2** en nommant le détenteur : on attend, on ne contourne pas. Pas de verrou en CI ni sur Vercel.
- **Supabase local** (`scripts/with-db-lock.sh`) : tous les `db:*` locaux, `test:integration`, `test:definer-guard`, `db:seed-riche`.
- Mesures (durée, mémoire) : [mesures-mac-mini.md](mesures-mac-mini.md).

---

## Développement

| Commande            | Effet                                               | Notes                                                     |
| ------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Serveur Vite (HMR)                                  | **`pnpm dev --port 5175 --strictPort`** — voir ci-dessous |
| `pnpm build`        | Build de production (heap 8 Go), verrouillé         | Identique au build Vercel ; 64 s                          |
| `pnpm analyze`      | Build + analyse du bundle (`ANALYZE=1`)             |                                                           |
| `pnpm preview`      | Sert le build en local                              | Après `pnpm build`                                        |
| `pnpm kill:servers` | Tue les serveurs restés ouverts                     | ⛔ Jamais depuis un worktree : tue 5173 et Supabase       |
| `pnpm extern:sync`  | Synchronise `extern/` (sources externes en lecture) | Local seulement                                           |

> ⚠️ **Pas de `--` devant le port** : `pnpm dev -- --port 5175` démarre sur **5173**, le port de David (vérifié le 2026-09-10). `--strictPort` fait échouer si 5175 est pris, au lieu de dériver en silence.

---

## Qualité — types, lint, format

| Commande                        | Effet                                                              | Notes                                                                                |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `pnpm check:incremental`        | `svelte-check` avec cache, même scope que la CI — **le quotidien** | ~45 s (~80 s à froid, `FRESH=1`) ; rejoue le résultat si rien n'a changé (`FORCE=1`) |
| `pnpm check`                    | **Le check CI** (`tsconfig.check.json`, heap 8 Go), verrouillé     | 82 s                                                                                 |
| `pnpm check:watch`              | `svelte-check` en watch                                            |                                                                                      |
| `pnpm check:changed`            | Check des fichiers modifiés (`scripts/check-changed.sh`)           | `check:staged` : fichiers stagés                                                     |
| `pnpm lint:fast`                | Toutes les règles de niveau erreur, sans types                     | ~2,5 s ; lancé au `pre-push`                                                         |
| `pnpm lint`                     | ESLint complet avec cache, verrouillé                              | 530 s à froid → **en arrière-plan**                                                  |
| `pnpm lint:all`                 | `eslint .` avec cache, sans verrou                                 | Préférer `pnpm lint`                                                                 |
| `pnpm format "<chemins>"`       | `prettier --write`                                                 | `format:all` : tout le dépôt (lourd)                                                 |
| `pnpm format:check`             | Prettier `--check` sur les fichiers suivis                         | Lancé au `pre-push` ; `format:check:all` : tout                                      |
| `pnpm svelte:autofix <fichier>` | Autofixer Svelte (MCP en CLI)                                      | **Après chaque `.svelte` créé ou modifié**                                           |
| `pnpm check:css-tokens`         | Interdit `hsl(var(--x))`                                           | [css-color-tokens.md](css-color-tokens.md)                                           |
| `pnpm check:barrels`            | Exports de barils orphelins                                        |                                                                                      |
| `pnpm check:await-render`       | Tout `render` de vitest-browser-svelte est attendu                 |                                                                                      |
| `pnpm check:ubumark`            | Vérifie la syntaxe ubumark des contenus                            |                                                                                      |
| `pnpm check:integration-paths`  | Le filtre `paths` du nightly couvre-t-il la suite d'intégration ?  | ~5 s                                                                                 |
| `pnpm docs:check-links`         | Liens internes des docs                                            |                                                                                      |

> Déconseillés : `npx tsc --noEmit` et `svelte-check` sans `--incremental` meurent sur le tas par défaut de Node (~4 Go, exit 134). `check:fast` a été retiré le 2026-10-10.

---

## Tests

| Commande                     | Effet                                           | Notes                             |
| ---------------------------- | ----------------------------------------------- | --------------------------------- |
| `pnpm test:server <chemin>`  | Tests serveur (env node)                        | Toujours ciblés en local          |
| `pnpm test:client <chemin>`  | Tests navigateur (`*.svelte.test.ts`)           | Chromium / Playwright             |
| `pnpm test:integration`      | Intégration + base (Supabase local), verrouillé | ~180 s ; `test:integration:watch` |
| `pnpm test:definer-guard`    | Garde des fonctions `SECURITY DEFINER`          | Verrou Supabase                   |
| `pnpm test` / `test:changed` | Vitest sur les fichiers modifiés                |                                   |
| `pnpm test:e2e`              | Playwright end-to-end                           |                                   |
| `pnpm test:lint-rules`       | Règles ESLint maison                            |                                   |

Architecture des tests : [tests.md](tests.md).

---

## Base de données (Supabase)

| Commande                     | Effet                                                         | Notes                                  |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| `pnpm db:start` / `db:stop`  | Supabase local (Docker)                                       |                                        |
| `pnpm db:reset`              | Recrée la base locale depuis le baseline                      | Verrouillé                             |
| `pnpm db:seed-riche`         | Contenu de la prod + 30 élèves fictifs (`eleveNN@local.test`) | Après `db:reset`                       |
| `pnpm db:dev-accounts`       | Comptes de dev locaux                                         |                                        |
| `pnpm db:migrate`            | `supabase db push` vers la base **EU de production**          | Conditions : CLAUDE.md §Migrations     |
| `pnpm db:types`              | Régénère `src/lib/types/database.ts` **depuis la production** | Une RPC pas encore en prod n'y est pas |
| `pnpm db:link` / `db:status` | Lie le projet / compte les profils manquants                  |                                        |

Pratiques : [base-de-donnees.md](base-de-donnees.md) · schéma : [../systeme/base-de-donnees.md](../systeme/base-de-donnees.md).

---

## CI, mise en prod, maintenance

| Commande                                                   | Effet                                                         | Notes                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm ci` / `ci:list` / `ci:status` / `ci:fail` / `ci:web` | Suivre, lister, résumer, lire les échecs, ouvrir la CI GitHub | `ci:fail` : logs des seules étapes rouges                                                       |
| `pnpm deploy:status` / `status`                            | État du dernier commit de main (CI + Vercel)                  |                                                                                                 |
| **`pnpm deploy:prod`**                                     | **Version (CHANGELOG, tag) + avance la branche `production`** | ⛔ **Uniquement sur demande explicite de David** (ADR 0021) ; `--essai` montre ce qui partirait |
| `pnpm release` (`:patch`, `:minor`, `:major`)              | Crée une version seule (`scripts/release.ts`)                 | Appelé par `deploy:prod` ; 1.0.0 = `release:major`, à la main                                   |
| `pnpm maintenance:on` / `:off` / `:status`                 | Mode maintenance de la prod (503)                             | Redéploie le dernier déploiement prod                                                           |
| `pnpm vercel:env`                                          | Variables d'env de production (lecture)                       |                                                                                                 |
| `pnpm env:pull` / `env:pull:prod`                          | `.env.local` depuis Vercel                                    | ⚠️ vraies clés, ⚠️ secrets de prod                                                              |

`pnpm release` décide le niveau (`feat` → mineur, le reste → patch) puis délègue CHANGELOG, commit et tag à `commit-and-tag-version` (remplace `standard-version` depuis le 2026-10-10), qui sous 1.0.0 rétrogradait chaque niveau d'un cran.

---

## Contenus : questions, relecture, corrections, fiches

| Commande                                                                       | Effet                                                               |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `pnpm question:specs`                                                          | Spécifications de questions (lit `docs/relecture/`)                 |
| `pnpm relecture:verdicts` / `relecture:import`                                 | Enregistre les verdicts de relecture / importe les questions relues |
| `pnpm corrections:generate` / `:check` / `:preview` / `:import` / `:retouches` | Chaîne des corrections (`docs/corrections/`)                        |
| `pnpm fiche:verifier`                                                          | Vérifie une fiche PDF ([fiches-exercices.md](fiches-exercices.md))  |
| `pnpm math`                                                                    | CLI mathAST                                                         |
| `pnpm openapi:generate`                                                        | Spec OpenAPI                                                        |

Historique (migrations de données ponctuelles, à ne relancer qu'en connaissance de cause) : `migrate:phase1*`, `migration:import*`, `migration:rollback*`, `migrate:sanitize`.

## Jeux

`pnpm game:setup-assets` · `game:import-challenges` (navadra) · `game:seed-spells`.
