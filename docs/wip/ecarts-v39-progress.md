---
title: V39, la puissance sous la fonction sans parenthèses — journal
date: 2026-11-27
status: en cours (PR à ouvrir)
---

## Reprendre ici

_Mis à jour le 2026-11-27, avant la PR._

- **État** : correctif écrit dans les deux parseurs LaTeX, tests écrits (rouges avant, verts après), doc système à jour.
- **Prochaine action** : revue (`code-reviewer`, opus), PR, CI, merge ; puis clore V39 au registre, inscrire les deux lectures voisines (`\ln x!`, `\ln x_1^2`), archiver ce journal et mettre à jour [ecarts-a-trier](ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : `tests/ecarts/` n'est pas dans le projet `server` de vitest : une sonde s'écrit sous `src/`.
- **Worktree / branche** : `../ubumaths-wt-ecarts-v39` · `fix/ecarts-v39`.

---

Chantier fils de [ecarts-a-trier](ecarts-a-trier-progress.md).

## Mesure avant le changement (2026-11-27, prod en lecture seule)

Décision du 2026-11-03 : `\ln 5^2` lu ln(5²) comme les manuels, après mesure des modèles touchés.

- **Modèles de questions** (2 907, dont 2 780 publiés ; champs `variations`, `test_specs`, `shared`, `options`) : aucune fonction sans parenthèses suivie d'une puissance. Les 5 touches de l'expression régulière étaient des `\sqrt{ {{a}}^2 … }`, donc des accolades.
- **`\cos 60^\circ`** : 8 modèles, 26 occurrences ; champs lus sur 3 d'entre eux : `statement` et `steps` (texte affiché).
- **Réponses d'élèves** (`skill_attempts.answer_parts`, `test_answers.user_answer`) : aucune de cette forme.
- **Dépôt** (`src`, `supabase/migrations`, `tests`, `e2e`) : rien hors tests, commentaires et l'intitulé du programme « Utiliser la relation $\ln q^n = n \ln q$ » (texte affiché).

## Phase 0 (validée par David le 2026-11-27, « je te suis »)

La règle vaut pour toutes les fonctions nommées, pas seulement `ln`.

- `\ln 5^2` → ln(5²) ; `\ln e^{2x}` → ln(e^{2x}) ; `\log 10^{-3}` → log(10⁻³) ; `2\ln 3^2` → 2·ln(3²).
- `\sin x^2` → sin(x²), de même `cos`, `tan`, `exp`, `log` ; `\sin^2 x^3` → sin²(x³) ; `\cos 60^\circ` → cos(60°).
- Inchangé : `\ln(5)^2`, `\ln\left(5\right)^2`, `\ln{5}^2` restent (ln 5)² ; `\ln 2x^2` reste ln(2)·x² ; `\sqrt 5^2` reste (√5)² ; `\ln 5^2^3` reste refusé.
- Hors de cette PR, à inscrire au registre : `\ln x!` lu (ln x)! ; `\ln x_1^2` lu ((ln x)₁)².

## Ce qui a été fait

- `parseFunctionArguments` des deux parseurs (`parser-pratt.ts`, `parser-rd.ts`) : après un argument « un seul jeton », un `^` s'attache à l'argument.
- Tests : `src/lib/mathAST/parser/latex/__tests__/puissance-sous-fonction.test.ts` (les deux parseurs, 56 cas) ; le test de preuve V39 de `tests/ecarts/mathast.test.ts` y est versé.
- Doc : `docs/systeme/mathast/README.md` (entrée V39).
