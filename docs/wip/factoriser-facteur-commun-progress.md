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

- [ ] tests rouges
- [ ] implémentation
- [ ] code-reviewer
- [ ] PR
