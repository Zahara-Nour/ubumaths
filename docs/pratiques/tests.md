# Les tests de Chiphre

Doc unique du système de tests : où ranger un test, quel runner l'exécute, ce qui tourne où,
comment écrire un test d'intégration contre la base. Les scripts pnpm sont résumés dans
[commandes.md](commandes.md) ; le workflow TDD collaboratif est dans
[CLAUDE.md §Planning](../../CLAUDE.md).

---

## 1. Où vivent les tests

**Règle d'or : un test unitaire vit à côté de son code, dans un dossier `__tests__/`.**
`tests/` est réservé à ce qui ne peut pas être co-localisé : besoin d'une vraie base Supabase,
ou infra partagée entre tests. Les parcours navigateur vivent dans `e2e/`.

```
src/<module>/__tests__/
├── foo.test.ts              → unitaire node    (projet vitest « server »)
└── Bar.svelte.test.ts       → unitaire browser (projet vitest « client »)
scripts/**/__tests__/*.test.ts → projet « server » aussi

tests/
├── integration/             ← Supabase local ; 177 fichiers *.test.ts à plat (pas de sous-dossier par domaine)
│   ├── database/            ← triggers PL/pgSQL (11 fichiers *.test.ts)
│   ├── fixtures/            ← copies figées lues par la suite (seeds de l'arbre des notions, liste blanche DEFINER)
│   └── global-setup.ts      ← refuse hors pile de test, puis supprime les profs seedés avant la suite
├── helpers/                 ← infra partagée (§4)
├── fixtures/                ← copies figées lues par des tests (lexique/, relecture/)
├── seed-test-data.ts        ← seed / nettoyage pour les e2e, lancés à la main (`npx tsx …`),
└── cleanup-test-data.ts       aucun script pnpm ni config ne les appelle

e2e/<rôle>/*.spec.ts         ← Playwright : auth/, exercises/, navadra/, public/, student/, teacher/ (+ helpers/)
e2e/verifs/*.spec.ts         ← lignes de docs/wip/verifications-manuelles.md automatisées (+ sonde.spec.ts)
eslint-rules/*.test.js       ← tests des règles ESLint maison
```

### Où ranger un nouveau test ?

1. Pilote l'app complète dans un navigateur → `e2e/<rôle>/*.spec.ts`.
2. A besoin d'une vraie base (RLS, RPC, trigger, policy, course) → `tests/integration/*.test.ts`
   (`tests/integration/database/` pour un trigger pur).
3. Composant Svelte ou store rune (besoin d'un DOM) → `src/<module>/__tests__/*.svelte.test.ts`.
4. Logique pure, fonction serveur, handler avec client mocké → `src/<module>/__tests__/*.test.ts`.
5. Règle ESLint maison → `eslint-rules/*.test.js`.

En cas de doute : « est-ce que ça peut vivre à côté de son code ? » Si oui, `__tests__/`.

---

## 2. Quel runner pour quoi — le suffixe route

| Suffixe / fichier                             | Runner                                                    | Config                           | Lancement                                                  |
| --------------------------------------------- | --------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------- |
| `src/**`, `scripts/**` `*.test.ts`            | vitest projet **`server`** (node)                         | `vite.config.ts`                 | `pnpm test:server <chemin>`                                |
| `src/**/*.svelte.test.ts`                     | vitest projet **`client`** (Chromium)                     | `vite.config.ts`                 | `pnpm test:client <chemin>`                                |
| `src/**/*-real.svelte.test.ts`                | projet `client`, **exclu en CI** (Pyodide réel)           | `vite.config.ts`                 | nightly, ou `pnpm test:client` en local                    |
| `tests/integration/**/*.test.ts`              | vitest **`integration`** (node, séquentiel)               | `vitest.integration.config.ts`   | `pnpm test:integration`                                    |
| `tests/ecarts/**/*.test.ts`                   | vitest projet **`ecarts`**, **hors CI** (rouges attendus) | `vite.config.ts`                 | `pnpm ecarts rejouer` ([registre](registre-des-ecarts.md)) |
| `garde-fonctions-security-definer.test.ts`    | vitest **`definer-guard`** (seul)                         | `vitest.definer-guard.config.ts` | `pnpm test:definer-guard`                                  |
| `e2e/**/*.spec.ts`                            | Playwright (chromium, firefox, webkit)                    | `playwright.config.ts`           | `pnpm test:e2e`                                            |
| `e2e/verifs/*.spec.ts`                        | Playwright (6 navigateurs), serveur de dev                | `playwright.verifs.config.ts`    | `pnpm test:verifs` (`VERIFS_PORT`, `VERIFS_URL`)           |
| `eslint-rules/require-zod-validation.test.js` | node                                                      | —                                | `pnpm test:lint-rules`                                     |

Détails qui comptent :

- **`vitest.base.config.ts`** est partagé : `expect.requireAssertions: true` partout → **un test
  sans aucun `expect` échoue**. `dbTestConfig` (intégration, definer-guard) : node, timeouts 30 s,
  `pool: 'forks'`, `maxWorkers: 1` (un fichier à la fois, un processus neuf par fichier).
- **Exclusion `*-real`** : `vite.config.ts` ne les exclut que si `CI` est posé et
  `RUN_PYODIDE_REAL` absent. En local, `pnpm test:client` sans chemin les lance donc (lents :
  ils téléchargent Pyodide).
- **Le projet `client`** exclut `src/lib/server/**` ; setup : `vitest-setup-client.ts`. Le projet
  `server` : `vitest-setup-server.ts`. Les deux en `silent: 'passed-only'` (logs des seuls tests en échec).
- **`definer-guard`** n'a ni plugin sveltekit ni `global-setup` : il lit le catalogue Postgres
  (pile de test en local, port 55322) et n'a besoin que d'une base migrée.
- **`pnpm test:changed`** (= `pnpm test`) : `vitest run --changed` sur les projets de
  `vite.config.ts` (server + client), jamais l'intégration.
- **Couverture** : le bloc `coverage` de `vite.config.ts` est **inerte** — `@vitest/coverage-v8`
  n'est pas installé, aucun script ni job ne la lance.
- **Alias** : les helpers s'importent par `#tests/helpers/index.ts` (import de sous-chemin, cf. [svelte-typescript.md](svelte-typescript.md#imports-lib-et-tests)), jamais
  `'tests/helpers'`. La suite d'intégration importe en relatif (`../helpers/database/…`).

---

## 3. Ce qui tourne où

| Où                                                      | Ce qui tourne                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local**                                               | Ce que tu lances : tests **ciblés** (contrainte RAM, cf. CLAUDE.md). Intégration sur la pile de test, sous le verrou `supabase-test`.                                                                                                                                                                                                               |
| **Toute PR + push sur `main`** (`quality.yml`)          | `test-server` (**4 shards**), `test-client` (**2 shards**, hors `*-real`), `definer-guard` (Supabase `db start` + `pnpm test:definer-guard`) ; plus Lint (dont `check:await-render`), Type Check, Types des tests (cliquet), Build, Audit. Tous agrégés par **CI Summary**.                                                                         |
| **PR filtrées par `paths`** (`nightly-integration.yml`) | **Integration tests (shard N/4)** : `pnpm test:integration --shard=N/4`, une pile Supabase complète par morceau (1 seul morceau quand l'intégration ciblée ne garde que quelques tests), + job **Integration paths filter** (`pnpm check:integration-paths`).                                                                                       |
| **Nuit**                                                | Intégration (cron `17 2 * * *`, 02:17 UTC, `nightly-integration.yml`) ; Pyodide réel (cron `0 3 * * *`, `nightly-pyodide.yml`, `RUN_PYODIDE_REAL=1`, `vitest run --project client src/**/*-real.svelte.test.ts`).                                                                                                                                   |
| **Jamais en CI**                                        | `pnpm test:e2e` (build + preview, lancé à la demande — le `pnpm build` du `webServer` prend le verrou gros process) ; `pnpm test:verifs` (serveur de dev, ou la prod avec `VERIFS_URL=https://chiph.re` : une ligne de vérification manuelle par test, un test rouge = bug ou ligne périmée, jamais un attendu à changer) ; `pnpm test:lint-rules`. |

**`e2e/verifs/carnet.spec.ts` écrit dans la base locale** (décor du carnet de liaison :
une classe remise à zéro, consentement, inactivité, limites de débit effacées ; garde : jamais
avec `VERIFS_URL`). La lancer sous le verrou `supabase` (celui de la base de dev, que le serveur de dev utilise), serveur de dev déjà démarré :
`VERIFS_PORT=<port> bash scripts/with-db-lock.sh pnpm test:verifs carnet`. Les courriels sont lus
dans `.captures/courriels/`, les captures d'écran (téléphone, clair et sombre) écrites dans
`.captures/verifs/carnet/`.

**Navigateurs de `pnpm test:verifs`** (`e2e/verifs/projets.ts`) : sans `--project`, l'ordinateur
Chrome seul (le jour) ; `--project <nom>` pour un autre (`ordi-safari`, `ordi-firefox`, `iphone`,
`android`, `firefox-390`, motif `ordi-*` admis) ; `pnpm test:verifs:tout` pour tous (environ 15 min).
Un moteur absent arrête tout avec la ligne `pnpm exec playwright install …`. Un test sans sens au
téléphone (raccourci `Ctrl+…`, clic droit, poignée) porte l'étiquette `@bureau` : sauté sur
`iphone`, `android`, `firefox-390`. Firefox à 390 px ne joue que les graphiques, les constructions
et `@clavier-mathlive`. Le carnet ne tourne que sur `ordi-chrome` (décor partagé de la base).
Au téléphone, les outils communs font les gestes de l'élève : `calc` déplie « Mes objets »
(`showCards`, sauf `leavePanelAlone`). Firefox sur macOS 27 démarre avec un dossier personnel à
lui (`CFFIXED_USER_HOME`), sinon il s'arrête (« Could not find profile folder »). Captures « à
l'œil » au format iPhone : `pnpm test:verifs:captures --project iphone`.

**Pièges de `pnpm test:verifs`** (relevés par le chantier `ecarts-verifs`, clos le 2026-11-26) :

- **Ne jamais changer l'attendu d'un test de `e2e/verifs/`** pour le faire passer : un rouge est un
  écart à inscrire au registre (`pnpm ecarts ajouter`), tranché par David.
- **Lancer soi-même son serveur de dev** avant `test:verifs` (`VERIFS_PORT=<port>` s'il n'est pas
  sur 5176) : le serveur lancé par Playwright meurt avec un lot arrêté.
- **Plusieurs lots en parallèle** (agents) : `--output=<dossier à soi>` et `--workers=1` ou `2`,
  sinon `ENOENT` et délais dépassés.
- **L'énoncé d'un exercice est présent deux fois dans la page** (une copie cachée) : compter avec
  `:visible`.
- **Un test qui ouvre un modèle de questions lit le modèle EN BASE**, pas le fichier du dépôt : un
  modèle corrigé en prod reste à l'ancienne dans la base locale tant qu'il n'y est pas réécrit, et
  un `pnpm db:neuf` le remet à l'ancienne.
- **La capture WebKit d'une carte retournée sort en miroir** (artefact de `page.screenshot`, pas un
  défaut de la page) : la retourner pour la lire, ou lire la vidéo.
- **Un seul professeur par base** : le second compte capable d'assigner est l'admin. Le prof de la
  base locale n'a pas d'école : ce qui dépend de l'école (périodes) ne s'y vérifie pas.

**Intégration : PR ou nightly ? Les deux.** Le workflow `nightly-integration.yml` se déclenche
(1) chaque nuit, (2) sur toute PR qui touche un fichier de son filtre `paths` (`supabase/**`,
`tests/integration/**`, `tests/helpers/**`, configs vitest, `package.json`, et la fermeture des
imports de la suite dans `src/lib` et `src/routes`), (3) à la main. Il **ne tourne pas** sur un
push sur `main`, ni sur une PR hors filtre. Il **n'est pas** dans CI Summary et ne doit pas
devenir un check obligatoire : filtré, il ferait attendre pour toujours les PR hors filtre. Le
cron rattrape ce que le filtre laisserait passer.

Le filtre suit la suite : `pnpm check:integration-paths` (`scripts/check-integration-paths.ts`)
recalcule les fichiers atteints et échoue sur un fichier non couvert ou un motif mort. ⚠️ Chez
GitHub, `?` et `+` portent sur le caractère **précédent** et `[]` est une classe : un `+server.ts`
s'écrit `*server.ts` dans le filtre. Ne pas vérifier un motif avec minimatch.

**Tests de migration de données : la nuit, pas sur les PR.** Un test qui rejoue une migration
ne faisant que ranger, taguer ou corriger du contenu (copie de la prod, rejeu du fichier,
rollback) porte la mention `@migration-de-donnees` dans son en-tête. Sur une PR, il ne tourne que
si la PR le touche ou touche sa migration ; tous tournent si elle touche une migration qui n'est
ni un rangement ni un contenu, un autre fichier de `supabase/`, ou l'outillage de la suite
(`tests/helpers/**`, `tests/integration/fixtures/**`, global-setup, configs vitest, lockfile ;
`scripts/ci-integration-exclusions.sh`) ; la nuit et à la main, il tourne toujours. Un nouveau
test de ce genre copie la mention de son gabarit. ⛔ Jamais la mention sur un test dont la
migration pose une règle d'accès, une fonction, un trigger ou une colonne : la garde
`pnpm check:migrations-de-donnees` (job `paths-filter`) la refuse. Sans mention, le test tourne
sur chaque PR : c'est plus lent, jamais dangereux.

**PR de code : seuls les tests touchés.** Sur une PR qui ne modifie que `src/`, de la doc (`docs/`,
`.md` de la racine) et des tests d'intégration, le job `portee` (étape « Tests touchés »,
`scripts/ci-integration-touches.ts`) ne garde que les tests dont les imports atteignent un fichier
modifié, plus les tests d'intégration que la PR ajoute ou modifie. Les fichiers chargés en lot
(`import.meta.glob`, jusque sous `docs/`) comptent comme atteints par les tests qui atteignent
leur chargeur. Aucun test atteint : les checks finissent en ✅ sans démarrer Supabase. Jusqu'à 40
tests, un seul morceau ; au-delà, 4. **Suite complète** dès qu'un fichier est hors de ces trois
zones (`.claude/`, `scripts/`, `supabase/`, racine…), qu'un fichier de `src/` est supprimé ou
renommé, qu'il est atteint par le global-setup, que c'est `src/env.ts`, ou que le calcul échoue.
Mesure (#2964, 2 tests retenus) : 3 min de bout en bout au lieu de 6 à 7 ; il reste 1 min 30 de
démarrage de Supabase pour 10 s de tests.

**Passage déjà vert : pas relancé.** Le job `portee` calcule une empreinte
(`scripts/ci-integration-empreinte.sh` : fichiers du filtre `paths` lus sur le commit de merge,
plus la portée retenue). Si un passage vert de la même empreinte est en cache
(`integration-vert-v1-<empreinte>`, écrit par le job `memoriser`), les morceaux finissent en ✅
sans relancer les tests et renvoient au run d'origine. Un push qui touche un fichier suivi, ou
`main` qui avance sur l'un d'eux, change l'empreinte. Un passage rouge ou annulé n'est pas gardé.
⚠️ Un test instable passé vert une fois reste vert pour cette empreinte : le cron est le filet.
« Re-run all jobs » saute aussi : pour forcer, lancement à la main (`workflow_dispatch`). La nuit
et à la main, toute la suite tourne toujours, sans lire ni écrire ce cache.

Le **gate de régression** quotidien reste `test-server` (rapide, déterministe).

---

## 4. Écrire un test d'intégration

### Lancer

```bash
pnpm test:integration    # suite entière (~13 min) : démarre et met à jour la pile de TEST toute seule
pnpm test:integration tests/integration/mon-test.test.ts   # un seul fichier, sous verrou
pnpm test:integration:watch
pnpm db:test:stop        # arrêter la pile de test (elle reste allumée après les tests, ~0,7 Go)
pnpm db:test:reset       # la reconstruire de zéro
```

**Pile de test, pas la base de dev.** En local, la suite tourne sur une pile Supabase à part
(`project_id` `ubumaths-test`, ports `5532x`), construite comme celle de la CI : migrations de la
branche + seed simple, jamais de contenu de la prod. Aucun `pnpm db:start` à faire : la commande
la démarre si elle est arrêtée, puis la met d'accord avec la branche avant les tests
(`scripts/pile-de-test/`) :

- migrations de la branche qui lui manquent : jouées ;
- migration d'une autre branche, migration **modifiée depuis son passage**, seed, `config.toml` ou
  version de la CLI changés : pile **reconstruite de zéro** (environ 35 s), avec un message qui dit
  pourquoi. Corriger une migration puis relancer les tests suffit donc : pas de reset à la main ;
- migration en échec : les tests ne sont pas lancés, le fichier et l'erreur sont affichés.

La base de dev (ports `5432x`) n'est jamais touchée : le prof de dev et les classes du seed-riche
restent, le serveur de dev continue de tourner pendant la suite. Lancée sans le lanceur
(`vitest --config vitest.integration.config.ts`), la suite **refuse** de tourner.

**Code serveur importé par un test.** Il vise la pile de test, quoi que dise
`.svelte-kit/generated` : `vitest.integration.config.ts` impose l'adresse (`$app/env/public` et
`process.env.PUBLIC_SUPABASE_URL`), gardé par `tests/integration/pile-de-test-adresse.test.ts`. Ne
jamais poser `PUBLIC_SUPABASE_URL` dans l'environnement d'une commande vite ou vitest : SvelteKit
l'écrit sur disque, et le serveur de dev du worktree changerait de base.

**Verrou `supabase-test`** : `test:integration`, `test:integration:watch`, `test:definer-guard`,
`db:test:stop` et `db:test:reset` passent par `scripts/pile-de-test.sh` (`flock` via
`scripts/lib/lock.py`). Une seule pile de test pour tous les worktrees : une seule suite à la
fois. Le second arrivant sort en **exit 2** en nommant le détenteur — ça s'attend, ça ne se
contourne pas. Les `db:*` de la base de dev ont leur propre verrou (`supabase`) : ils ne bloquent
plus les tests, et inversement.

`global-setup.ts` supprime tous les comptes `teacher` avant la suite (le trigger
`enforce_single_teacher` n'en admet qu'un). En local il vérifie d'abord que la base visée est la
pile de test, et refuse sinon : il ne supprime jamais rien dans la base de dev.

### Les helpers réels (`tests/helpers/database/`)

| Fichier                   | Ce qu'il fournit                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `trigger-test-helpers.ts` | `createServiceRoleClient()` (contourne la RLS : préparer, vérifier), `createTestSupabaseClient()` (anon), `cleanupAllTestData()`, `cleanupTestData()`, `generateTestEmail()` (`<uuid>@test.com`), `waitForCondition()`, `insertTestProfile/Class/Exercise()` |
| `test-data-factory.ts`    | `TestData.profile() / .class() / .exercise() / .gameCombat() / .privateMessage() / .errorLog()` — builders (`withRole`, `withEmail`, `withFullName`, `withGidouilles`, `withName`, `archived`…) puis `.create()`                                             |
| `supabase-client.ts`      | `createAuthenticatedClient(email, password = DEFAULT_TEST_PASSWORD)` : vrai `signInWithPassword`, donc `auth.uid()` réel                                                                                                                                     |
| `postgres-client.ts`      | `getPostgresClient()` (connexion `pg` directe, port 54322 : schéma `auth`, catalogue, transactions), `insertAuthUser()`, `deleteAuthUser()`, `closePostgresClient()`                                                                                         |
| `migration-rollback.ts`   | `extractRollback(migrationPath)` : extrait et **exécute** le rollback écrit en commentaire (`-- ROLLBACK:BEGIN` … `-- ROLLBACK:END`) d'une migration de données                                                                                              |
| `later-migrations.ts`     | `undoLaterMigrations(pg)` : joue, dans la transaction du test, le rollback des migrations de données **postérieures** (liste `LATER`, la plus récente d'abord) avant de rejouer celui d'une ancienne migration                                               |
| `prod-copies.ts`          | `insertProdCopies()` : copies minimales de modèles / exercices de prod avec leurs vrais identifiants                                                                                                                                                         |
| `classification-paths.ts` | `readNodePaths()`, `nodeIdByPath()` : nœuds de l'arbre des notions par chemin                                                                                                                                                                                |

Hors `database/` : `tests/helpers/competence-referentiel.helpers.ts` (référentiel de compétences,
endpoint skill-attempts). Les **mocks** (`tests/helpers/supabase/`, `tests/helpers/fixtures/`,
réexportés par `tests/helpers/index.ts` ; aussi `supabase-helpers.ts`, `message-helpers.ts`)
servent aux tests **unitaires** de handlers, pas à l'intégration.

### Le schéma type

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	cleanupAllTestData,
	createServiceRoleClient
} from '../helpers/database/trigger-test-helpers';
import { TestData } from '../helpers/database/test-data-factory';
import { createAuthenticatedClient } from '../helpers/database/supabase-client';

describe('un élève ne lit pas la copie d’un autre', () => {
	const admin = createServiceRoleClient();
	beforeAll(async () => {
		await cleanupAllTestData(); /* TestData…create() */
	});
	afterAll(async () => {
		await cleanupAllTestData();
	});

	it('rend zéro ligne pour la copie d’autrui', async () => {
		const eleve = await createAuthenticatedClient(eleveA.email); // auth.uid() = eleveA
		const { data, error } = await eleve.from('…').select('*').eq('student_id', eleveB.id);
		expect(error).toBeNull();
		expect(data).toEqual([]); // refus RLS = zéro ligne, pas une erreur
	});
});
```

`TestData.profile().create()` crée la ligne `auth.users` (par `insertAuthUser`, mot de passe
`DEFAULT_TEST_PASSWORD`) puis attend le profil créé par trigger : le compte est donc connectable
par `createAuthenticatedClient`.

### Les pièges

- ⛔ **Jamais de smoke-test avec `auth.uid()` NULL** pour valider une RLS ou une fonction
  `SECURITY DEFINER` : le client service role (ou anon) fait sortir la garde **avant** la vraie
  requête → faux positif. Une RPC cassée est déjà partie en prod ainsi. Toujours un client
  **authentifié** (`createAuthenticatedClient`), et un cas « autrui » qui doit être refusé.
- **La RLS échoue en silence** (zéro ligne, pas d'erreur ; `.delete()` refusé sans erreur ;
  jointure `!inner` qui efface la ligne parente ; policies permissives en OU) : asserter les
  lignes rendues, jamais seulement `error === null`. Tout est dans
  [rls-echecs-silencieux.md](rls-echecs-silencieux.md).
- **Preuve rouge** : un test de migration doit **échouer sans la migration** (CLAUDE.md
  §Migrations, condition 2). Pour une migration de données, `extractRollback` rejoue le rollback
  documenté : on vérifie l'état avant / après. Quand une migration de données plus récente
  s'appuie sur ce qu'une ancienne a créé, le test de l'ancienne rejoue d'abord le rollback de la
  récente (`undoLaterMigrations`, à compléter à chaque nouvelle migration de ce genre), et ses
  vérifications d'état final se **chaînent** : son état « après » doit être l'état « avant » de la
  récente (exemple : `scission-points-programme.test.ts` et la passe lycée).
- **Nouvelle fonction `SECURITY DEFINER`** exécutable par `authenticated` ou `anon` : le garde-fou
  `tests/integration/garde-fonctions-security-definer.test.ts` exige une entrée justifiée dans
  `tests/integration/fixtures/fonctions-definer-verifiees.ts` et un `search_path` finissant par
  `pg_temp`. Il tourne sur **toutes** les PR. Mode d'emploi :
  [rls-echecs-silencieux.md § Nouvelle fonction SECURITY DEFINER](rls-echecs-silencieux.md).
- **Base partagée, séquentielle** : nettoyer avant et après (`cleanupAllTestData`), emails en
  `@test.com` (c'est ce que le nettoyage purge). Une transaction ouverte par un test (`pg`) se
  termine par `ROLLBACK`, jamais `COMMIT`.
- **`db:types` génère depuis les migrations de la branche** (sur cette même pile de test) : après
  une migration, `pnpm db:types` type la nouvelle RPC, sans attendre la prod (cf. CLAUDE.md §Base de données).
- **Sign-in local en erreur vide** : GoTrue dégradé → dans la suite d'intégration, `pnpm db:test:stop` puis relancer les tests ; sur le serveur de dev, `pnpm db:stop` puis `pnpm db:start`.

---

## 5. Règles

- **TDD collaboratif** (spécification en français validée → tests rouges → implémentation) :
  [CLAUDE.md §Planning](../../CLAUDE.md). Tests d'intégration **obligatoires** pour toute RLS,
  fonction `SECURITY DEFINER`, trigger ou policy (CLAUDE.md §Base de données).
- **Aucun test ne lit `docs/`** : un commit 100 % doc part sans CI, un test qui en dépendrait
  casserait en silence (2026-10-08). Un fichier lu par un test est une **copie figée** sous
  `tests/fixtures/` (lexique, relecture) ou `tests/integration/fixtures/` (seeds), mise à jour avec la
  migration ou le code qui la justifie. Garde : `src/lib/__tests__/tests-sans-lecture-de-docs.test.ts`
  (seule exception : `scripts/corrections/__tests__/corrections.test.ts`, qui valide
  `data/corrections/**` — d'où le déclenchement de la CI sur ce dossier).
- **Tests ciblés > suite complète** en local (`pnpm test:server <chemin>`), la CI fait le reste.

### Pièges vitest 4 / vitest-browser-svelte 3

- Contexte navigateur : `import { page } from 'vitest/browser'`.
- **Mock appelé avec `new`** (`Worker`, `Audio`, classe mockée) : `function` ou `class`, **jamais
  une flèche** (« is not a constructor » — et un test d'erreur peut alors passer pour une autre raison).

  ```ts
  globalThis.Worker = vi.fn().mockImplementation(function (url: URL) {
  	return new MockWorker(url);
  }) as unknown as typeof Worker;
  ```

- Options de test en 2ᵉ argument (`it('nom', { timeout: 30000 }, fn)`) ou un nombre en 3ᵉ ; un
  objet en 3ᵉ argument fait échouer tout le fichier.
- **`render` est asynchrone** : toujours `await render(…)`, `await unmount()`, `await rerender(…)`.
  Un `render` sans `await` monte quand même le composant : aucun test ne rougit. Garde AST
  `pnpm check:await-render` (`scripts/check-await-render.ts`), lancée par le job Lint et par
  `pnpm lint:fast` quand un test client a changé.
- **`$app/navigation` (SvelteKit 3)** : `vi.mock('$app/navigation', async (importOriginal) => …)`
  ne se termine jamais, et le fichier figé bloque toute la suite client. Mock partagé
  `appNavigationMock({ goto })` de `tests/helpers/app-navigation-mock.ts`.
- **Tests navigateur et `$app/env/public`** : il lit `globalThis.__sveltekit_dev`, que pose la page
  de kit et pas vitest → posé dans `vitest-setup-client.ts`.
- **Reproduire la suite client de la CI** : `CI=true pnpm exec vitest run --project=client` (sans
  `CI`, les tests Pyodide réels `*-real` tournent aussi).
- **MathLive** : `await import('mathlive')` dans les tests client (l'import statique produit des
  erreurs SSR au démontage).

---

## 6. Tests ignorés ou bloqués (état au 2026-10-10)

- **Suite d'intégration : aucun** `skip` / `todo`. `draw-vip-cards-race-conditions.test.ts`,
  longtemps annoncé « BLOCKED » (pas de client authentifié), est **actif** : il utilise
  `createAuthenticatedClient`.
- **Unitaires** : 10 `it.todo` (fonctionnalités non écrites) dans
  `src/lib/geometry-core/dsl/__tests__/builtins-angle.test.ts` (4),
  `src/lib/geometry-core/dsl/__tests__/builtins-transporte.test.ts` (3),
  `src/lib/mathAST/solve/__tests__/trig-periodic.test.ts` (3).
  `src/lib/constructions-v2/core/__tests__/converter.test.ts` : 3 `describe.skipIf(!hasFixtures)`,
  qui demandent `extern/instrumenpoche-main/` (non suivi par git, `pnpm extern:sync`) → **toujours
  sautés en CI**.
- **e2e** : `e2e/navadra/challenge-types.spec.ts` a un `test.skip` inconditionnel (saisie
  MathLive, « Phase 2 ») ; les specs `e2e/student/assessments/` et `e2e/teacher/assessments/`
  se sautent quand la base n'a pas les données attendues (`test.skip(condition, …)`).
- `tests/integration/database/*.sql` (`test_academic_periods_migrations.sql`,
  `test_minesweeper_reference_times.sql`) : scripts SQL qu'aucun runner ni fichier n'appelle.

---

## 7. Backlog (non systématisé)

Accessibilité (`axe-core` dans les e2e, agent `accessibility-tester`), régression visuelle
(snapshots Playwright pour `GeometryCanvas`), benchmarks (`vitest bench` sur `mathAST`,
`geometry-core`).

---

Vérifié contre le code le 2026-10-10.

Vérifié contre le code le 2026-10-10.

## Vérifier à l'écran soi-même avant de demander à David

David est presque toujours à distance et veut le moins possible de vérifications à la main
(2026-11-23). Avant le merge, la session regarde elle-même ce qu'elle livre. Les trois moyens ont
été essayés à distance le 2026-11-23 :

| Moyen                           | Pour quoi                                                                                            | Comment                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm voir <page> [--compte …]` | le rendu d'une page (format iPhone, moteur de Safari), les erreurs de console, les requêtes en échec | [voir-une-page.md](voir-une-page.md)                                                                                                 |
| `pnpm test:verifs`              | un parcours : cliquer, taper, lire un courriel capturé ; le test reste et se rejoue                  | `e2e/verifs/`, `VERIFS_PORT=<port du worktree>`                                                                                      |
| Claude dans Chrome              | un geste ponctuel dans un vrai Chrome, la prod publique                                              | `https://chiph.re`, ou le lien de `pnpm lien` ; **jamais `localhost`** ([pourquoi](tester-sur-un-autre-appareil.md#les-deux-pièges)) |

Les pages connectées se vérifient en local, avec les comptes fictifs (`pnpm voir --compte`,
`pnpm test:verifs`).

Reste à David, et à lui seul : le vrai iPhone (clavier, barres de Safari, zones de sécurité), le
vidéoprojecteur, la prod avec un vrai compte (la session n'entre aucun mot de passe réel), un
courriel reçu sur une vraie adresse. Seules ces vérifications deviennent une ligne de
`docs/wip/verifications-manuelles.md`, et la ligne dit ce que la session a déjà vu.
