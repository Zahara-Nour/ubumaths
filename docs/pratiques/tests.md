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
│   └── global-setup.ts      ← supprime les profs seedés avant la suite, rejoue le seed de dev après
├── helpers/                 ← infra partagée (§4)
├── fixtures/                ← copies figées lues par des tests (lexique/, relecture/)
├── seed-test-data.ts        ← seed / nettoyage pour les e2e, lancés à la main (`npx tsx …`),
└── cleanup-test-data.ts       aucun script pnpm ni config ne les appelle

e2e/<rôle>/*.spec.ts         ← Playwright : auth/, exercises/, navadra/, public/, student/, teacher/ (+ helpers/)
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

| Suffixe / fichier                             | Runner                                          | Config                           | Lancement                               |
| --------------------------------------------- | ----------------------------------------------- | -------------------------------- | --------------------------------------- |
| `src/**`, `scripts/**` `*.test.ts`            | vitest projet **`server`** (node)               | `vite.config.ts`                 | `pnpm test:server <chemin>`             |
| `src/**/*.svelte.test.ts`                     | vitest projet **`client`** (Chromium)           | `vite.config.ts`                 | `pnpm test:client <chemin>`             |
| `src/**/*-real.svelte.test.ts`                | projet `client`, **exclu en CI** (Pyodide réel) | `vite.config.ts`                 | nightly, ou `pnpm test:client` en local |
| `tests/integration/**/*.test.ts`              | vitest **`integration`** (node, séquentiel)     | `vitest.integration.config.ts`   | `pnpm test:integration`                 |
| `garde-fonctions-security-definer.test.ts`    | vitest **`definer-guard`** (seul)               | `vitest.definer-guard.config.ts` | `pnpm test:definer-guard`               |
| `e2e/**/*.spec.ts`                            | Playwright (chromium, firefox, webkit)          | `playwright.config.ts`           | `pnpm test:e2e`                         |
| `eslint-rules/require-zod-validation.test.js` | node                                            | —                                | `pnpm test:lint-rules`                  |

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
  (port 54322) et n'a besoin que d'une base migrée.
- **`pnpm test:changed`** (= `pnpm test`) : `vitest run --changed` sur les projets de
  `vite.config.ts` (server + client), jamais l'intégration.
- **Couverture** : le bloc `coverage` de `vite.config.ts` est **inerte** — `@vitest/coverage-v8`
  n'est pas installé, aucun script ni job ne la lance.
- **Alias** : les helpers s'importent par `$tests/helpers` (alias de `svelte.config.js`), jamais
  `'tests/helpers'`. La suite d'intégration importe en relatif (`../helpers/database/…`).

---

## 3. Ce qui tourne où

| Où                                                      | Ce qui tourne                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Local**                                               | Ce que tu lances : tests **ciblés** (contrainte RAM, cf. CLAUDE.md). Intégration sous verrou Supabase.                                                                                                                                           |
| **Toute PR + push sur `main`** (`quality.yml`)          | `test-server` (**4 shards**), `test-client` (**2 shards**, hors `*-real`), `definer-guard` (Supabase `db start` + `pnpm test:definer-guard`) ; plus Lint (dont `check:await-render`), Type Check, Build, Audit. Tous agrégés par **CI Summary**. |
| **PR filtrées par `paths`** (`nightly-integration.yml`) | **Integration tests (Supabase local)** : `pnpm test:integration` sur une pile Supabase complète, + job **Integration paths filter** (`pnpm check:integration-paths`).                                                                            |
| **Nuit**                                                | Intégration (cron `17 2 * * *`, 02:17 UTC, `nightly-integration.yml`) ; Pyodide réel (cron `0 3 * * *`, `nightly-pyodide.yml`, `RUN_PYODIDE_REAL=1`, `vitest run --project client src/**/*-real.svelte.test.ts`).                                |
| **Jamais en CI**                                        | `pnpm test:e2e` (build + preview, lancé à la demande — le `pnpm build` du `webServer` prend le verrou gros process) ; `pnpm test:lint-rules`.                                                                                                    |

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

Le **gate de régression** quotidien reste `test-server` (rapide, déterministe).

---

## 4. Écrire un test d'intégration

### Lancer

```bash
pnpm db:start            # pile Supabase locale (ports 54321-54329), migrations appliquées
pnpm test:integration    # ~180 s la suite entière
pnpm test:integration tests/integration/mon-test.test.ts   # un seul fichier, sous verrou
pnpm test:integration:watch
```

**Verrou Supabase** : `test:integration`, `test:integration:watch`, `test:definer-guard` et tous
les `db:*` locaux passent par `scripts/with-db-lock.sh` (`flock` via `scripts/lib/lock.py`). Une
seule pile Supabase pour tous les worktrees : un `db:reset` pendant une suite ne rend pas
d'erreur, il rend des fichiers en échec sans test en échec. Le second arrivant sort en **exit 2**
en nommant le détenteur — ça s'attend, ça ne se contourne pas.

`global-setup.ts` supprime tous les comptes `teacher` avant la suite (le trigger
`enforce_single_teacher` n'en admet qu'un) et rejoue en sortie le seed de développement
`supabase/seed/dev_accounts.sql` (sinon le compte prof de David disparaît). Hors CI, si la base
contenait `pnpm db:seed-riche` (classes `LOCAL…`), il la recrée aussi.

### Les helpers réels (`tests/helpers/database/`)

| Fichier                   | Ce qu'il fournit                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `trigger-test-helpers.ts` | `createServiceRoleClient()` (contourne la RLS : préparer, vérifier), `createTestSupabaseClient()` (anon), `cleanupAllTestData()`, `cleanupTestData()`, `generateTestEmail()` (`<uuid>@test.com`), `waitForCondition()`, `insertTestProfile/Class/Exercise()` |
| `test-data-factory.ts`    | `TestData.profile() / .class() / .exercise() / .gameCombat() / .privateMessage() / .errorLog()` — builders (`withRole`, `withEmail`, `withFullName`, `withGidouilles`, `withName`, `archived`…) puis `.create()`                                             |
| `supabase-client.ts`      | `createAuthenticatedClient(email, password = DEFAULT_TEST_PASSWORD)` : vrai `signInWithPassword`, donc `auth.uid()` réel                                                                                                                                     |
| `postgres-client.ts`      | `getPostgresClient()` (connexion `pg` directe, port 54322 : schéma `auth`, catalogue, transactions), `insertAuthUser()`, `deleteAuthUser()`, `closePostgresClient()`                                                                                         |
| `migration-rollback.ts`   | `extractRollback(migrationPath)` : extrait et **exécute** le rollback écrit en commentaire (`-- ROLLBACK:BEGIN` … `-- ROLLBACK:END`) d'une migration de données                                                                                              |
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
  documenté : on vérifie l'état avant / après.
- **Nouvelle fonction `SECURITY DEFINER`** exécutable par `authenticated` ou `anon` : le garde-fou
  `tests/integration/garde-fonctions-security-definer.test.ts` exige une entrée justifiée dans
  `tests/integration/fixtures/fonctions-definer-verifiees.ts` et un `search_path` finissant par
  `pg_temp`. Il tourne sur **toutes** les PR. Mode d'emploi :
  [rls-echecs-silencieux.md § Nouvelle fonction SECURITY DEFINER](rls-echecs-silencieux.md).
- **Base partagée, séquentielle** : nettoyer avant et après (`cleanupAllTestData`), emails en
  `@test.com` (c'est ce que le nettoyage purge). Une transaction ouverte par un test (`pg`) se
  termine par `ROLLBACK`, jamais `COMMIT`.
- **`db:types` génère depuis la production** : une RPC pas encore migrée en prod n'est pas typée
  (cf. CLAUDE.md §Base de données).
- **Sign-in local en erreur vide** : GoTrue dégradé → `pnpm db:stop` puis `pnpm db:start`.

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
