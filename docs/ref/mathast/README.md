---
title: Module mathAST — Documentation de reference
date: 2026-06-18
version: 1.0
status: vivant
audience: developpeurs UbuMaths (nouveaux et mainteneurs)
scope: src/lib/mathAST/
---

# Module `mathAST` — Documentation de reference

Moteur de calcul symbolique (CAS) d'UbuMaths : parsing LaTeX et Pratt custom,
representation AST immutable, forme normale, simplification par regles, differentiation,
integration, limites, variations, resolution d'equations, analyse de signe, pattern
matching, et generation d'etapes pedagogiques pas-a-pas (paliers eleves).

---

## Chiffres cles (2026-06-18)

| Indicateur                      | Valeur                       |
| ------------------------------- | ---------------------------- |
| Fichiers `.ts` total            | 712                          |
| Fichiers source (hors tests)    | **430**                      |
| Fichiers de test (`.test.ts`)   | **282**                      |
| Cas de test (`it(` / `test(`)   | **12 614**                   |
| Lignes de source (hors tests)   | **152 430**                  |
| Exports publics dans `index.ts` | 71 (≈29 modules re-exportes) |
| Sous-familles fonctionnelles    | 5                            |

> Chiffres verifies via :
>
> - src : `find src/lib/mathAST -name '*.ts' ! -name '*.test.ts' | wc -l`
> - tests : `find src/lib/mathAST -name '*.test.ts' | wc -l`
> - cas : `grep -rhE '^[[:space:]]*(it|test)\(' src/lib/mathAST --include='*.test.ts' | wc -l`

---

## Les documents de cette section

### 1. [architecture.md](./architecture.md) — Vue d'ensemble

> **Audience** : nouveaux developpeurs, onboarding
> **A lire en premier** si tu decouvres le module.

Cartographie complete : role du module, frontieres avec `geometry-core` et la couche
pedagogique, les 5 familles de sous-modules (Representation, Parsing, Calcul CAS,
Pedagogique/paliers, Pattern matching), flux parse → AST → NormalForm → AST simplifie,
modele de nœuds (`types.ts` — union discriminee, 28 variantes), invariants structurels
cles (flatten, sign, delimiter), guide d'ajout d'une nouvelle primitive.

### 2. [code-quality.md](./code-quality.md) — Qualite & dette technique

> **Audience** : mainteneurs, avant refactor

Top issues :

- **Drift factory** : ~91 litteraux `{ type: '...' }` bruts hors factory
  (`solve/solvers/transcendental.ts:177`, `analysis/structures.ts:599,621,695`, `limits/`)
  — contournent le sign-guard de `number()`, fuite d'invariant. Severite : Medium.
- **Taille** : `normal/normalize.ts` = 4 210 LOC / 137 Ko (candidat a decoupe) ;
  `parser/latex/parser-pratt.ts` 2 365 L ; `factory.ts` 2 025 L.
- **Collision d'export** : `index.ts` re-exporte `isZero`/`isOne` depuis `guards.ts` ET
  `normal/` (semantiques differentes : node-level vs rational-level).
- **Immutabilite convention** : nœuds `readonly` au type mais `Object.freeze` absent —
  garantie runtime par convention, pas enforcement.
- **Known issues parser** : (1) `-3y` → `multiplication(opposite(3), y)` au lieu de
  `opposite(multiplication(3, y))` — numeriquement identique, structure differente ;
  (2) `x^2/4` → erreur Pratt custom (workaround : `{x^2}/4`).

### 3. [tests.md](./tests.md) — Couverture & robustesse des tests

> **Audience** : contributors, agent `test-automator` > **Couverture globale** : haute mais inegale

12 614 cas sur 282 fichiers. Bien couverts (ratio ≈ 1:1 fichier source/test) :
`normal/` (19:19), `parser/` (18:18), `eval/` (11:16), `solve/` (18:15), `domain/` (25:15).
Angles fins : `sign/` (14:3), `variations/` (8:2), `taylor/` (3:1), couches
`pedagogical-*`.

### 4. [performance.md](./performance.md) — Analyse de performance

> **Audience** : optimisation, appels critiques (question generation, correction temps reel)

Hotspots principaux :

- **Pattern matching combinatoire** (`pattern/match.ts:666-811`) : C(n,k)×k! essais, pas de memoisation.
- **`mapNode` sans short-circuit** (`transforms.ts:278-487`) : reconstruit chaque nœud meme inchange.
- **Hash double par comparaison** (`normal/hash.ts:165`) : 2 strings hashees par `nodesEqual`, appele 3×/iteration.
- **Cache parse** (`cache/parse-cache.ts`) : LRU bien fait mais non cable aux parsers — opt-in uniquement.
- **Tableau de regles reconstruit** a chaque `simplify()` (`simplify/simplify.ts:51`).

### 5. [security.md](./security.md) — Audit securite

> **Audience** : security review, ops
> **Posture globale** : Acceptable — surface limitee, bien defendue

Surface genuinement limitee (pas de DB, pas d'auth, pas de reseau).
`parser/security.ts` : caps `maxInputLength=10000`, `maxASTDepth=100`, `maxNodeCount=10000`.
Finding principal [MED] : caps profondeur/nodes verifies POST-parse — imbrication ~5000
profond peut stack-overflow avant le check. Voir `security.md` pour le detail complet.

---

## Documents de domaine

### [pattern-matching.md](./pattern-matching.md) — Reference du module `pattern`

Reference riche (~28 Ko) du module `pattern/` : API `P`, `tryMatch`, `parsePattern`,
syntaxe des wildcards, rule sets, exemples. A lire avant d'ajouter ou de modifier
des regles de simplification.

### [mathAST-vs-poincare.md](./mathAST-vs-poincare.md) — Analyse comparative

Analyse (~30 Ko) des divergences et convergences avec le moteur CAS Poincare (NumWorks /
Upsilon, C++). Base documentaire de `decisions.md`. Couvre : forme binaire vs N-aire,
representation des negatifs, pipeline de simplification, tokenizer/parser, ordre canonique,
securite parser, bugs alignes et corriges.

### [decisions.md](./decisions.md) — Decisions d'architecture (ADR)

Decisions structurantes enregistrees sous forme ADR : choix d'un AST custom TypeScript,
modele de nœud union discriminee, forme normale NormalForm separee, sign-guard `number()`,
securite parser, approche paliers pedagogiques, convention nombre signe.

---

## Dossier `progress/`

[`progress/`](./progress/) regroupe les documents de progression des chantiers livres
dans ce module (migrations, refactors, nouvelles features). Consulter avant de toucher
une zone connue pour avoir ete refactoree recemment.

---

## Index thematique par famille

| Famille                                                   | Architecture | Qualite | Tests | Perf | Securite |
| --------------------------------------------------------- | :----------: | :-----: | :---: | :--: | :------: |
| Representation (`types`, `factory`, `flatten`)            |     §2-3     |  §3-5   |  §2   |  —   |    —     |
| Parsing (`parser/`, `latex-generator`)                    |      §4      |   §6    |  §3   |  §5  |    §2    |
| Calcul CAS (`normal/`, `simplify/`, `solve/`, `eval/`, …) |      §5      |   §4    |  §4   | §2-4 |    §3    |
| Pedagogique (`pedagogical-*/`, `step-generator/`)         |      §6      |   §7    |  §5   |  —   |    —     |
| Pattern matching (`pattern/`)                             |      §7      |   §5    |  §4   |  §2  |    —     |

---

## Voir aussi

- Agent metier : `mathast-expert` (`.claude/agents/`) — a utiliser pour toute
  modification dans `src/lib/mathAST/**`.
- [`CLAUDE.md`](../../../CLAUDE.md) — contraintes projet (OOM, commits, workflow git).
- [`docs/ref/geometry/README.md`](../geometry/README.md) — module geometry-core
  (consommateur de mathAST).
- [`docs/ref/tests/`](../tests/) — architecture des tests et guide TDD.

---

## Convention d'organisation

Ce repertoire suit la structure standard de la documentation de modules UbuMaths :

```
docs/ref/<module-name>/
├── README.md          # Index (ce fichier) — chiffres cles, pointeurs
├── architecture.md    # Vue d'ensemble, sous-dossiers, types, flux
├── code-quality.md    # Dette technique, code smells, top refactors
├── tests.md           # Couverture, angles morts, tests prioritaires
├── performance.md     # Hotspots, optimisations prioritaires
├── security.md        # Surface d'attaque, findings, mitigations
├── decisions.md       # ADR — decisions structurantes
├── glossaire.md       # Vocabulaire du module
└── api.md             # Reference publique (index.ts)
```

Voir [`docs/ref/geometry/README.md`](../geometry/README.md) §Convention pour les regles
de style (header YAML, chemins avec lignes, severite explicite, top N en fin de doc).
