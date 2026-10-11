# Quality Standards

Référence synthétique pour Claude : **linting/checks**, **validation Zod**, **tests**. Détail : [docs/pratiques/tests.md](tests.md) · règles condensées dans [CLAUDE.md](../../CLAUDE.md).

---

## Linting & checks

> ⚠️ **Un seul gros process à la fois** (cf. `CLAUDE.md §Gros process`) : `pnpm check`, `pnpm build`, `pnpm lint` sont autorisés en local, sous le verrou de `scripts/gros-process.sh` (le même que `check:incremental`) (plus gros process 4 à 6 Go, mesuré le 2026-09-29 sur Mac mini M6 24 Go, swap +0). `svelte-check` sans `--incremental` et `tsc --noEmit` meurent sur le tas par défaut de Node (~4 Go) : limite de Node, pas de la RAM.

| Outil                        | Où                    | Détail                                                                                                                                                                          |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **oxlint** (Rust, rapide)    | pre-commit local      | `.lintstagedrc.js` : `oxlint --fix` sur `.{js,ts}` staged + `prettier`. Bloque sur **erreurs** seulement (warnings non bloquants).                                              |
| **prettier**                 | pre-commit + CI       | `prettier --check . --cache` en CI (job _Lint_) ; `pnpm format:check` (fichiers suivis) au pre-push ; `--write` au commit.                                                      |
| **eslint** (complet)         | CI + local en fond    | 530 s en local (mesuré le 2026-09-29) → en arrière-plan. Couvre `eslint-plugin-svelte` + la règle custom Zod. `lint:fast` (~2,5 s) au quotidien.                                |
| **`pnpm check:incremental`** | local, **avant push** | TS + Svelte, ~18 s (moteur `--tsgo` depuis le 2026-10-10 ; heap 4096, `svelte-kit sync` conditionnel ; `FRESH=1` pour forcer après suppression/renommage). **0 erreur exigée**. |

- Le hook pre-commit est **léger** → `--no-verify` **n'est plus nécessaire**.
- eslint complet en local : `pnpm lint` en arrière-plan (530 s) ; en ciblé : `npx eslint <fichiers>`.
- `pnpm format "src/**/*.{ts,svelte}"` = `prettier --write`.

---

## Input Validation with Zod

**Règle n°1 (non négociable)** : toute entrée externe d'une route API est validée par **Zod** — `request.json()`, query params, params dynamiques. Toujours borner : `.min()`/`.max()`, tailles de tableaux, `.uuid()`.

**Application automatique** : la règle eslint custom **`custom/require-zod-validation`** est en **`error`** sur `src/routes/api/**/*.ts` (`eslint.config.js`). Une route API sans validation **casse la CI** (et `eslint-rules/require-zod-validation.js` a ses propres tests : `pnpm test:lint-rules`).

**Lib** : `src/lib/server/validation/` — ~77 fichiers **par domaine** (`worksheets.ts`, `classes.ts`, `auth.ts`, …) + `common.ts` (schémas partagés : `uuidSchema`, `paginationSchema`, `roleSchema`…) + `response-utils.ts` + `__tests__/`. **Messages d'erreur en français.**

**Pattern canonique** (`safeParse` → `error(400)`, jamais `.parse()` qui throw brut) :

```ts
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { createWorksheetSchema } from '$lib/server/validation/worksheets';

const v = createWorksheetSchema.safeParse(await request.json());
if (!v.success) throw error(400, v.error.issues[0].message);
const data = v.data; // typé, sûr
```

Query params — construire un objet depuis `url.searchParams` puis valider :

```ts
const q = listWorksheetsQuerySchema.safeParse({ page: url.searchParams.get('page') ?? '1' });
if (!q.success) throw error(400, q.error.issues[0].message);
```

**Anti-patterns** :

- ❌ `await request.json()` consommé sans `safeParse`.
- ❌ Validation manuelle ad-hoc (`if (typeof x !== 'string')`) au lieu d'un schéma.
- ❌ Schéma sans bornes (`z.number()` nu, `z.array()` sans `.max()`) → risque DoS.
- ❌ `z.any()` / `z.unknown()` pour contourner la validation.

---

## Tests

Tout le système de tests (où ranger un test, projets vitest, ce qui tourne en local / PR / nuit, tests d'intégration) : **[tests.md](tests.md)**.
Rappel non négociable : RLS / `SECURITY DEFINER` / triggers / policies → tests d'intégration avec un client **authentifié**, jamais un smoke-test `auth.uid()` NULL.

---

## État qualité (repères)

- `pnpm check` (CI, scope `tsconfig.check.json`) : **0 erreur** exigée.
- Svelte : 0 erreur ; 56 `svelte-ignore a11y_*` dans `src/` au 2026-10-10 (dette connue → [docs/pratiques/warning-svelte.md](warning-svelte.md)).

---

> Voir aussi : [best-practices.md](svelte-typescript.md) · [database.md](base-de-donnees.md) · [git-workflow.md](git-workflow.md).

Vérifié contre le code le 2026-10-10.
