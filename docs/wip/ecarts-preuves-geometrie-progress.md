---
title: Tests de preuve des écarts de géométrie et du grapheur — journal
date: 2026-11-26
status: PR ouverte
---

## Reprendre ici

_Mis à jour le 2026-11-26, à l'ouverture de la PR._

- **État** : `tests/ecarts/geometrie.test.ts` écrit : 6 écarts (L57, L58, L59, L60, L61, V77), 7 tests, tous rouges ; leurs lignes du registre pointent le test.
- **Prochaine action** : merger à la CI verte, puis archiver ce journal ; la suite (autres domaines) est dans [ecarts-a-trier](ecarts-a-trier-progress.md).
- **En attente de David** : rien.
- **Pièges en cours** : `Figure.getPosition` rend des valeurs exactes (`GeoValue`), à passer par `geoToNumber` avant toute comparaison.
- **Worktree / branche** : `ubumaths-wt-ecarts-preuves-geometrie` / `test/ecarts-preuves-geometrie`.

---

Chantier fils de [ecarts-a-trier](ecarts-a-trier-progress.md) : une PR de tests de preuve par domaine.

## Ce que chaque test affirme

| Écart | Sonde                                                       | Attendu                                                                   | Rouge aujourd'hui par                         |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| L57   | `runDsl` : `s = segment(A, B)` puis `d = mediatrice(s)`     | une droite portée par deux points distincts à égale distance de A et de B | « `mediatrice()` attend 2 points »            |
| L58   | `runDsl("M' = point(1, 1)")`                                | un point d'étiquette `M'` en (1 ; 1)                                      | « Caractere inattendu : ''' »                 |
| V77   | `a = slider(0, 5, 2)` puis `courbe("x^2 + y^2 = a^2")`      | un cercle de rayon 2, puis 3 après `moveSlider(a, 3)`                     | conique `degenerate`                          |
| L59   | `runDsl('c = courbe("x^2 = 4")')`                           | un objet visible nommé `c`                                                | « la variable y est absente de l'expression » |
| L60   | `analyzeFunction` de `tan(x) + 1/(x − 3)`, fenêtre dézoomée | une asymptote verticale en x = 3                                          | aucune asymptote verticale                    |
| L61   | `analyzeFunction` de `(ln x)²/√x`                           | une seule asymptote horizontale, y = 0, à droite                          | aucune asymptote horizontale                  |

## Vérification des verts possibles

Chaque affirmation a été rejouée sur un cas témoin qui marche déjà (`mediatrice(A, B)`, `M = point(1, 1)`, `courbe("x^2 + y^2 = 4")`, `courbe("x^2 - y^2 = 0")`, `1/(x − 3)`, `ln(x)/√x`) : 6 vertes sur 6. Le test « change de rayon » n'a pas de témoin (aucune conique de `courbe()` ne suit un curseur aujourd'hui) ; la lecture après `moveSlider` + `recompute` est celle de `recomputeParametricConic` (`figure.ts`).

Cette vérification a trouvé une faute de la première version : les positions étaient comparées sans `geoToNumber` (un test resté rouge même l'écart corrigé).

## Choix

- L59 : le test ne fixe pas la forme de l'objet (deux droites ou conique dégénérée), laissée à la correction.
- L60 : dans la fenêtre dézoomée, `tan(x)` seule n'affiche aucune de ses asymptotes (trop serrées) ; le test ne demande que x = 3.
