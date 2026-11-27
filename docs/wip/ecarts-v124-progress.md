---
title: Écart V124 (x² − a²bc = 0, solution 0 du cas a = 0) — journal
date: 2026-11-27
status: en cours — PR ouverte
---

## Reprendre ici

_Mis à jour le 2026-11-27, à l'ouverture de la PR (correctif sondé, testé, relu)._

- **État** : correctif fini sur la branche, PR ouverte. Sonde lue, tests verts (mathAST + Atelier + écarts), `check:incremental` à 0, revue `code-reviewer` Opus faite et ses trois points corrigés (détail ci-dessous).
- **Prochaine action** : CI verte → merge (`pnpm pr:merger`) ; puis, sur `main` en commit direct : barrer V124 au registre, mettre à jour le bloc de `docs/wip/ecarts-a-trier-progress.md` (prochaine action : V125), archiver ce journal.
- **En attente de David** : deux écarts vus en passant, à porter ou non au registre (section « Vu en passant »).
- **Pièges en cours** : sondes par l'Atelier (`runInput`), jamais `pnpm math` ; ne jamais écrire `cat > fichier` sans entrée.
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

## Sonde lue et revue (2026-11-27)

La sonde rend la forme de la phase 0 (`0 si a = 0`, `0 si ad = 0` pour `a²d²bc`, `1 si a = 0` pour `(x − 1)² = a²b`). Elle a montré deux défauts du premier jet, corrigés :

- `x³ − a²bx = 0` écrivait 0 deux fois → le chemin « x en facteur » de `polynomial.ts` n'ajoute pas le 0 conditionnel.
- `x⁴ − a²bx² = 0` perdait le 0 sans condition au profit de « 0 si a = 0 » → `deduplicateSolutions` (`solve.ts`) garde la solution sans condition.

Revue `code-reviewer` (Opus), trois points corrigés et testés dans `racine-produit-lettres.test.ts` :

- lettre aussi présente dans le coefficient de x² (`a²x² − bc = 0`, par l'API seulement, l'Atelier refuse la saisie) : « 0 si a = 0 » était faux → ces lettres ne comptent plus ;
- `(x² − a²b)(x² − c²d) = 0` perdait « 0 si c = 0 » → deux conditions différentes restent deux solutions écrites ;
- `x² + 2ax + a² − a²b = 0` écrivait « −a si a = 0 » → la racine double est évaluée pour la lettre nulle (une seule lettre).

## Vu en passant (hors V124, rien de fait)

- L'Atelier refuse `.résoudre x^2+2x+1-b=0` (« Je n’ai pas su lire cette expression »), comme `x^2+2x+1-a^2=0` et `x^2+2ax+a^2-b=0`, alors que `x^2+2x-a^2b=0` est lue. Pas vérifié sur `main`, mais le correctif ne touche pas la lecture.
- `e^{2x} − a²b = 0` et `(ln x)² − a²b = 0` répondent « pas de solution » par l'API, à l'identique sur `main` (constat du relecteur).
