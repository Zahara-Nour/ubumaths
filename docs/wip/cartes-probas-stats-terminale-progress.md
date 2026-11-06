# Cartes probabilités et statistique de terminale — progression

Branche `feat/cartes-probas-stats-terminale`, worktree `ubumaths-wt-probaT`. Partie 2 de
`docs/systeme/programmes/correspondance-tspe-tcomp.md` (TCOMP-084 → 125) + points TSPE de probabilités.

## Reprendre ici

_Mis à jour le 2026-11-06 (relevé prod, MCP lecture seule)._

- **État** : PR #820 mergée (octobre) ; branche et worktree `ubumaths-wt-probaT` disparus. Les 22 modèles ont été
  créés en brouillon, puis repris, découpés et renommés par le chantier `questions-tspe` (clos le 2026-11-03) :
  **partie spé (A, B) publiée**. **Partie maths complémentaires seules (C, D) : 17 brouillons `T_COMP`** en prod
  (82 `T_COMP` publiés), liste ci-dessous.
- **Prochaine action** : aucune décidée. Pistes (à trancher par David) : archiver ce journal ; ouvrir un chantier
  de couverture `T_COMP` (relevé des points, relecture des 17 brouillons, publication).
- **En attente de David** : la suite des 17 brouillons `T_COMP`.
- **Pièges en cours** : ne **rien lancer** depuis `scripts/questions/probas-stats-terminale/` — fichiers sans
  `id`, titres changés en base : la simulation `create-questions` (2026-11-06) voit 14 « à créer » qui existent
  sous d'autres titres (doublons) et 3 « contenu différent » qui retireraient des niveaux (`T_TECHNO`, `1_GEN`,
  `1_TECHNO`). Partir d'un export (`scripts/export-question-templates.ts --ids …`).
- **Worktree / branche** : aucun.

### Brouillons `T_COMP` en prod (2026-11-06)

| id       | Titre                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| 49fac266 | Ajustement affine : interpréter le coefficient directeur et l'ordonnée à l'origine |
| 17f35a67 | Ajustement par changement de variable z = ln(y)                                    |
| 860f59fc | Coefficient de corrélation : interpréter r                                         |
| a573d517 | Droite de régression donnée par la calculatrice : estimer une valeur               |
| df88eea9 | Espérance d'une loi à densité par une intégrale                                    |
| 3cfcc718 | Loi à densité : constante de normalisation                                         |
| 6b26aba3 | Loi à densité : probabilité = aire sous la courbe                                  |
| 88202a40 | Loi exponentielle : absence de mémoire                                             |
| 63ee5d66 | Loi exponentielle : durée moyenne                                                  |
| c6b5894c | Loi exponentielle : probabilités                                                   |
| d9ac0141 | Loi uniforme sur [0 ; b] : fonction de répartition                                 |
| 89e16891 | Loi uniforme sur [a ; b] : probabilités                                            |
| 441d7ed2 | Loi uniforme sur [a ; b] : temps d'attente moyen                                   |
| b71b4874 | Loi uniforme sur {1, …, n} : espérance                                             |
| 3cb90b97 | Loi uniforme sur {1, …, n} : probabilités                                          |
| a6cc7712 | Nuage de points : sens et intensité de la liaison (coefficient de corrélation)     |
| 1c65d58e | Statistique à deux variables : coordonnées du point moyen                          |

---

## Historique (2026-10-10)

- [x] 22 modèles dans `scripts/questions/probas-stats-terminale/` (A lois discrètes et coefficients
      binomiaux, B sommes de variables et concentration — spé seule, C lois à densité et
      D statistique à deux variables — maths complémentaires seules)
- [x] `question:specs` : 22/22 importables, specs vertes, tirages relus (12 par modèle)
- [x] Figures (C-03 courbe + aire, D-02 nuage) et tableaux rendus au navigateur, bureau et 390 px
- [x] Simulation `create-questions.ts` : 22 « à créer », liens vérifiés
- [ ] Relecture de David, puis création en brouillon (`--publier`, par David ou sur son accord)

Écart moteur relevé : `{{eval:(2/3)^(4-3)}}` (base fractionnaire, exposant composé) n'est pas
calculé (rendu `\left(\dfrac{2}{3}\right)^{4-3}`) ; `(2/3)^n` et `0.7^(n-1)` le sont. Contourné par
une variable d'exposant (`h = n - k`) dans A-04 et A-08.
