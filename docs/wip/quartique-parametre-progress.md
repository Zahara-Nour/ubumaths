# Chantier `quartique-parametre` — équations de degré ≥ 3 à paramètre

## Reprendre ici

_Mis à jour le 2026-10-26, PR ouverte._

- **État** : corrigé et testé ; PR en revue (`code-reviewer` opus), CI.
- **Prochaine action** : traiter la revue, merger, archiver ce journal (chantier d'une PR).
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `ubumaths-wt-quartique-parametre`, `fix/quartique-parametre`.

## 1. Constat (2026-10-26, David : « corrige le bug »)

- Le « bug » versé aux points ouverts par la revue de normalize-usages (#1794) était une **fausse alerte** : `ax⁴ + x − 1 = 0` porte `status: 'no-solution'` MAIS un `error` — `isSolverFailure` le lit comme un échec, l'Atelier affiche « La solution dépend de a : je ne sais pas encore résoudre avec un paramètre ». La revue n'avait lu que le statut.
- Sonde de 27 équations à paramètre : trois vrais défauts (choix de David : « les deux », recommandé) :
  - `x⁴ − a = 0` → `±⁴√a` sans condition (`x² − a` : « si a ≥ 0 ») ; `x⁴ + a = 0` idem ; `x⁴ = −a² − 1` rendait deux racines (aucune solution réelle) ;
  - `ax³ + x − 1 = 0`, `x³ − 3x + a = 0` → une formule de Cardan, fausse quand Δ > 0 (trois racines réelles) ou a = 0 ;
  - `x³ − ax = 0` → `0` seul, `±√a` oubliés.

## 2. Correctif

- `solvePowerEquation` : k avec un paramètre → pas de raccourci « k < 0 » ; n pair → condition `k ≥ 0` (`parameterCondition`), `never` → aucune solution réelle.
- `solveCubicCardano` : Δ avec un paramètre → refus (`error`, comme le degré 4).
- `handleCubicWithCommonFactor` : ax² + bx + c avec un paramètre → `quadraticSolver` (porte la condition Δ ≥ 0).
- Tests `solve/__tests__/quartique-parametre.test.ts` : 13, dont 8 rouges avant (les 5 refus de degré 4 étaient déjà verts : la fausse alerte). Suite `src/lib` 59 157 verts ; `check:incremental` 0.
