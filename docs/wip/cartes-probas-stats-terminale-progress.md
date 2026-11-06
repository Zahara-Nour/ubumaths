# Cartes probabilités et statistique de terminale — progression

Branche `feat/cartes-probas-stats-terminale`, worktree `ubumaths-wt-probaT`. Partie 2 de
`docs/systeme/programmes/correspondance-tspe-tcomp.md` (TCOMP-084 → 125) + points TSPE de probabilités.

## Reprendre ici

_Mis à jour le 2026-11-06 (relecture des 17 brouillons `T_COMP` ouverte)._

- **État** : décision de David (2026-11-06) : relire et publier les 17 brouillons `T_COMP`, sans chantier de
  couverture. Instantané prod dans `scripts/questions/tcomp-brouillons/` (17 fichiers, avec `id`). Page à cocher
  publiée : https://claude.ai/artifact/1iwzkfN82RGt7tDAx8zxTT (collection `verdicts`). Contrôles de la page :
  17 / 17 avec point et nœud ; seule alerte, a6cc7712 : bloc `nuage` non dessiné (le jouer dans l'aperçu).
- **Prochaine action** : lire et compter les verdicts ; corriger les « À revoir » dans les fichiers ; puis
  `publier-lot` (simulation, puis `--publier`) lancé par David.
- **En attente de David** : ses verdicts sur la page.
- **Pièges en cours** : `publier-lot.ts`, même en simulation, est refusé à Claude (« Modify Shared Resources ») :
  David le lance avec `!`. Ne rien lancer depuis `scripts/questions/probas-stats-terminale/` (fichiers sans `id`,
  doublons) : travailler sur `tcomp-brouillons/`. Worktree neuf : `pnpm exec svelte-kit sync` avant les `tsx`.
- **Worktree / branche** : `ubumaths-wt-cartes-probas-stats-terminale` · `feat/cartes-probas-stats-terminale`.

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
