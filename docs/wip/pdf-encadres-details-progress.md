# Encadrés et détails en ligne au PDF (ADR 0017, suite du lot 3)

Décisions de David (2026-10-11) : `> [!méthode|rappel|attention]` → titre + bord gauche + fond pâle
par type ; le rappel se place à sa place (pas en marge) ; titres selon la langue du document ;
lisible en noir et blanc. Détails en ligne : calcul en gris, les autres sur fond teinté.

Branche `feat/pdf-encadres-details`, worktree `../ubumaths-wt-encadres`.

- [x] Tests rouges : `src/lib/ubumark/generators/__tests__/encadres-typst.test.ts`.
- [ ] Générateur Typst (`typst-generator.ts`), titres EN (`detail-kinds.ts`).
- [ ] Compilation réelle d'une fiche marquée (`pnpm fiche:verifier`), regard sur le rendu.
- [ ] Doc (`ubumark.md`, écart des titres écran en français), revue, PR.
