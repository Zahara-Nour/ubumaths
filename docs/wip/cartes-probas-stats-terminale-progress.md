# Cartes probabilités et statistique de terminale — progression

Branche `feat/cartes-probas-stats-terminale`, worktree `ubumaths-wt-probaT`. Partie 2 de
`docs/wip/referentiel/correspondance-tspe-tcomp.md` (TCOMP-084 → 125) + points TSPE de probabilités.

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
