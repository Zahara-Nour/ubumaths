---
title: Atelier — la géométrie (v2), journal de progression
date: 2026-10-18
status: lot 1 CLOS ; lot 2 — constructions (#1500), mesures (#1506), styles (#1507), point_sur et intersections (#1509) mergés ; PR 4 (.relever) à faire
---

# Atelier — la géométrie : où en est le chantier

Phase 0 (validée le 2026-10-18) : [atelier-geometrie-phase0.md](atelier-geometrie-phase0.md).
Chapeau : [atelier-progress.md](atelier-progress.md).

## Lot 1 — découpage

| PR  | Contenu                                                                                        | Branche                           | État                   |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------- |
| 1   | Modèle : types `point` et `curve`, lecture, `y` réservé + migration, cartes, sauvegarde / lien | `feat/atelier-geometrie-modele`   | ✅ #1474               |
| 2   | Vue Figure et pont `syncFigure` (curseurs cachés réglés par `moveSlider`, repère)              | `feat/atelier-geometrie-figure`   | ✅ #1478               |
| 3   | 𝒞f dans la vue Géométrie (action de carte), onglet renommé « Géométrie »                       | `feat/atelier-geometrie-courbe-f` | ✅ #1482               |
| 4   | Grapheur à vrais paramètres (Q4 : sa propre PR, en dernier)                                    | —                                 | ❌ abandonnée (mesure) |

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

## Lot 2 — constructions au clavier et mesures

Phase 0 (validée le 2026-10-18) : [atelier-geometrie-lot2-phase0.md](atelier-geometrie-lot2-phase0.md).

| PR  | Contenu                                                                             | Branche                                | État     |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| 1   | Constructions : lecture, calcul exact, dépendances, cartes (contenu), vue Géométrie | `feat/atelier-geometrie-constructions` | en cours |
| 2   | Mesures : `AM`, `distance`, `aire`, `perimetre`, `angle`                            | —                                      | à faire  |
| 3   | `point_sur`, `intersection`                                                         | `feat/atelier-geometrie-point-sur`     | en cours |
| 4   | `.relever`                                                                          | —                                      | à faire  |

### PR 1 — journal

- 2026-10-18 : worktree `../ubumaths-wt-atelier-constructions`. Tests d'abord : 32 node de lecture
  (`construction-lecture.test.ts`, rouges : module absent), 38 node du modèle
  (`construction-modele.test.ts`, 37 rouges), 7 node de projection (`figure-constructions.test.ts`,
  5 rouges), 15 node du DSL (`dsl/__tests__/atelier-ajouts.test.ts`, 10 rouges), 6 navigateur
  (`construction.svelte.test.ts`).
- 2026-10-18 : **lecteur du DSL non réutilisé**, mesuré : il refuse `2a`, `√2`, `a²`,
  `\frac{1}{2}`, `parallèle`, lit `(AB)` comme l'identifiant AB. Lecteur dédié
  (`construction-read.ts`) testé contre le lecteur du DSL sur ses lignes. Implémenté : catalogue
  L3 sauf `intersection` et `point_sur` ; raccourcis ; `;` / `,` ; accents ; refus hors catalogue ;
  calcul exact (`construction.ts`) ; D9, cascade, cycle refusé, type refusé ; tapé seul + « Garder » ;
  cartes (nature, construction écrite, valeur) ; projection `syncFigure` (types de figure existants,
  aucune nouvelle surface) ; DSL : `cercle(O, r)`, `parallele(P, d)`, `perpendiculaire(P, d)`. Pas de
  version d'état nouvelle (la définition suffit).
- **À trancher par David** : (1) ~~`d = (AB)` tapé avant A et B~~ — tranché le 2026-10-18,
  option (a) : le type de A et B tranche (voir ci-dessous) ; (2) le nom d'un cercle
  dans la vue Géométrie est porté par un point sans marque à 45° (aucune surface de
  `geometry-core` n'écrit le nom d'un cercle) ; (3) un rayon ≤ 0 (curseur) met le cercle en erreur ;
  (4) la carte d'une droite ou d'un cercle montre aussi son équation, celle d'une demi-droite
  l'équation de sa droite ; (5) `cercle(O, 3)` tapé seul répond `cercle(O, 3) : x^2+y^2=9`.
- 2026-10-18 : vérification à l'écran (coordinateur) : `\right`, `\text` perdus dans le LaTeX de
  deux réponses (`milieu(A, B)`, `[AB]`) — corrigé, tests rouges puis verts (39c9b02ae).
- 2026-10-18 : revue de code, corrections (tests d'abord : 13 rouges + 4 pour l'option a) — mémo
  des constructions (une fois par passe ; chaîne de 12 niveaux < 200 ms, était 46 s) ; renommage
  des raccourcis écrits en LaTeX ; nom hors forme refusé d'abord ; DSL : argument nommé de trop,
  centre non point, rayon positionnel ≤ 0, `parallele(d, d)` refusés en français ; nom d'un
  cercle en texte de la couleur du cercle (plus de point `r="0"` à l'export ni de survol).
  **Décision de David (option a)** : `(AB)` avant A et B attend ; le type de A et B tranche
  (droite, produit, ou refus si point et valeur), et le suit après coup.
- Noté : `rayon=0` reste accepté par le DSL (`locus.test.ts` s'en sert) ; le refus ≤ 0 ne vaut que
  pour le rayon positionnel et pour l'atelier. Une valeur `(AB)` devenue courbe par
  `#shortcutKinds` échappe au plafond de 50 (cas rare, non traité).
- 2026-10-18 : **lot 2, PR 1 (constructions) mergée (#1500, `c80526b37`)**. Vérifiée à l'écran ;
  revue : 1 bloquant (LaTeX des réponses `\r`/`\t`) + 3 importants (perf exponentielle → mémo,
  renommage en LaTeX, `(AB)` avant A et B → attente, décision de David) corrigés. CI : un test
  navigateur prenait `cercle(A, 2)` (devenu valide) comme exemple d'erreur → `cercle(A, A)`.
  Restent : `cercle(O, rayon=0)` laissé tel quel dans le DSL (un lieu de test en dépend) ; une
  valeur `(AB)` devenue droite après coup n'est pas comptée dans le plafond de 50 (PR 2).
  Pas en production.

### PR 2 — journal (mesures)

- 2026-10-18 : worktree `../ubumaths-wt-atelier-mesures`, branche `feat/atelier-geometrie-mesures`.
  Tests d'abord : 25 node (`mesures.test.ts`, 23 rouges) et 4 navigateur
  (`mesures.svelte.test.ts`, 4 rouges). Implémenté : `AM`, `distance`, `aire`, `perimetre`
  (`périmètre`), `angle` en degrés, exacts (angle non remarquable `≈`, 4 décimales) ; mesure
  nommée = valeur sans curseur, qui suit ses points (curseurs compris), D9, cascade ; mesure dans
  une fonction (`f(x) = AE*x`) ; carte : la valeur. Corrigé : une valeur `(AB)` devenue droite
  compte dans le plafond de 50.
- **À trancher par David** : (1) `angle` n'est PAS ajouté au DSL : `angle(A, V, B)` y existe déjà
  et DESSINE l'angle (objet) ; lui faire rendre des degrés changerait son sens — la mesure en
  degrés y est `mesure(A, V, B, unite="deg")` ; (2) « Garder » une ligne de mesure garde le NOMBRE
  (`sqrt(5)`), pas la mesure qui suit ses points ; (3) un angle non remarquable est arrondi à
  4 décimales, y compris quand il entre dans un calcul ; (4) une courbe (`d : y = AM x`) ne lit
  pas les mesures (refus P9) ; (5) une mesure citée par un point (`P = (AM ; 0)`) suit dans la
  figure en la reconstruisant, pas par un curseur.
- 2026-10-18 : revue de la PR 2, corrections (tests d'abord : 14 rouges sur 15,
  `mesures-revue.test.ts`) — renommage des `AM` (texte, LaTeX) ; valeur approchée jamais en fraction
  (`2T`, `g(1)`, `J`), pleine précision avant l'affichage ; mesures dans les constructions et les
  coordonnées, `A = (AM ; 0)` refusé ; `distance(A, milieu(B, C))` ; polygone dégénéré refusé ;
  valeur non finie refusée. `angle` non touché (question à David).
- 2026-10-18 : décisions de David — `angle` rend une grandeur (°, rad) selon un nouveau réglage
  « Angles » (degrés par défaut, rangé dans ce navigateur, pas dans l'état : `persistence.ts`
  inchangé) ; « Garder » une mesure garde la mesure ; `distance(N, [AB])`, `distance(N, [AB))`
  et un segment ou une demi-droite nommés sont refusés avec l'aide `distance(N, (AB))`. La ligne
  de la carte d'une mesure passe dans `ValueCard` (lot 4a de la refonte). Tests d'abord
  (`mesures-angle.test.ts`, 4 de revue et 1 navigateur) ; attentes changées par la décision : `90`
  → `90 °`, `≈ 36,8699` → `≈ 36,8699 °`, `g(x) = angle(…)·x` désormais refusée, `J = angle(…) + 0`
  écrit `+ 0[°]`. **À trancher** : une fonction qui cite un angle est refusée (même `cos(angle(…))·x`).
- 2026-10-18 : revue de la 2ᵉ passe (angle grandeur), corrections — tests d'abord
  (`mesures-angle-revue.test.ts`, 27 rouges ; 2 navigateur) : angle exact nommé en radians lu par
  l'ARBRE (plus par le texte), carte = réponse de Calcul, `W = T + 1` en erreur, refus d'un angle
  BRUT seulement dans une fonction, grille, `π` lisible, `vrai`/`faux`, puissance d'un angle
  refusée (choix prudent), aide de `distance` avec le premier argument écrit, ligne de la carte
  alignée, `\operatorname{aire}` dans le champ. Corrigé au passage : `expandDerivatives`
  (`engine.ts`) copiait la Map d'unité d'une grandeur en `{}`.
- 2026-10-19 : revue du moteur lu par l'arbre (aucune régression hors géométrie sur 120 saisies) —
  corrigé, tests d'abord (4 rouges) : un angle mesuré pris par un sin, cos, tan devient un NOMBRE de
  radians dans l'arbre d'un objet (`angle-radians.ts`, `engine.substitutedTree`) : `g(x) = cos(R)·x`
  avec R = 90° donne g(1) = 0, `.variations g` constante, dans les deux réglages ; la carte d'une
  mesure recopie le mode de la console (`Atelier.calcMode`, posé par le pupitre) ; la puissance
  d'un angle se juge sur l'arbre. **Limite laissée** (celle de main, pour la PR `60°`) :
  `cos(90[°])` tapé à la main dans une fonction n'est pas évalué. **Coût noté** : une carte de
  mesure relance `runInput` à chaque révision (~1,7 ms par carte en node).

### Styles des points et des courbes — journal

- 2026-10-19 : **la vue Géométrie lit les réglages des points et des courbes** (lot 4b de la
  refonte, #1504). `syncFigure` : couleur, taille (3 / 5 / 7 px), nom masqué d'un point ;
  couleur, trait, épaisseur d'une courbe (équations et constructions) ; nom d'un cercle de la
  couleur du cercle. `restyled` sans reconstruire, comme K4. `labelHidden` des points lu par
  `GeometryCanvas` et les exports SVG / TikZ (il ne l'était que par Typst et le bloc figure).
  Effet de bord voulu : un point `etiquette="aucune"` du DSL perd enfin son nom dans
  `GeometryCanvas` (il ne le perdait qu'en Typst et dans le bloc figure). Les autres types
  (droites, segments, cercles) ignorent toujours `labelHidden` à l'écran — sans usage aujourd'hui.
- 2026-10-19, revue : le premier réglage d'un point ou d'une courbe partait d'une couleur libre
  du grapheur (`getNextSlot`) — régler la taille seule repeignait le point en `curve-1`. Il part
  désormais de ce qui est dessiné : `color` devient facultative dans `PointDisplay` /
  `StrokeDisplay` (absente = couleur de la figure), un réglage sans effet n'enregistre rien, et
  le point de couleur de la carte montre la couleur peinte (`figureDefaultColor`). Tests ajoutés :
  réglage qui disparaît → `rebuilt`, exports SVG / TikZ d'un point DSL `etiquette="aucune"`
  (rond et croix).
- 2026-10-19 : **mesures mergées (#1506, `ae1c91ea8`)** puis **styles mergés (#1507, `3b52afeb1`)**,
  CI verte, branches et worktrees retirés. Pas en production. Restent au lot 2 : PR 3
  (`point_sur`, intersections), PR 4 (`.relever`), petite PR `60°` / `60^\circ` (corrige aussi
  `cos(90[°])` dans une fonction). Choix prudents livrés dans #1506, à confirmer par David : angle
  brut dans une fonction refusé ; puissance d'un angle refusée.

### PR 3 — journal (`point_sur`, intersections)

- 2026-10-19 : worktree `../ubumaths-wt-atelier-point-sur`, branche `feat/atelier-geometrie-point-sur`.
  Tests d'abord : 81 node (`point-sur-intersections.test.ts`, `figure-point-sur.test.ts`,
  `geometry-core/geometry/__tests__/intersect-lq-exact.test.ts`, 81 rouges) et 6 navigateur
  (`point-sur.svelte.test.ts`, 6 rouges).
- 2026-10-19 : implémenté — `intersection(a ; b ; k)` (droite, segment, demi-droite, cercle,
  courbe par équation : droite, y = f(x), conique ; fonction de l'atelier) et
  `point_sur(objet ; position)` (segment, droite, demi-droite, cercle, fonction), calcul pur dans
  `construction-intersect.ts`, exact d'abord (`intersectLL/LC/CC`, `intersectLQExact` ajoutée à
  `geometry-core` — même formule et même ordre qu'`intersectLQ` —, `exactZeros` pour y = f(x)),
  sinon « ≈ » 4 décimales ; numérotation `k` de geometry-core ; attente (`pending` sans
  `missing`) quand rien ne se coupe, propagée (`usableObject`, mesures, `#geometryWaits`) ; refus à
  la saisie : plusieurs points sans k, infinité, couple non pris en charge ; curseur de position
  lu sur la définition (`positionSliderOf`, `slidePosition`), `ValueSlider` réutilisé dans
  `FigureCard` (seule retouche : le curseur sous la ligne) ; vue Géométrie : intersections à
  curseur par `createScalarExpression` (calcul de l'atelier), position = curseur caché, sans
  reconstruire. `persistence.ts` inchangé. Tous les tests verts (60 + 12 + 10 node, 6 navigateur).
- **À trancher par David** : (1) l'angle d'un `point_sur` sur un cercle suit le réglage « Angles »
  (demandé), mais ce réglage est rangé dans le NAVIGATEUR, pas dans l'état : un lien
  `point_sur(c ; 90)` ouvert chez quelqu'un réglé en radians place M à 90 rad — reco : degrés
  toujours (comme le DSL), ou ranger l'unité dans l'état ; (2) une position hors du segment
  (`point_sur(s ; 1,5)`) met M en attente au lieu de le ramener au bord (le DSL le ramène) ;
  (3) bornes du curseur de position : [0 ; 10] sur une demi-droite, [−10 ; 10] sur une droite ou
  une fonction, non réglables (pas de champ rangé) ; (4) `point_sur(s)` sans position n'a pas de
  curseur ; (5) sans `k`, le seul point commun AUX PORTIONS est pris (un segment qui coupe un
  cercle une fois n'exige pas k) ; (6) les intersections d'une courbe y = f(x) sans racine exacte
  sont cherchées dans [−10 ; 10] (fenêtre du DSL).
- Écarts code ↔ DSL documentés dans `atelier.md` (segment coupé comme sa droite et position
  ramenée au bord dans le DSL ; exact d'abord dans l'atelier ; `point_sur` d'une conique refusé).
- 2026-10-19 : revue de la PR 3, corrections (tests d'abord : 10 rouges) — la vue Géométrie
  dessine EXACTEMENT le point de la carte (une seule méthode : valeurs des curseurs substituées,
  `intersectionPoint` exact, racines hors de [−10 ; 10] comprises) ; `point_sur` sur un cercle en
  DEGRÉS toujours (L5, comme le DSL ; curseur [0 ; 360] ; l'À trancher (1) ci-dessus tombe) ;
  racine exacte en fraction (`√2/2`, `\dfrac`) ; deux cercles devenus égaux au glisser :
  attente, pas erreur ; `1/3` glissé réécrit `0,33` ; une position en LaTeX n'a pas de curseur ;
  casts retirés ; le refus « Sépare les arguments… » cite le nombre de l'élève (`0,3`, message
  commun de `construction-read.ts`).
- 2026-10-19 : **PR 3 (point_sur, intersections) mergée (#1509, `05b2a1aba`)**. Revue : 1 bloquant
  (figure ≠ carte pour une racine hors de [−10 ; 10] avec un curseur → un seul calcul exact des deux
  côtés) et 2 importants (angle d'un `point_sur` sur un cercle : degrés toujours, comme L5 ; racine
  fractionnaire mal écrite) corrigés. Mesuré dans Chromium : ~3 ms par cran (p90 ~5 ms) avec six
  intersections exactes sur un même curseur. Pas en production.

### PR 4 — journal (`.relever`)

- 2026-10-19 : worktree `../ubumaths-wt-atelier-relever`, branche `feat/atelier-geometrie-relever`.
  Tests d'abord : `relever.test.ts` (28 tests, 26 rouges ; les 2 verts ne testaient que
  l'absence d'effet d'une commande inconnue). Puis 2 rouges de plus pendant l'implémentation :
  l'atelier n'était PAS rendu tel qu'il était (`$state.snapshot` rend, hors navigateur, le
  tableau lui-même) → copie du tableau dans `Atelier.sweep`.
- 2026-10-19 : implémenté — `survey.ts` (lecture `E1 ; E2 quand t va de a à b pas h`, pas exacts
  en rationnels, ce qui varie : valeur à curseur ou `point_sur` à position écrite, cases à
  10 chiffres significatifs, ligne vide dans les deux listes pour un pas sans valeur), branché
  avec les commandes de données (`SIMULATIONS`, avant la substitution des noms) ;
  `Atelier.sweep` (chaque pas par `update`, puis le tableau d'avant remis) ; catalogue, aide
  (nouvelle rubrique « Géométrie : relever des mesures »), décor d'exemple `point:` / `value:`
  (`stageExampleSetup`). Hors `COMMAND_KEYWORDS` / `COMMAND_LABELS` : ils servent la lecture du
  moteur, que `.relever` n'emprunte pas (comme `.tabuler`). `persistence.ts` inchangé.
- **À trancher par David** : (1) **noms des listes** : deux noms libres automatiques (L et L_1
  dans le problème de l'aire, M et N étant des points), annoncés dans la ligne, la colonne titrée
  par l'expression (« AM », « S ») — ou un mot-clé `dans X ; Y` ? (2) **le pas est obligatoire**
  (pas de pas par défaut, contrairement à `.tabuler f`) ; (3) un angle relevé dans l'unité du
  réglage, sans l'unité dans la case ; (4) **un rectangle aplati** (M en A ou en B) : `aire`
  refuse (« deux sommets confondus », PR 2), donc les lignes AM = 0 et AM = 4 restent vides —
  une aire nulle serait plus naturelle pour le nuage ; (5) le nuage est **proposé** par une
  phrase (« Trace le nuage : sur la carte L, « Nuage avec L_1 ». »), comme `.simuler` propose la
  suite — pas un bouton sur la ligne de Calcul.
- 2026-10-19, revue de la PR 4 (tests d'abord : 9 rouges, puis 2 navigateur prouvés rouges sans
  la remise du tableau) — cases : calcul EXACT d'abord puis décimal (`sin(πt)` → `0`, `√2² − 2` →
  `0`, plus de `0,00000000000000012246` ni de `-0`), puis un résidu sous 10⁻¹² fois la taille des
  termes du calcul (ou du plus grand nombre de la colonne) écrit 0 (`sin(t)² + cos(t)² − 1` → 0 ;
  `10^(-t)` garde 1e-20, écrit en toutes lettres) ; unité d'un angle retirée avant le calcul
  exact (sinon radians) ; valeur ⩾ 10¹⁵ dite « trop grande pour une case », pas « sans valeur » ;
  titres posés HORS de l'historique de la grille (`setTitle(…, { recorded: false })`) : un relevé
  n'est pas un geste annulable de Données, comme une liste créée dans Calcul ; titres posés
  seulement une fois les deux listes créées ; « 1 ligne » ; mots-clés insensibles à la casse ;
  `quand 2 va de…` → « « 2 » n'est pas un nom ».
- 2026-10-19, **mesure dans Chromium** (vitest navigateur, test temporaire retiré), 200 pas
  (`.relever AM ; S quand M va de 0 à 0,995 pas 0,005`), 3 essais : figure de l'aire (8 objets
  après le relevé) **1,6 à 1,9 s** ; figure fournie (24 objets : milieux, cercle, deux
  intersections, une perpendiculaire, périmètre, angle, `k = MC + AM`, `h = f(AM)`) **19 à 23 s**.
  Le coût est le recalcul de l'atelier à chaque pas (`update` → `recomputeAll` : 1,4-1,6 s et
  18,8-19,1 s pour le balayage seul, lectures exclues), soit ~8 ms puis ~95 ms par pas — le même
  que chaque cran du curseur de position de M sur cette figure. Pas d'optimisation sûre et
  évidente côté `.relever` ; à traiter dans `recomputeAll` (dette « jamais mesuré » d'`atelier.md`).
- 2026-10-19, **décisions de David sur `.relever`** (phase 0 du lot 2, « Décisions de David du
  2026-10-19 »), tests d'abord (12 rouges) : (1) `dans X ; Y` facultatif nomme les deux listes,
  noms validés comme tout nom (pris, réservé, invalide, deux fois le même : refus), exemple ajouté
  à l'aide et rejoué (décor partagé `AREA_PROBLEM_SETUP`) ; (2) pas manquant : le refus récrit la
  commande avec un pas d'un dixième de l'étendue ; (3) unité d'un angle dans le titre de la
  colonne (« angle(I, O, M) (°) », « T (rad) ») ; (4) **polygone aplati d'aire 0** : `measures.ts`
  ne refuse plus que le polygone croisé (`isCrossed`), le périmètre d'un aplati se calcule ; le
  problème de l'aire a 21 lignes pleines (S = 0 en AM = 0 et AM = 4). Tests de la PR 2 changés :
  `mesures-revue.test.ts`, « revue 6 » (sommet répété refusé → aire 0 ou 6 ; côtés qui se touchent
  refusés → aire 6 ; ajoutés : trois sommets alignés, périmètre d'un aplati, mesure devenue plate
  au glisser) ; (5) phrase du nuage inchangée.
- 2026-10-19, **main fusionné** (chantier performance #1513) : conflits de doc seulement
  (`atelier.md` carte du code, ce journal), les deux côtés gardés ; `sweep` inchangé. Tests :
  l'atelier rendu tel quel après un relevé et après une exception, mesures relues identiques
  (`AM`, `S`, `N`, `f(t)` — rien ne reste des mémos du dernier pas), `recalcul-equivalence` vert.
  **Re-mesure dans Chromium**, 200 pas, 3 essais : figure de l'aire **116 à 141 ms** (avant :
  1,6 à 1,9 s) ; figure de 24 objets (`fixtures/figure-24.ts`, `.relever L ; S quand a va de 0 à
0,995 pas 0,005`) **861 à 901 ms** (avant, sur une figure voisine : 19 à 23 s). Sous la seconde.

## Performance

Un cran de curseur, branche `perf/atelier-recalcul` (2026-10-19). Constat d'une autre session : ~95 ms par cran sur une figure de 24 objets (≈ 10 images/s).

**Banc** : la figure `FIGURE_24` (`src/lib/atelier/__tests__/fixtures/figure-24.ts` : 6 points,
2 milieux + 1 milieu mobile, un cercle, une droite, une perpendiculaire, 3 intersections, un
`point_sur(s ; a)`, mesures `aire`, `AM`, `angle` ×2, `perimetre`, un point isolé `N = (b ; 1)`).
Curseur `a` réglé sur [0 ; 1] au pas de 0,01, 5 crans de chauffe puis 40 crans (0,30 → 0,69).
Décor : Mac mini M6, 24 Go ; node (vitest `server`, Svelte compilé côté serveur : pas de proxy
`$state`) et Chromium (vitest navigateur, mode développement : proxies et contrôles de dev,
`AtelierContainer` entier sur la vue Géométrie ; « total » = `slideTo` + `flushSync()` + mise en
page forcée). Médiane / p90 / max.

### Profil AVANT (main 9053fd1c6)

| Mesure                                         | Médiane | p90     | max     |
| ---------------------------------------------- | ------- | ------- | ------- |
| node : `slideTo` (= `update` → `recomputeAll`) | 36,3 ms | 37,3 ms | 47,7 ms |
| Chromium : `slideTo` seul (modèle)             | 129 ms  | 138 ms  | 139 ms  |
| Chromium : total (modèle + effets + rendu)     | 193 ms  | 203 ms  | 204 ms  |

Par étape de `recomputeAll` (moyenne par cran, node / Chromium) : `#constructions` 27,0 / 94,5 ms ;
`#measures` 8,6 / 29,7 ms ; lecture des définitions 0,2 / 0,6 ms ; grille, réciproques, suites,
points fixes : < 0,1 ms chacun. Soupçon (b) (`#recomputeGrid`) écarté : 0,01 ms.

Profil CPU (node, inspecteur) : 94 % du temps sous `bindingsOf` (`engine.ts`) — chaque
coordonnée citée par une construction (`substitutedTextOf`) relit les 24 définitions
(`definitionAst` → `parseByProvenance`) : O(n²) lectures par passe, et `#constructions` fait une
2ᵉ passe quand une intersection attend (F). Un tiers du temps dans le constructeur de
`ParseException` (les définitions de construction ne se lisent pas en calcul : chaque essai jette).
Chromium : 4× node sur le modèle — les proxies du `$state` profond de `items`.

Effets et cartes après le modèle (Chromium ≈ 64 ms ; simulés en node) : `followsOf` 7,9 ms
(O(n²) appels à `dependents`, chacun relit toutes les définitions), `syncFigure` 1,4 ms, cartes de
mesure (`valueAnswerOf`) 1,3 ms pour les 5, le reste < 0,3 ms.

### Optimisations, une par une (re-mesurées dans le même décor)

| Pas | Changement                                                | node `slideTo` (médiane) | Chromium total (médiane) |
| --- | --------------------------------------------------------- | ------------------------ | ------------------------ |
| 0   | main 9053fd1c6                                            | 36,3 ms                  | 193 ms                   |
| 1   | mémo des lectures (`parseByProvenance`, pur, gelé en dev) | 9,3 ms                   | 92 ms                    |
| 2   | `expandDerivatives` sans copie quand rien à développer    | 8,2 ms                   | —                        |
| 3   | aucune liaison pour un arbre qui ne nomme rien (`0`)      | 5,5 ms                   | —                        |
| 4   | liaisons limitées aux noms cités, de proche en proche     | 3,0 ms                   | 43 ms                    |
| 5   | `followsOf` par `citedNames` + mémo de `#refsOf`          | 3,0 ms                   | 12,6 ms                  |

Essayé puis retiré : `items` en `$state.raw` (Chromium : modèle 43 → 8 ms au pas 1). Retiré parce
que `serialize.svelte.test.ts` asserte que l'état vivant est un proxy (« N'EST PAS clonable ») :
une attente à changer, donc une décision. Inutile après le pas 5 (modèle Chromium 5 ms).

Un seul écart trouvé par le test d'équivalence (40 graines × 40 gestes, raccourcis éteints contre
allumés) : t = [BC] réduit à un point, M = point_sur(t ; a) cité par des mesures — le message de M
était le motif de t (« points confondus ») quand une mesure avait calculé M en passant, « Dépend
de « t », qui est en erreur. » sinon. Corrigé à la source (`#constructions` vide ses mémos dès
qu'un statut change) : le message est désormais toujours le second, celui d'une figure sans mesure.

### APRÈS (même banc, même décor)

| Mesure                                            | Médiane | p90                                  | max      |
| ------------------------------------------------- | ------- | ------------------------------------ | -------- |
| node : `slideTo`                                  | 3,1 ms  | 3,8 ms                               | 4,5 ms   |
| Chromium : `slideTo` seul (modèle)                | 5,0 ms  | 5,6 ms                               | 8,1 ms   |
| Chromium : total (modèle + effets + mise en page) | 12,6 ms | 13,4 ms (17,4 sur un passage bruité) | 16–20 ms |

Ce qui reste (Chromium, ~7,5 ms hors modèle) : les effets et le rendu de 24 cartes (dont 5
`valueAnswerOf`, 0,8 ms en node) et `syncFigure` (0,6 ms en node) ; non profilé plus finement.
La peinture du SVG n'est pas comptée. Le banc est en mode développement : la production a moins
de contrôles. Définitions liées par cran : 5 808 → 3.
