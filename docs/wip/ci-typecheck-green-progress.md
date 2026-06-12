# CI Type Check — green-up chantier (progress)

> But : verdir le job **Type Check** de `quality.yml`. Démarré 2026-06-13.

## Découverte critique (le point de départ était faux)

- Le job CI `pnpm check` (= `svelte-check`) était annoncé « rouge sur ~9 erreurs ».
- **Réalité** : `check:incremental` ne montrait 9 erreurs que parce que son cache disque
  ne re-vérifie que les fichiers récemment touchés. Un `svelte-check` complet (ce que fait
  la CI) reporte **2233 erreurs / 316 fichiers**.
- Pire : en CI le job ne reportait même pas les erreurs — il **crashait OOM (exit 134)**.
  Cause : bug shell dans le script `check` — `NODE_OPTIONS='…8192' svelte-kit sync && svelte-check …`
  n'appliquait le heap 8 Go qu'à `svelte-kit sync`, **pas** à `svelte-check` (l'étape lourde).

Split des 2233 erreurs :

- **1586** dans des fichiers de test (`*.test.ts`, `__tests__/**`, `tests/**`) — dérive de type,
  pas des bugs produit (les tests sont validés à l'exécution par vitest, pas type-checkés).
- **647** dans du source produit — les vrais bugs.

## Décision (validée PO) : Option A — scoper le gate au source

Exclure les fichiers de test du gate CI (ils restent exécutés par vitest), fixer la OOM,
puis brûler les erreurs **source** par lots. Ne masque AUCUN bug produit.

## Phase 1 — config + nettoyage (FAIT)

- **Nouveau `tsconfig.check.json`** : étend `./tsconfig.json`, `exclude` = excludes parent
  (service-worker, node_modules) + globs de test + `extern/**`.
- **`package.json` `check`** : pointe sur `tsconfig.check.json` ET déplace le flag heap 8 Go
  sur `svelte-check` (corrige la OOM).
- **Supprimé** `src/routes/slides/demo/**` + `slides/demo-embedded/**` : prototypes morts
  important des modules disparus (`$lib/slides`, `$lib/questions/types`, …) et ne parsant
  même pas (`<script lang>` lu comme TS). Aucune référence ailleurs. (`test-transitions/`
  et `+layout@.svelte` conservés, sains.)
- **`extern/`** exclu du gate (local-only, gitignoré, mais contient des sources de repo
  nécessaires — on le garde sur disque, juste hors type-check).

### Résultat Phase 1

- `svelte-check --tsconfig ./tsconfig.check.json` **complète sans OOM** (plus d'exit 134).
- Baseline source honnête : **622 erreurs / 208 fichiers** (était 2233).
- Le job reste rouge tant que les 622 ne sont pas corrigées → Phase 2.

## Phase 2 — burn-down des 622 erreurs source (EN COURS)

Ordre prévu (plus petit / haute confiance d'abord), **commit + code-review par zone** :

| Zone                                              | Erreurs (approx)          | État    |
| ------------------------------------------------- | ------------------------- | ------- |
| `src/lib/config`                                  | 15                        | à faire |
| `src/lib/server`                                  | 29                        | à faire |
| `src/lib/geometry-core`                           | 85                        | à faire |
| `src/lib/mathAST`                                 | 149                       | à faire |
| `src/lib/whiteboard`                              | 38                        | à faire |
| `src/lib/components`                              | 104                       | à faire |
| `src/routes/**`                                   | 180 (slides/demo retirés) | à faire |
| divers (constructions-v2, ubumark, stores, math…) | ~42                       | à faire |

Règle : ne pas « caster pour faire taire » — corriger le vrai type / la vraie signature.
Pas de `any`, éviter `@ts-ignore`.

## Hors de ce chantier (autres jobs rouges, séparés)

- **Tests** (2 shards) : ENOENT sur fixtures `extern/instrumenpoche-main/...` absentes en CI →
  `describe.skipIf(!existsSync(...))`. En attente (« Wait » PO).
- **Lint** (prettier --check + eslint) : `prettier --write .` + `eslint --fix`. En attente.

## Ne PAS pousser — David gère le déploiement.
