# Quality Standards

Référence synthétique pour Claude : **linting/checks (sous contrainte OOM)**, **validation Zod**, **tests**. Détail : [docs/ref/tests/](../ref/tests/) · règles condensées dans [CLAUDE.md](../../CLAUDE.md).

---

## Linting & checks (machine à faible RAM)

> ⚠️ Contrainte OOM (cf. `CLAUDE.md §Contrainte mémoire`). **NE JAMAIS** lancer sur tout le projet : `pnpm check` · `pnpm build` · `pnpm lint` (eslint) · `svelte-check` sans `--incremental`.

| Outil                        | Où                    | Détail                                                                                                                                         |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **oxlint** (Rust, ~0 RAM)    | pre-commit local      | `.lintstagedrc.js` : `oxlint --fix` sur `.{js,ts}` staged + `prettier`. Bloque sur **erreurs** seulement (warnings non bloquants).             |
| **prettier**                 | pre-commit + CI       | `prettier --check .` en CI (job _Lint_) ; `--write` au commit.                                                                                 |
| **eslint** (complet)         | **CI uniquement**     | OOM en local (type-aware). Couvre `eslint-plugin-svelte` + la règle custom Zod. Round-trip CI assumé.                                          |
| **`pnpm check:incremental`** | local, **avant push** | TS + Svelte, memory-safe (heap 4096, `svelte-kit sync` conditionnel ; `FRESH=1` pour forcer après suppression/renommage). **0 erreur exigée**. |

- Le hook pre-commit est **léger** → `--no-verify` **n'est plus nécessaire**.
- eslint local seulement en ciblé si la machine tient : `npx eslint <fichiers>`.
- `pnpm format "src/**/*.{ts,svelte}"` = `prettier --write`.

---

## Input Validation with Zod

**Règle n°1 (non négociable)** : toute entrée externe d'une route API est validée par **Zod** — `request.json()`, query params, params dynamiques. Toujours borner : `.min()`/`.max()`, tailles de tableaux, `.uuid()`.

**Application automatique** : la règle eslint custom **`custom/require-zod-validation`** est en **`error`** sur `src/routes/api/**/*.ts` (`eslint.config.js`). Une route API sans validation **casse la CI** (et `eslint-rules/require-zod-validation.js` a ses propres tests : `pnpm test:lint-rules`).

**Lib** : `src/lib/server/validation/` — ~69 fichiers **par domaine** (`assessments.ts`, `classes.ts`, `auth.ts`, …) + `common.ts` (schémas partagés : `uuidSchema`, `dateSchema`, `hexColorSchema`…) + `response-utils.ts` + `__tests__/`. **Messages d'erreur en français.**

**Pattern canonique** (`safeParse` → `error(400)`, jamais `.parse()` qui throw brut) :

```ts
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { createAssessmentSchema } from '$lib/server/validation/assessments';

const v = createAssessmentSchema.safeParse(await request.json());
if (!v.success) throw error(400, v.error.issues[0].message);
const data = v.data; // typé, sûr
```

Query params — construire un objet depuis `url.searchParams` puis valider :

```ts
const q = listAssessmentsQuerySchema.safeParse({ page: url.searchParams.get('page') ?? '1' });
if (!q.success) throw error(400, q.error.issues[0].message);
```

**Anti-patterns** :

- ❌ `await request.json()` consommé sans `safeParse`.
- ❌ Validation manuelle ad-hoc (`if (typeof x !== 'string')`) au lieu d'un schéma.
- ❌ Schéma sans bornes (`z.number()` nu, `z.array()` sans `.max()`) → risque DoS.
- ❌ `z.any()` / `z.unknown()` pour contourner la validation.

---

## Testing standards

> Architecture complète + TDD collaboratif : [docs/ref/tests/](../ref/tests/).

| Type                       | Emplacement                               | Commande                  |
| -------------------------- | ----------------------------------------- | ------------------------- |
| Unit (serveur / logique)   | `src/**/__tests__/`                       | `pnpm test:server <path>` |
| Client (composants Svelte) | `src/**/*.svelte.test.ts`                 | `pnpm test:client <path>` |
| Intégration (DB / RLS)     | `tests/integration/` (+ `tests/helpers/`) | `pnpm test:integration`   |
| E2E                        | `e2e/`                                    | `pnpm test:e2e`           |

- **RLS / `SECURITY DEFINER` / triggers / policies → tests d'intégration OBLIGATOIRES** (`pnpm db:start` puis `pnpm test:integration`).
- ⚠️ **JAMAIS** valider une fonction `SECURITY DEFINER` par un smoke-test avec `auth.uid()` NULL : le garde sort **avant** la vraie requête → **faux positif** (a déjà laissé partir une RPC cassée en prod). Tester avec un vrai contexte authentifié.
- Tests **ciblés** > suite complète (contrainte RAM). `pnpm test:changed` pour les fichiers touchés.
- La CI exécute tout (server shardé ×4, client browser, intégration).

---

## État qualité (repères)

- `pnpm check` (CI, scope `tsconfig.check.json`) : **0 erreur** exigée.
- Svelte : 0 erreur ; ~25 warnings a11y SVG masqués par `svelte-ignore` (dette connue → [docs/ref/warning-svelte.md](../ref/warning-svelte.md)).

---

> Voir aussi : [best-practices.md](best-practices.md) · [database.md](database.md) · [git-workflow.md](git-workflow.md).
