# CI — finir le « tout vert » (TODO)

> Date : 2026-06-13 · Statut : CI partiellement verte (install ✅, Lint ✅) ; **Type Check + Unit Tests rouges sur Node 22** (= prod). App déployée (Vercel).

## Cause racine : dev (Node 26) ≠ prod/CI (Node 22)

- **Prod = Node 22** : `svelte.config.js` → `adapter({ runtime: 'nodejs22.x' })`.
- **Dev local (David) = Node 26.**
- Le code a des soucis **spécifiques à Node 22** que Node 26 **masque** → ils ne sortent qu'en CI.
- → La CI doit tourner sur **Node 22** (matcher la prod), **pas 26**. (Un détour par Node 26 avait fait _hang_ les tests + restait rouge — abandonné.)
- Les échecs Node 22 ne sont **pas du bruit CI** : ce sont de **vrais bugs sur le runtime de prod** (non bloquants pour le build Vercel, qui ne lance ni svelte-check ni les tests).

## État CI actuel (Node 22)

| Job                  | État                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Setup pnpm + install | ✅ (`f6353dd21` : pnpm 10 + `packageManager`)                                              |
| Lint                 | ✅ (timeout porté à 20 min ; `eslint .` lent mais passe)                                   |
| Type Check           | ❌ — vrai souci Node 22 (vert en Node 26 local)                                            |
| Unit Tests (shards)  | ❌ — `chapter-templates.test.ts` (`.toMatch undefined`) + autres, échec rapide sur Node 22 |
| Build                | ⏭️ skip (dépend de lint + typecheck)                                                       |

## Reste à faire pour verdir

1. **Se mettre sur Node 22 pour reproduire** : `nvm use 22 && pnpm install && pnpm check` puis `pnpm test:server`. (Sur Node 26, tout est vert → impossible de voir les bugs.) `.nvmrc` (=22) est désormais présent.
2. **Type Check** : capturer l'erreur svelte-check réelle sur Node 22, corriger (vrai bug runtime).
3. **Tests** : corriger les échecs Node 22 (`chapter-templates` `.toMatch undefined`, etc.) — probable différence d'API/format entre Node 22 et 26.
4. **(option) Séparer server/client** dans le job `test` : il lance `vitest --shard` sur les **2 projects** ; le project client (browser/playwright) est lourd → un job `test:server` shardé + un job `test:client` séparé serait plus sain (et évite le _hang_ vu en Node 26).
5. **Durable** : aligner le dev sur Node 22. `.nvmrc` ajouté (hint, non contraignant). Ajouter `engines.node: "22.x"` **une fois David passé à Node 22** (sinon ça casse son `pnpm install` en 26 — même `ERR_PNPM_UNSUPPORTED_ENGINE` qu'on a eu en Cil).

## Acquis (ne pas refaire)

- Install CI réparée (pnpm 10 / `packageManager`). Lint vert (timeout 20). App **déployée** (Vercel, Node 22). Tests stale `src/**` + `tests/unit/**` verts **en local (Node 26)** — à **re-confirmer sur Node 22**.

## Leçon

Toujours faire tourner la CI (et idéalement le dev) sur **le même Node que la prod** (ici `nodejs22.x` via `adapter-vercel`). La divergence **dev 26 / prod 22** a masqué de vrais bugs runtime et m'a fait tourner en rond (push à l'aveugle). Vérifier le runtime de prod **avant** de choisir la version Node de la CI.
