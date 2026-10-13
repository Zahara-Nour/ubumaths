---
title: Atelier — une fonction définie sur un intervalle (phase 0)
date: 2026-10-13
status: phase 0 validée (2026-10-13, I1-I6 selon les recos) ; lot 1 en PR
---

# Atelier — une fonction définie sur un intervalle

Décision de David (2026-10-13, Q5 de [atelier-reciproque-phase0.md](atelier-reciproque-phase0.md)) :
les cartes de fonction apprennent à porter un intervalle, **avant** la carte `f⁻¹`. Utile bien
au-delà de la réciproque : au lycée, une fonction est presque toujours donnée sur un intervalle.

## Ce qui existe (inventaire du 2026-10-13, lu dans le code)

- **mathAST** a les domaines (`Domain`, `mathAST/domain/types.ts`), leur algèbre (`intersect`,
  `containsValue`, `domain/algebra.ts`) et un **parseur des écritures d'élève**
  (`parseStudentDomain`, `domain/validation/parse-student-domain.ts`) : `]0 ; +∞[`, `[0 ; 1]`,
  réunions `∪`, `ℝ \ {0}`, `ℝ*`, `ℝ₊`.
- **Les calculs acceptent déjà un domaine** : `solve`, `computeVariations`, l'analyse de signe
  (`domain` dans leurs options) — mais l'atelier ne le leur passe jamais.
- **Le grapheur de l'atelier ne sait rien restreindre** (`ExplicitFunction`, `grapheur/types.ts`).
  geometry-core, lui, sait : `courbe … sur ]a;b]` coupe le tracé et marque les bornes
  (`geometry-core/dsl/domain-parser.ts`, `rendering/svg-primitives.ts`) — modèle à suivre.
- **Persistance et URL** : un champ optionnel sur le modèle de `letter` suffit
  (`persistence.ts`), sans changer de version.

## Questions à trancher (recos)

- **I1 — Écriture** : dans le même champ que la définition, avec le mot `sur` :
  `f(x) = x^2 − 2 sur [0;+∞[`. Le mot de geometry-core (`courbe … sur ]a;b]`) et des énoncés.
  _Reco : oui._
- **I2 — Ensembles acceptés** : tout ce que lit `parseStudentDomain` (intervalles, réunions,
  `ℝ \ {…}`, `ℝ₊`). _Reco : oui_ — un seul parseur, déjà testé.
- **I3 — Intervalle qui déborde du domaine** (`f(x) = ln x sur [−1 ; 2]`) : _reco : refus_ —
  « ln x n'est pas défini sur tout [−1 ; 2] (pas en −1). » Plutôt que de couper en silence : l'élève
  apprend que l'ensemble se choisit DANS le domaine.
- **I4 — Calculer hors de l'intervalle** : `f(5)` avec f sur `[0 ; 2]` → _reco : refus_ —
  « 5 n'est pas dans l'ensemble de définition de f, [0 ; 2]. » Les commandes (`.variations`,
  `.résoudre`, signe) travaillent sur l'intervalle ; `f′` hérite de l'intervalle de f.
- **I5 — Tracé** : courbe coupée aux bornes ; borne fermée = point plein, borne ouverte = point
  creux, comme geometry-core. _Reco : oui._
- **I6 — Retirer l'intervalle** : effacer `sur …` dans le champ suffit (la fonction redevient
  définie sur son domaine). _Reco : oui._

## Comportements attendus (TDD)

### Cas nominaux

| Saisie                              | Attendu                                                               |
| ----------------------------------- | --------------------------------------------------------------------- |
| `f(x) = x^2 sur [0;+∞[`             | carte `f(x) = x² sur [0 ; +∞[`, demi-parabole, point plein en (0 ; 0) |
| `g(x) = x+1 sur ]0;5]`              | segment, point creux en (0 ; 1), point plein en (5 ; 6)               |
| `k(x) = 1/x sur ]0;5]`              | tracé jusqu'à 5 (point plein), pas de point en 0 (asymptote)          |
| `h(x) = x sur [−1;1] ∪ [2;3]`       | deux morceaux de droite, quatre points pleins                         |
| `f(1)` (f sur `[0;+∞[`)             | `1`                                                                   |
| `.variations f` (f = x² sur [0;+∞[) | tableau sur `[0 ; +∞[` seulement : croissante                         |
| `.résoudre f(x)=4` (même f)         | `S = {2}` (pas −2)                                                    |
| Dériver f (sur `[0;+∞[`)            | carte `f′(x) = 2x sur [0 ; +∞[`                                       |
| Rechargement, partage par adresse   | l'intervalle revient                                                  |

### Cas limites

- `sur ℝ` : accepté, équivaut à pas d'intervalle (rien n'est affiché en plus).
- Bornes écrites `+\infty` (MathLive) ou `+∞` (clavier) : les deux lues.
- Lettre choisie : `f(t) = t^2 sur [0;1]` : même règle.
- Intervalle réduit à un point (`[2;2]`) ou vide (`]2;2[`) : refus « l'intervalle est vide » / « réduit
  à un point ».

### Refus (en français)

- Ensemble illisible (`sur [0,+oo`) : « Je n'ai pas su lire l'intervalle : écris par exemple
  `sur [0;+∞[`. »
- I3, I4 ci-dessus.
- `sur` après une liste, une valeur, une suite : « Seule une fonction se définit sur un intervalle. »
  (une suite se règle par son premier indice).

## Lots

1. **Modèle et saisie** — champ optionnel sur `FunctionObject`, lecture par `parseStudentDomain`
   après `sur`, I3, persistance + URL, affichage sur la carte, `f(5)` (I4).
2. **Calculs** — domaine passé à `.variations`, `.résoudre`, signe ; `f′` hérite.
3. **Tracé** — le grapheur apprend la restriction et les bornes (I5), sur le modèle de geometry-core.

Puis le lot 3 de la réciproque (carte `f⁻¹` portant son ensemble).

## Journal

- 2026-10-13 — phase 0 écrite ; validée par David (« je valide ») : I1-I6 selon les recos.
- 2026-10-13 — lot 1 (modèle et saisie) : `interval.ts`, champ `FunctionObject.interval`, I3, I4, I6,
  persistance + URL + fusion ; « sur » mesuré dans Chromium (lettres collées, `smartFence` coupé).
