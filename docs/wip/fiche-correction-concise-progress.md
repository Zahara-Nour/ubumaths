# Fiche PDF : correction concise ou détaillée (lot 3 de l'ADR 0017, écart D4)

Décision D11 (David, 2026-10-02), périmètre validé le 2026-10-11 : réglage `correction_detail` de
la fiche (concise / détaillée, détaillée par défaut), appliqué À L'IMPRESSION avant Typst ; la série
d'automatismes garde ses marqueurs ; les affichages écran d'un corrigé d'exercice passent par
`detailedCorrection`. Hors périmètre : mise en forme Typst des encadrés `[!méthode]`…

Branche `feat/fiche-correction-concise`, worktree `../ubumaths-wt-fiche-concise`.

- [x] Tests rouges : `src/lib/worksheets/__tests__/correction-imprimee.test.ts`.
- [x] `correctionForPrint`, réglage (type, Zod, lecture, UI), PDF prof + élève, API élève, série.
- [x] Écrans : corrigés d'exercice via `detailedCorrection`.
- [x] Doc (`fiches-et-pdf.md`, `CONTEXT.md` si besoin), écarts (D4) ; check, revue, PR.
