---
title: Module geometry-core — Documentation de reference
date: 2026-05-18
version: 1.0
status: vivant
audience: developpeurs UbuMaths (nouveaux et mainteneurs)
scope: src/lib/geometry-core/
---

# Module `geometry-core` — Documentation de reference

Moteur de geometrie 2D pedagogique pour UbuMaths : DSL francophone, reactivite
Svelte 5, rendu canvas/SVG/TikZ/Typst, solveurs numeriques (Newton, Simpson),
courbes cartesiennes/parametriques/polaires, transformations, intersections.

> **Ce repertoire sert de modele** pour structurer la documentation des autres
> modules du site. Voir [Convention d'organisation](#convention-dorganisation)
> en bas de page.

---

## Chiffres cles (2026-05-18)

| Indicateur                   | Valeur                        |
| ---------------------------- | ----------------------------- |
| Fichiers TS total            | 208                           |
| Fichiers source (hors tests) | 65                            |
| Fichiers de test             | 143                           |
| Tests Vitest                 | 2 988                         |
| Sous-dossiers fonctionnels   | 9                             |
| Lignes source (estimation)   | ~67 000                       |
| Lignes test (estimation)     | ~38 700                       |
| Posture securite globale     | **Acceptable**                |
| Severite dette critique      | **Resolved** (3/3 corriges)   |
| Hot paths principaux         | **Memoises** (6/6 quick wins) |

> Chiffres verifies via `find src/lib/geometry-core -name "*.ts"` et
> `grep -rE "^\s*(it\|test)\(" --include="*.test.ts"`.
> Le delta vs l'audit initial (209 TS / 69 src / 140 test / 2 986 tests) s'explique par : `singularity-warn.ts` + 2 tests deplaces vers `$lib/mathAST/analysis/` ; +5 nouveaux fichiers de test livres en session (parametric-newton, marching-squares-cache, locus-cache, parametric-sampling-cache, osculating-circle-export).

---

## Les 5 documents de reference

### 1. [architecture.md](./architecture.md) — Vue d'ensemble

> **Audience** : nouveaux developpeurs, onboarding
> **Longueur** : 909 lignes, ~4100 mots

Cartographie complete : role du module, frontieres, les 9 sous-dossiers
(`dsl/`, `graph/`, `compute/`, `geometry/`, `rendering/`, `interaction/`,
`types/`, `validation/`, `viewport/`), flux de donnees parse-DSL → pixel,
modele de donnees (40+ types `Geo*`), reactivite Svelte 5, conventions de
nommage, guide d'ajout d'une nouvelle primitive.

**A lire en premier** si tu decouvres le module.

### 2. [code-quality.md](./code-quality.md) — Qualite & dette technique

> **Audience** : mainteneurs, avant refactor
> **Severite globale** : Major

Top issues identifiees :

- **Critique** : cycle de dependance `graph` ↔ `dsl` (`figure.ts:142`),
  `GeoOsculatingCircle` absent des renderers SVG/TikZ/Typst,
  `_executeBuiltinInner` = switch de 2 045 lignes (`dsl/builtins.ts:345-2389`).
- **Major** : `computeElementPosition` = 735 lignes de `if (isXxx)`,
  duplication triple de `extendLineToViewport`, 3 interfaces `NewtonConfig`
  divergentes, `dsl/transform-apply.ts` (1 087 lignes) sans test direct,
  25 casts `as GeoXxx` bypassant les type guards.

### 3. [tests.md](./tests.md) — Couverture & robustesse des tests

> **Audience** : contributors, test-automator
> **Couverture globale** : haute mais inegale

Repartition : `dsl/` 1 649 tests (55 %), `graph/` 472, `rendering/` 326.

Angles morts critiques :

- `graph/parametric-newton.ts` (149 L) — zero test unitaire direct, exerce
  seulement par 4 tests indirects (H4-H7).
- `graph/compute-position.ts` (1 308 L) — couvert uniquement par integration
  DSL, jamais en isolation.
- `rendering/bezier.ts` (414 L) — Catmull-Rom complet sans tests.
- `parametric-intersection-1d.ts` — clipping `s ∈ [-ε, 1+ε]` non teste aux
  valeurs limites.

### 4. [performance.md](./performance.md) — Analyse de performance

> **Audience** : optimisation rendu temps reel
> **Analyse** : lecture statique (pas de benchmarks reels)

**Session 2026-05-18 : 6 quick wins livrees** (cache derivees secondes, mutable-env spreads, warm-start Newton drag, cache marchingSquares, cache computeLocusCurve, cache computeParametricCurveSampling). Tous les hot paths principaux sont maintenant memoises.

Restants — **non rentables seuls** (analyses dans `performance.md` section 9) :

- ⏳ **Warm-start `intersection-1d`** — refonte API multi-intersections, ROI marginal post-cache
- ⏳ **Cache SVG path final** (#3) — gain ~10× plus petit que les caches deja en place
- ⏳ **Version granulaire par element** (#6) — refonte structurelle, ROI cassee par les caches qu'on vient d'ajouter
- ⏳ **Newton 2D 8×8 starts** — rare en pratique, gain mesurable seulement sur animations slider × intersection parametrique × parametrique

**Recommandation** : profiler une figure stress (slider animant locus + parametrique + intersections) avant toute autre optim.

### 5. [security.md](./security.md) — Audit securite

> **Audience** : security review, ops
> **Posture globale** : **Acceptable**

Le module lui-meme est sain (zero `eval()`/`Function()` dans le pipeline DSL,
bornes sur la recursion macros = 10, iterations boucle = 1 000, Newton = 20).

**Findings exterieurs au module mais a corriger** :

- **HIGH** — `src/lib/utils/game/challenge-variables.ts:68-76` :
  `new Function('return ' + expr)` sur du contenu DB non sanitise. Remplacer
  par `compile()` de `$lib/mathAST/eval/compile`.
- **INFO** — `unsafe-eval` site-wide dans la CSP (`src/hooks.server.ts:432`)
  pour Typst.js — annule la protection navigateur contre l'eval-injection.

**Findings dans le module** :

- **MEDIUM** — `PARSE_CACHE` non borne dans `dsl/interpreter.ts:158-160`.
  Ajouter un cap (5 000 entrees) pour eviter l'epuisement memoire.
- **LOW** — Pas de garde de longueur d'input cote client avant tokenisation.

---

## Index thematique par sous-dossier

Pour chaque sous-dossier du module, les documents qui en parlent :

| Sous-dossier   | Architecture | Qualite | Tests |  Perf  | Securite |
| -------------- | :----------: | :-----: | :---: | :----: | :------: |
| `dsl/`         |     §2.2     | §3, §4  |  §2   |  §1.1  |  §1, §2  |
| `graph/`       |     §2.3     | §3, §4  |  §2   |  §3-7  |    —     |
| `compute/`     |     §2.4     |   §6    |  §2   |   §1   |    —     |
| `geometry/`    |     §2.5     |   §6    |  §2   |   —    |    —     |
| `rendering/`   |     §2.6     | §3, §5  |  §3   | §3, §6 |    §6    |
| `interaction/` |     §2.7     |    —    |  §3   |   —    |    —     |
| `types/`       |   §2.1, §4   | §5, §8  |   —   |   —    |    —     |
| `validation/`  |     §2.8     |    —    |   —   |   —    |    —     |
| `viewport/`    |     §2.9     |    —    |   —   |   —    |    —     |

---

## Action items prioritaires (cross-cutting)

> **Session 2026-05-18 close — bilan final.**
>
> **12 commits livres.** Tous les items critiques de l'audit (3/3) sont resolus, et 6/6 quick wins perf sont livrees. Le module est dans un etat tres sain — le seul item HIGH restant est hors scope geometry-core (`new Function()` dans `src/lib/utils/game/challenge-variables.ts:68-76`).
>
> **Critiques (3/3)** : cycle `graph`↔`dsl` brise (`singularity-warn` deplace vers `$lib/mathAST/analysis/`) · `GeoOsculatingCircle` rendu dans les 3 exporters · `_executeBuiltinInner` switch de 2 045 lignes → dispatcher Map de 27 lignes (62 handlers extraits).
>
> **Quick wins perf (6/6)** : cache derivees secondes · mutable-env spreads · warm-start Newton drag · cache `marchingSquares` (40 000 evals/render evites) · cache `computeLocusCurve` · cache `computeParametricCurveSampling`.
>
> **Securite** : posture **Acceptable** confirmee. 2 fixes MEDIUM/LOW livres (cap `PARSE_CACHE`, garde longueur DSL). 1 HIGH hors module documente.
>
> **Reste en queue** : 1 SECURITE HIGH hors module (challenge-variables.ts) · 1 TESTS (bezier.ts unit tests) · 1 PERF partiel jugé non rentable seul (warm-start intersection-1d) · items perf #3 #6 differes (ROI marginal post-caching, recommandation : profiling reel avant tout autre travail).

1. **[SECURITE HIGH]** Remplacer `new Function()` par `compile()` dans
   `src/lib/utils/game/challenge-variables.ts:68-76`.
   _Hors module mais critique._
2. ~~**[PERF HIGH / EFFORT FAIBLE]** Cache des derivees secondes pour
   `cercle_osculateur`/`courbure` (`parametric-calculus.ts:75-95`).~~ **FAIT 2026-05-18** (`compiledXSecond`/`compiledYSecond` sur `GeoParametricCurve`).
3. ~~**[PERF HIGH / EFFORT FAIBLE]** Eliminer les spreads dans
   `computeParametricCurveSampling` (`figure.ts:4399-4418`).~~ **FAIT 2026-05-18** (pattern mutable-env applique aux 3 sites de figure.ts).
4. ~~**[QUALITE CRITIQUE]** Casser `_executeBuiltinInner` (`dsl/builtins.ts:345-2389`)
   en handlers par builtin.~~ **FAIT 2026-05-18** (2 commits : infra + 62 handlers extraits, dispatcher Map de 27 lignes).
5. ~~**[QUALITE CRITIQUE]** Ajouter le rendu de `GeoOsculatingCircle` dans
   `svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts`.~~ **FAIT 2026-05-18** (helper `osculatingCircleToSVG` + branches dans les 3 exporters).
6. **[TESTS]** Ajouter des tests unitaires directs pour `bezier.ts` (`parametric-newton.ts` couvert depuis 2026-05-18).
7. ~~**[SECURITE MEDIUM]** Borner `PARSE_CACHE` dans `dsl/interpreter.ts`.~~ **FAIT 2026-05-18** (plafond 5 000 entrees).
8. ~~**[SECURITE LOW]** Garde de longueur DSL dans `parse()`.~~ **FAIT 2026-05-18** (100 000 caracteres max).
9. **[PERF MEDIUM]** ✅ Warm-start Newton drag closest-point — FAIT 2026-05-18 (`findClosestParameterOnCurve` accepte `warmStartT`). Partie `intersection-1d` differee (refonte API multi-intersections, ROI marginal post-cache).
10. ~~**[PERF HIGH]** Cache `marchingSquares` (40k evals/render)~~ **FAIT 2026-05-18** (WeakMap par CompiledFn).
11. ~~**[PERF HIGH]** Cache `computeLocusCurve`~~ **FAIT 2026-05-18** (WeakMap par GeoLocus + snapshot dependsOn).
12. ~~**[PERF MEDIUM]** Cache `computeParametricCurveSampling`~~ **FAIT 2026-05-18** (WeakMap par GeoParametricCurve + snapshot bounds/scalars/viewport).

---

## Convention d'organisation

Ce repertoire suit la structure suivante, **a reproduire pour tout autre
module documente** :

```
docs/ref/<module-name>/
├── README.md          # Index (ce fichier) — synthese, chiffres cles, action items
├── architecture.md    # Vue d'ensemble, sous-dossiers, types, flux
├── code-quality.md    # Dette technique, code smells, top refactors
├── tests.md           # Couverture, angles morts, tests prioritaires
├── performance.md     # Hotspots, optimisations prioritaires
└── security.md        # Surface d'attaque, findings, mitigations
```

### Regles pour les documents enfants

- **Header YAML** obligatoire : `title`, `date`, `audience`, optionnellement
  `severity_globale` / `posture` / `version`.
- **Chemins de fichiers avec lignes precises** (ex: `path/to/file.ts:142-150`).
- **Severite explicite** pour chaque finding : `Critical` / `Major` / `Minor`
  pour la qualite ; `High` / `Medium` / `Low` pour perf et securite.
- **Recommandations concretes** : pas "ameliorer X" mais "extraire la fonction
  Y des lignes 100-150 vers un nouveau fichier Z".
- **Top N prioritaires** en fin de chaque document (top 5 ou top 10).

### Regles pour le README maitre

- Reste un **index**, pas de contenu duplique des documents enfants.
- **Chiffres cles** en tete pour aperçu immediat.
- **Action items cross-cutting** synthetisant les 5 audits.
- **Index thematique** (matrice sous-dossiers × documents) pour navigation
  rapide.

### Rythme de mise a jour

- **README maitre** : a chaque livraison de feature significative dans le
  module documente.
- **architecture.md** : a chaque ajout/suppression de sous-dossier ou de type
  fondamental.
- **code-quality.md / tests.md / performance.md / security.md** : audit
  complet recommande **tous les 3-6 mois** ou avant une release majeure.

---

## Journal de session 2026-05-18

Audit complet du module + corrections en 12 commits (~1 jour de travail), du plus impactant au plus structurel.

### Phase 1 — Audit (1 commit)

| Hash        | Sujet                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `3f78f8597` | Suite d'audit (5 docs + README + `CLAUDE.md`) ; +2 fixes securite (`PARSE_CACHE` cap, garde longueur DSL) |

### Phase 2 — Perf (7 commits)

| Hash        | Sujet                                                                |
| ----------- | -------------------------------------------------------------------- |
| `91a17e4b9` | Cache derivees secondes (QW #1) — recompilation evitee a chaque tick |
| `f081c179f` | Mutable env spreads (QW #2) — ~1 200 allocations/render evitees      |
| `b4ec15cfa` | Warm-start Newton drag closest-point (QW #3) — 8:1 reduction         |
| `dff2cf706` | Memoize `marchingSquares` (QW #4) — 40 000 evals/render evites       |
| `7c2e9fea0` | Memoize `computeLocusCurve` (QW #5)                                  |
| `e6b6f7d89` | Memoize `computeParametricCurveSampling` (QW #6)                     |
| `cd5ea137b` | Close perf session — doc des items differes comme marginaux          |

### Phase 3 — Dette technique critique (4 commits)

| Hash        | Sujet                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| `1fe34c9c2` | Cycle `graph`↔`dsl` brise (`singularity-warn` → `$lib/mathAST/analysis/`) |
| `d7bb2a1e1` | `GeoOsculatingCircle` rendu dans SVG / TikZ / Typst (bug export muet)      |
| `871f53be9` | Builtin handlers commit 1/2 — infra + 10 plus gros cases extraits          |
| `016bc86e1` | Builtin handlers commit 2/2 — 49 cases restants, switch supprime           |

### Phase 4 — Feedback runtime errors (4 commits, journee +1)

Surfacage des erreurs runtime DSL dans `/construction-demo` et `ScriptEditor`. Avant : silence en cas d'echec d'execution, l'apercu restait fige sur l'etat precedent. Apres : panneau d'erreur riche (titre, ligne source, summary + hint + liste de formes acceptees), badge sur le canvas, figure partielle preservee.

| Hash        | Sujet                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| `b157885f2` | feat(constructions-v2) : UX runtime errors + executor resilient + `details` |
| `8bcff578b` | feat(geometry-core/dsl) : 30 builtins de base migrés vers details           |
| `e0e4db674` | feat(geometry-core/dsl) : calculus + coniques (10 builtins)                 |
| `0ca030d10` | feat(geometry-core/dsl) : trace + courbe + texte (finition)                 |

Voir [`docs/wip/dsl-structured-errors-progress.md`](../../wip/dsl-structured-errors-progress.md) pour le detail technique. ~50 builtins migres sur ~60, retro-compatibilite preservee (string flat encore accepte).

### Bilan chiffre

| Avant                                           | Apres                                                |
| ----------------------------------------------- | ---------------------------------------------------- |
| Severite dette critique : Major (3 items)       | Resolved (0 item)                                    |
| `_executeBuiltinInner` : 2 045 lignes, 62 cases | 27 lignes, dispatcher Map                            |
| `marchingSquares` : 40 000 evals/render         | Cache hit en drag commun                             |
| Newton drag : 8 starts × 20 iter                | 1 start (warm) + 2 bornes                            |
| Cycle `graph` → `dsl`                           | Plus aucune fleche source-level                      |
| `GeoOsculatingCircle` exports                   | Muets → corrects en SVG/TikZ/Typst                   |
| `DslRuntimeError` : string flat                 | `{ summary, hint, forms }` typé (50 builtins migres) |
| Erreurs runtime dans `/construction-demo`       | Silencieuses → panneau riche + figure partielle      |
| Tests                                           | 2 986 → 2 988 (+5 fichiers nouveaux, -2 deplaces)    |

### Recommandation prochaine session

**Pas de travail aveugle.** Le module est tres sain. Les prochaines optims devraient etre guidees par un profiling reel (Chrome DevTools sur une figure stress : slider animant locus + parametric + intersection parametrique × parametrique). Voir `performance.md` section 9 "Stop sur la perf en aveugle".

Items restants non resolus, documentes mais non urgents :

- `[SECURITE HIGH]` `new Function()` dans `src/lib/utils/game/challenge-variables.ts:68-76` — **hors scope geometry-core**, mais critique pour la securite du site.
- `[TESTS]` unit tests pour `rendering/bezier.ts` (Catmull-Rom, 414 lignes sans test direct).
- `[PERF marginal]` warm-start `parametric-intersection-1d.ts` (refonte API multi-roots), cache SVG path final, version granulaire par element — tous ROI insuffisant sans evidence de bottleneck.

---

## Voir aussi

- [`docs/ref/geometry-dsl/`](../geometry-dsl/) — Documentation utilisateur du
  DSL (aire, aire_entre, integrale).
- [`docs/wip/geometry/`](../../wip/geometry/) — Progress documents des
  features livrees (parametric curves, polar, tangente, point_sur, calculus,
  intersections).
- [`docs/architecture/database-schema.md`](../../architecture/database-schema.md)
  — Schema DB (le module geometry-core n'y touche pas directement).
- [`CLAUDE.md`](../../../CLAUDE.md) — Instructions projet pour Claude Code.
- [`MEMORY.md`](../../../../.claude/projects/-Users-david-Coding-js-ubumaths/memory/MEMORY.md)
  — Memoire persistante (entrees `geometry-core-status`, `parametric-*`,
  `tangente-*`, etc.).
