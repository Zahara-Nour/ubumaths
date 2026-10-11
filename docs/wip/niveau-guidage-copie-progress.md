# K1 — copie d'une fiche : niveau de guidage par affectation (ADR 0023), PR 2

PR 1 (#1095) : colonne `worksheet_assignments.guidance_level`, en prod le 2026-10-11 (vérifié :
11 affectations à `guided`). Ici : le code.

Branche `feat/niveau-guidage-copie`, worktree `../ubumaths-wt-guidage-copie`.

- [x] `db:types` (colonne dans `database.ts`).
- [x] Cœur `src/lib/worksheets/student-copy.ts` : `guidanceVariationIndex`, `copySeed`,
      `resolveCopyExercise` (tests `student-copy.test.ts`, 18).
- [ ] Branchement : API élève, aperçu d'affectation, corrigé prof (`correction`), `PdfPreview`
      (aperçu, ZIP, correction générale ; choix « Niveau à imprimer »), cahier public.
- [ ] Formulaire d'affectation (niveau + aide) + Zod des routes d'affectation.
- [ ] Fenêtre de l'exercice : « Mode de variante » retiré ; badge retiré ; `variant_mode` plus lu.
- [ ] Doc `fiches-et-pdf.md` (écarts V1, V2, M4), écarts K1 ; revue, PR.
