# Factoriser : facteur commun non polynomial — journal

Branche `feat/factoriser-facteur-commun`, worktree `../ubumaths-wt-factoriser`. Préalable à V18
(`docs/wip/ecarts-a-trier.md`, K20) : sans lui, ∫x²eˣ ne peut pas s'écrire `(x^2-2x+2)e^x`.

## Décision de David (2026-10-11)

« fais 1 » : l'intention `factoriser` de `pedagogical-simplify` doit savoir mettre en facteur un
facteur commun **non polynomial**. Ni `auto` ni l'ADR 0007 ne changent (`auto` ne factorise jamais).
La règle locale des primitives (point 2) et la piste « factoriser d'abord, sinon développer puis
refactoriser » (point 3, pour K3) attendent.

## Mesure de départ (main 20103a554, intention `factoriser`, lycée)

| Entrée              | Rendu aujourd'hui         |
| ------------------- | ------------------------- |
| `xe^x-e^x`          | inchangée                 |
| `x^2e^x-2xe^x+2e^x` | inchangée                 |
| `(x+1)^2-(x+1)`     | inchangée                 |
| `3x^2+6x`           | `3x(x+2)` (déjà juste)    |
| `x(x+1)+2(x+1)`     | `(x+2)(x+1)` (déjà juste) |

## Comportements visés

- `xe^x-e^x` → `(x-1)e^x` ; `x^2e^x-2xe^x+2e^x` → `(x^2-2x+2)e^x` ;
- coefficient ≠ 1 : `3xe^{2x}+6e^{2x}` → `3(x+2)e^{2x}` ;
- puissance de même base : `(x+1)^2-(x+1)` → `x(x+1)` ou `(x+1)x` (forme à relever) ;
- inchangé : pas de facteur commun (`xe^x+\sin x`), un seul terme, `e^x+e^{2x}` à relever.

## Avancement

- [x] tests rouges — `pedagogical-simplify/__tests__/facteur-commun-non-polynomial.test.ts`,
      8 rouges sur 19 avant l'implémentation (5 rendus + 3 étapes : `common-factor-content-*`
      n'avait AUCUNE description, l'élève lisait « Règle: common-factor-content-add »).
- [x] implémentation — `pattern/rule-sets/common-factor.ts` : le monôme porte des `atoms`
      (facteurs non polynomiaux, clé `hashMathNode`) ; deuxième essai où une somme entre
      parenthèses est un facteur (`(x+1)² − (x+1)`). Le facteur non polynomial s'écrit après la
      parenthèse. Descriptions FR ajoutées (`descriptions-fr.ts`).
- [x] code-reviewer — 3 points corrigés (5 tests vus rouges sur c6a1be7d1) :
  1. une somme en facteur n'est plus redéveloppée : la lecture « sommes gardées en facteurs »
     l'emporte dès qu'elle sort au moins autant de facteurs non polynomiaux (≥ 1) ;
     `3(x+1)^2-6(x+1)` → `3(x-1)(x+1)`, `2(x+1)^2+4(x+1)` → `2(x+3)(x+1)` (main : inchangés) ;
  2. eˣ reste derrière sous un signe ou une fonction (`tidyWithoutReordering` descend dans
     `opposite` et `function` quand un produit est dessous) : `-xe^x-e^x` → `-(x+1)e^x`,
     `\sin(xe^x-e^x)` → `\sin((x-1)e^x)` ;
  3. le reste est réduit (termes semblables), et un reste d'un seul terme rentre dans le
     facteur : `(x+1)^2-(x+1)^3` → `-x(x+1)^2`.
     Écarts notés par le coordinateur, non traités : `x^2(x+1)-x(x+1)` → `x(x^2-1)` (comme main) ;
     somme de 30 termes.
- [ ] PR

## Mesure d'arrivée (intention `factoriser`, lycée)

| Entrée                                 | Rendu                                             |
| -------------------------------------- | ------------------------------------------------- |
| `xe^x-e^x`                             | `(x-1)e^x`                                        |
| `x^2e^x-2xe^x+2e^x`                    | `(x^2-2x+2)e^x`                                   |
| `3xe^{2x}+6e^{2x}`                     | `3(x+2)e^{2x}` (déjà juste avant)                 |
| `\frac{1}{2}xe^{2x}-\frac{1}{4}e^{2x}` | `(\frac{x}{2}-\frac{1}{4})e^{2x}` (relevé)        |
| `(x+1)^2-(x+1)`                        | `x(x+1)`                                          |
| `e^x+e^{2x}`, `e^{2x}-e^x`             | inchangés (e²ˣ n'est pas vu comme (eˣ)²)          |
| `xe^x+\sin x`, `3xe^x`                 | inchangés                                         |
| `-2xe^x+4e^x`                          | `2(2-x)e^x` (inchangé : signes mêlés, à trancher) |

Tests : pedagogical-simplify + pattern 1336 verts ; `src/lib/mathAST` entier 19 258 verts ;
atelier 2025 verts ; questions/generator 813 verts. Aucun snapshot changé.
