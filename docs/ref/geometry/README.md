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

| Indicateur                   | Valeur         |
| ---------------------------- | -------------- |
| Fichiers TS total            | 209            |
| Fichiers source (hors tests) | 69             |
| Fichiers de test             | 140            |
| Tests Vitest                 | 2 986          |
| Sous-dossiers fonctionnels   | 9              |
| Lignes source (estimation)   | ~67 800        |
| Lignes test (estimation)     | ~38 700        |
| Posture securite globale     | **Acceptable** |
| Severite dette technique     | **Major**      |

> Chiffres verifies via `find src/lib/geometry-core -name "*.ts"` et
> `grep -rE "^\s*(it\|test)\(" --include="*.test.ts"`.

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

Top 3 optimisations prioritaires :

1. ~~**Cache derivees secondes** (`parametric-calculus.ts:75-95`) — `cercle_osculateur`
   recompile a chaque tick.~~ **FAIT 2026-05-18**.
2. ~~**Supprimer les spreads** (`figure.ts:4399-4418`) — ~1 200 allocations
   `{ ...scalarBindings, [param]: t }` par courbe par rendu. Effort faible.~~ **FAIT 2026-05-18** (pattern mutable-env, 3 sites).
3. **Warm-start Newton** (`parametric-newton.ts` + `intersection-1d.ts`) —
   utiliser le `t` precedent pour reduire 16 starts → 1 en interaction
   continue. Reduction 16:1.

Autres hotspots : Newton 2D 8×8 starts dans intersections paramétriques,
`marchingSquares` 200×200 sans cache, `version` global dans
`GeometryCanvas.svelte` qui declenche le recalcul de tout.

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

Synthese des actions remontees par les 5 audits, ordonnees par ratio
impact/effort :

1. **[SECURITE HIGH]** Remplacer `new Function()` par `compile()` dans
   `src/lib/utils/game/challenge-variables.ts:68-76`.
   _Hors module mais critique._
2. ~~**[PERF HIGH / EFFORT FAIBLE]** Cache des derivees secondes pour
   `cercle_osculateur`/`courbure` (`parametric-calculus.ts:75-95`).~~ **FAIT 2026-05-18** (`compiledXSecond`/`compiledYSecond` sur `GeoParametricCurve`).
3. ~~**[PERF HIGH / EFFORT FAIBLE]** Eliminer les spreads dans
   `computeParametricCurveSampling` (`figure.ts:4399-4418`).~~ **FAIT 2026-05-18** (pattern mutable-env applique aux 3 sites de figure.ts).
4. **[QUALITE CRITIQUE]** Casser `_executeBuiltinInner` (`dsl/builtins.ts:345-2389`)
   en handlers par builtin (1 fichier par primitive).
5. **[QUALITE CRITIQUE]** Ajouter le rendu de `GeoOsculatingCircle` dans
   `svg-primitives.ts`, `export-tikz.ts`, `export-typst.ts`.
6. **[TESTS]** Ajouter des tests unitaires directs pour
   `parametric-newton.ts` et `bezier.ts`.
7. ~~**[SECURITE MEDIUM]** Borner `PARSE_CACHE` dans `dsl/interpreter.ts`.~~ **FAIT 2026-05-18** (plafond 5 000 entrees).
8. ~~**[SECURITE LOW]** Garde de longueur DSL dans `parse()`.~~ **FAIT 2026-05-18** (100 000 caracteres max).
9. **[PERF MEDIUM]** Warm-start Newton dans les drags continus.

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
