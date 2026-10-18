---
title: Atelier — la géométrie (v2), journal de progression
date: 2026-10-18
status: lot 1 CLOS — PR 1 (#1474), PR 2 (#1478), PR 3 (#1482), K4 (#1491) mergées ; PR 4 ABANDONNÉE sur mesure (2026-10-18)
---

# Atelier — la géométrie : où en est le chantier

Phase 0 (validée le 2026-10-18) : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md).
Chapeau : [atelier-progress.md](atelier-progress.md).

## Lot 1 — découpage

| PR  | Contenu                                                                                        | Branche                           | État     |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------- | -------- |
| 1   | Modèle : types `point` et `curve`, lecture, `y` réservé + migration, cartes, sauvegarde / lien | `feat/atelier-geometrie-modele`   | ✅ #1474 |
| 2   | Vue Figure et pont `syncFigure` (curseurs cachés réglés par `moveSlider`, repère)              | `feat/atelier-geometrie-figure`   | ✅ #1478 |
| 3   | 𝒞f dans la vue Géométrie (action de carte), onglet renommé « Géométrie »                       | `feat/atelier-geometrie-courbe-f` | ✅ #1482 |
| 4   | Grapheur à vrais paramètres (Q4 : sa propre PR, en dernier)                                    | —                                 | à faire  |

## PR 1 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-geometrie` créé ; comportements visés : C1-C15
  (sauf l'affichage dans la Figure), P1-P9, M1-M4, Q1, Q2.
- 2026-10-18 : PR 1 implémentée (tests d'abord : 64 tests node, 58 rouges avant le code) —
  types `point` et `curve`, lecture dans Calcul et les cartes, `y` réservé (Q1), version 3 et
  migration d'un objet `y` (Q2), plafond de 50 (Q3), cartes « d : … » et « A = … », boutons
  « + Point » et « + Courbe ». Reportés en PR 2 : la nature d'une courbe (C1 « droite », C2
  « cercle ») et la courbe vide (C6), faute d'une classification pure dans `geometry-core`.
- 2026-10-18 : corrections de la revue — un `y` de l'atelier personnel renommé en gardant un lien
  reçu est dit (`MergeReport.migrated`, ShareBar) ; `x : 2 = 4` redevient un calcul (nom réservé
  sans x ni y), `k : 2 = 3` reste le refus C8 ; `xy` est lu comme x et y ; la carte d'un point
  testée à la frappe (MathLive écrit `\left(1;2\right)`, `\left(1,5;2\right)`).
- **À trancher par David** : `y` hors définitions dans Calcul (`2y + a`, `.dériver y`) n'est pas
  contrôlé. Reco : le laisser lettre libre dans un calcul (aucun objet ne s'appelle y).
- 2026-10-18 : CI verte, **mergée (#1474, `9a4c5fb2c`)**, branche et worktree retirés. Pas en
  production (aucun `deploy:prod`).

## PR 2 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-figure`. Tests d'abord : 54 tests node (47
  rouges) et 12 navigateur (12 rouges) — `figure-sync.test.ts`, `figure-nature.test.ts`,
  `geometry-core/geometry/__tests__/curve-nature.test.ts`, `FigureView.svelte.test.ts`, cartes
  C1, C2, C6 (`carte-geometrie.svelte.test.ts`, C1 passe de « courbe » à « droite »).
- 2026-10-18 : implémenté — onglet Figure entre Graphe et Données (Q5), `FigureView.svelte`
  (projection, `$derived`, `objectsMovable={false}`, repère orthonormé, case « Repère » hors
  `serialize()`), `syncFigure` / `AtelierFigure` par l'API `Figure.create*` (pas le DSL : pas de
  texte relu), curseurs cachés réglés par `moveSlider` sans reconstruire, coniques et courbes
  implicites à curseur (`parameterRecipe` dans `Figure`), nature des courbes par une
  classification pure partagée avec `courbe()` (`curve-nature.ts`, `degenerateConicKind` : vide,
  point isolé, une ou deux droites).
- 2026-10-18 : **mesure S2** — atelier de 10 courbes dont 3 implicites (`y^2 = x^3 − ax`,
  `x^4 + y^4 = a^4`, `sin(x) + cos(y) = a/4`), toutes citant `a`, 40 crans de curseur :
  **médiane 10,9 ms, p90 12,0 ms, max 13,7 ms** par cran dans Chromium (vitest navigateur, toile
  800 × 600, Mac mini M6 : `slideTo` + `syncFigure` + rendu Svelte, sans la peinture). En node :
  `slideTo` 0,5 ms, `syncFigure` 0,9 ms, géométrie SVG des 10 courbes 13 ms (médianes). Sous une
  image à 60 Hz ; pas de seuil posé.
- **À trancher par David** : (1) le libellé « deux droites » pour `x² = 4` ; (2) le message F1
  finit par un point. (Tranché par la revue : un point isolé et une droite double se DESSINENT,
  la carte d'un point isolé dit « point ».)
- 2026-10-18 : revue de code + vérification visuelle (Chromium, mobile) ; corrections, tests
  d'abord (12 rouges : 10 node, 2 navigateur) — conique à curseur reclassée dégénérée tracée
  (`x² = a`, `x² − y² = a` à 0), forme lue d'abord sur l'équation écrite (`y = 1/x` reste
  y = f(x)), point isolé et droite double dessinés (`degenerateConic`), valeur hors des bornes
  de sa carte non dessinée (plus de `moved` à chaque révision), aides d'une pose ratée
  retirées, `$effect` au lieu d'un `$derived` à effet de bord, tête de carte sans « : » / « = »
  seul sur sa ligne, tracés vérifiés à a = 3.
- Noté (non traité) : `planOf` relit tout l'atelier à chaque cran de curseur (substitution de
  chaque objet de la figure) ; la mesure S2 (~11 ms par cran pour 10 courbes) suffit pour
  l'instant.
- `masque(curseur)` : `GeometryCanvas` ne montre plus la réglette d'un curseur masqué. Vérifié
  en production (lecture seule, par la session principale) : aucune figure ni construction ne
  cache un curseur — aucun contenu n'en dépend.
- 2026-10-18 : PR 2 vérifiée à l'écran (Chromium, 1280 et 390 px), CI verte, **mergée (#1478,
  `721c64e89`)**, branche et worktree retirés. Pas en production.

## PR 3 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-courbe-f`. Tests d'abord : 19 node
  (`figure-fonctions.test.ts`, 16 rouges) et 4 navigateur (`FigureView.svelte.test.ts`, 4
  rouges) — onglet « Géométrie » (Q5 révisée), action K1, rangement, tracé, K2, K3.
- 2026-10-18 : implémenté — onglet et `aria-label` « Géométrie » (identifiants `Figure*`
  gardés) ; action `figure` (« Afficher dans Géométrie » / « Retirer de Géométrie ») par
  `BY_KIND` puis `runFromPanel`, ligne dans Calcul, rejouable, onglet Géométrie ouvert à
  l'affichage (A5) ; `inFigure` rangé (sauvegarde, lien, fichier, fusion), **version 4** (une
  version 3 se relit) ; 𝒞f par `createFunction`, curseurs liés par nom, une `GeoFunction` par
  morceau de l'ensemble (K2), nom de la carte (`f`, `f′`, `f⁻¹`, K3).
- **À trancher par David** : (1) afficher 𝒞f ouvre l'onglet Géométrie (comme « Tracer » ouvre
  le Graphe, A5) ; (2) une carte `f′` / `f⁻¹` créée depuis une `f` affichée naît affichée, comme
  pour le tracé ; (3) le message de la vue vide ajoute « ou affiche une fonction depuis sa
  carte » ; (4) le nom de 𝒞f n'est écrit que sur le premier morceau d'un ensemble en plusieurs
  morceaux.
- 2026-10-18 : revue de la PR 3 — la vue Géométrie n'est « non vide » que si une fonction
  affichée se dessine (`ok`), test navigateur rouge puis vert ; tests ajoutés, verts d'emblée
  (comportement déjà juste) : `1/x` en deux sous-chemins, `ln x` rien à gauche de x = 0, rejeu
  Afficher / Retirer / Afficher (même état, mêmes lignes), invariant 9 pour une fonction en
  erreur et pour `f′` d'une f en erreur ; `passesNear` ne lit plus que les points d'arrivée.
- 2026-10-18 : PR 3 vérifiée à l'écran, revue sans point bloquant, CI verte, **mergée (#1482,
  `dc18cb72e`)**. Pas en production. À trancher par David : couleur de 𝒞f dans la vue Géométrie
  (toutes bleues, alors que la carte et le Graphe ont leur couleur).

## K4 — couleur de 𝒞f (2026-10-18)

- Décision de David : 𝒞f prend en Géométrie la couleur de sa carte, comme dans le Graphe.
  Worktree `../ubumaths-wt-atelier-couleur`. Tests d'abord : 5 node (`figure-couleur.test.ts`,
  4 rouges) et 1 navigateur (`FigureView.svelte.test.ts`, rouge : `var(--color-fig-bleu)` au
  lieu de `var(--color-curve-2)`). Fait : `screenColor` peint une `CurveColor` de son jeton ;
  `syncFigure` pose couleur, pointillés et épaisseur de la carte et les repeint par
  `updateStyle` sans reconstruire (`restyled`). `dashdot` → tirets (pas d'équivalent dans la
  figure). Points et courbes par équation inchangés.
- 2026-10-18 : K4 vérifiée à l'écran (clair et sombre), revue « prêt pour PR » (mineurs latents :
  exports TikZ / Typst / SVG ignorent `curve-N` ; pas de test de `restyled` sur une courbe en
  morceaux ni sur f⁻¹), CI verte, **mergée (#1491, `650b71594`)**. Pas en production.
- 2026-10-18 : **PR 4 en pause.** L'agent s'est arrêté avant tout code : 5 tests existants
  (plot-sync, plot-drawable, derivative-everywhere, figure-sync S1) vérifient la substitution
  elle-même et casseraient ; `CurveSettings` calcule pente / aire / courbure / longueur sans
  `parameterBindings` ; une valeur exacte (`1/3`, `√2`) passerait en décimal. Gain non mesuré
  (le curseur reste dans « Mes objets »). Options soumises à David : A mesurer d'abord (reco),
  B faire, C abandonner. Worktree `../ubumaths-wt-grapheur-parametres` gardé, sans commit.
- 2026-10-18 : **PR 4 abandonnée sur mesure** (option A de David : mesurer, abandonner sous 16 ms).
  Chromium, `AtelierContainer` réel sur le Graphe (823 × 617 px), 5 fonctions citant `a` (dont
  tangente + aire, `1/(x−a)`, `sin(a x)`), 40 crans après préchauffe : médiane 10,9 à 12,3 ms,
  p90 11,3 à 13,3 ms, max 14,1 ms ; 1 fonction : ~5,5 ms. Le coût est le rendu du grapheur
  (≈ 10-12 ms : rééchantillonnage, analyse, tangente, aire) ; `slideTo` ≈ 0,5 ms, `syncPlots`
  0,3-0,4 ms (substitution + relecture comprises) : de vrais paramètres n'économiseraient que
  ≈ 0,5 ms, le rendu restant à refaire à chaque valeur. S3 n'est donc pas faite ; la
  substitution complète reste (le commentaire de `wantedFor`, `plot-sync.ts`, qui annonce ce
  changement, est à corriger à la prochaine PR qui touche ce fichier). Worktree retiré.
