---
title: Écart V124 (x² − a²bc = 0, solution 0 du cas a = 0) — journal
date: 2026-11-27
status: en cours — correctif écrit, pas encore sondé ni testé
---

## Reprendre ici

_Mis à jour le 2026-11-27, avant toute PR (branche poussée, aucune PR ouverte)._

- **État** : phase 0 tranchée (forme 1, ci-dessous). Correctif **écrit mais jamais exécuté** dans `src/lib/mathAST/solve/solvers/quadratic.ts` (`unsplitDiscriminantRoot` rend aussi `vanishing`, le produit des lettres de puissance paire ; une troisième solution −b/(2a) est ajoutée avec la condition `vanishing = 0`). Aucun test lancé, aucune sonde lue.
- **Prochaine action** : (1) sonder par le chemin de l'Atelier (`runInput`, comme `src/lib/mathAST/solve/__tests__/racine-produit-lettres.test.ts`) la liste « Sonde à jouer » ci-dessous et lire le rendu ; (2) `pnpm test:server tests/ecarts/mathast.test.ts` : le test V124 doit passer au vert, puis le déplacer en test ordinaire dans `racine-produit-lettres.test.ts` (rendu exact) et retirer la preuve de `tests/ecarts/mathast.test.ts` ; ce fichier-là a 3 tests en `endsWith('si b c ⩾ 0')` qui changent de forme (condition par solution) : les réécrire ; (3) `git merge origin/main` (branche en retard de 56 commits), `check:incremental`, revue `code-reviewer` en Opus (mathAST), doc (`pnpm docs:check-a-jour --depuis origin/main`), PR, merge ; (4) après merge : barrer V124 au registre (commit direct sur `main`), mettre à jour le bloc de `docs/wip/ecarts-a-trier-progress.md` (prochaine action : V125), archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : ne jamais écrire `cat > fichier` sans entrée dans une commande (elle attend le clavier : la sonde de la session du 2026-11-27 n'a jamais tourné) ; `x³ − a²bx = 0` risque d'écrire 0 deux fois (0 déjà solution, plus « 0 si a = 0 ») : à regarder dans la sonde ; avec plusieurs lettres au carré (`a²d²bc`) la condition s'écrit `ad = 0` : vérifier le rendu ; une lettre de puissance impaire ⩾ 3 (`a³b` → |a|√(ab)) reste sous la racine, pas de cas manquant ; sondes par l'Atelier, jamais `pnpm math`.
- **Worktree / branche** : `/Users/david/Coding/js/ubumaths-wt-ecarts-v124` · `fix/ecarts-v124`.

---

## Phase 0 (2026-11-27)

Aujourd'hui `.résoudre x² − a²bc = 0` répond `S = { |a|√(bc) ; −|a|√(bc) } si bc ⩾ 0` : avec a = 0 et bc < 0, la solution 0 manque. Même trou pour le cas frère `x² − a²b = 0` (« ±|a|√b si b ⩾ 0 »).

Trois formes proposées à David ; recommandation de Claude (forme 1), suivie par David (« je te suis », choix de Claude et non décision de David) :

- Nominal : `x² − a²bc = 0` → `S = { |a|√(bc) si bc ⩾ 0 ; −|a|√(bc) si bc ⩾ 0 ; 0 si a = 0 }`.
- Cas frère, même PR : `x² − a²b = 0` → `S = { |a|√b si b ⩾ 0 ; −|a|√b si b ⩾ 0 ; 0 si a = 0 }`.
- Inchangé : `x² − ab = 0`, `x² − a = 0`, `x² − abc = 0`, `x² − 4ab = 0`, valeurs données (a = −1, b = −1).
- Écartées : garder √(a²bc) entier (perd |a|√b, « inchangé » de la phase 0 de V92) ; ne rien changer.

L'affichage sait déjà écrire une condition par solution (`solutionsLatex` et `commonCondition` dans `src/lib/mathAST/cli/commands/solve-latex.ts`).

## Sonde à jouer

`.résoudre` de : `x^2-a^2bc=0`, `x^2-a^2b=0`, `x^2-ab=0`, `x^2-a^2b^2c=0`, `x^2-a^3b=0`, `x^3-a^2bx=0`, `x^2+2x+1-a^2b=0`, `x^2-a^2=0`, `x^2-4a^2bc=0`, `x^4-a^2b=0`, `(x-1)^2=a^2b`, `x^2+2ax+a^2-a^2b=0` ; et, après `a=0` dans la même session, `x^2-a^2bc=0`.
