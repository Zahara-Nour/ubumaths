# Chantier `triangle-cote-cm` — triangle quelconque coté en cm (outils-manquants n° 29)

> Demande de David du 2026-11-14 (n° 29 de [`outils-manquants.md`](outils-manquants.md)). Aujourd'hui
> `verifier: triangle ABC : AC = 4 cm ; BC = 3 cm` est refusé hors du triangle rectangle
> (`construction-parser.ts`, « une longueur en cm ne sert qu'au triangle rectangle ») ; le lot 12 de
> [`questions-6`](../archive/wip/questions-6-progress.md) § 27 passe par des segments à reporter. Point visé :
> 6-173 (exemples de réussite 6e p. 15 : « trois longueurs (si possible), deux côtés et l'angle compris, un côté
> et ses deux angles adjacents »).

## Reprendre ici

_Mis à jour le 2026-11-14, PR des points de revue de #2660 ouverte._

- **État** : v0.88.0 en prod, modèle 6-173 à jour en prod. PR `fix/triangle-cote-cm-juge` ouverte : (1) un seul C avec un angle, (2) côté sans repère → « trace ses côtés avec le rapporteur » ; (3) sans changement (même geste que S5, admis à la revue de #2348) · **Prochaine action** : CI + revue opus → merge ; puis clore le chantier (versement, archive du journal) · **En attente de David** : `deploy:prod` de la PR (quand il voudra) ; relecture des 2 variations en prod ; confirmer : choix du lot 1 (1), (3), (4) gardés, (5) remplacé par la revue de #2658 ; auteur de l'écriture en prod de 18:52 · **Pièges en cours** : la PR change le juge du lot 7 et du cas en cm avec angle, en prod au prochain déploiement · **Worktree / branche** : `ubumaths-wt-triangle-cote-cm` (`fix/triangle-cote-cm-juge`) ; `ubumaths-wt-triangle-cm-variations` gardé pour le serveur 5176, à retirer après la relecture

## Ce qui existe (lu dans le code, 2026-11-14)

- Triangle quelconque (`judgeTriangle`, `questions/construction/triangle.ts`) : [AB] tracé ; longueurs données
  par un segment de la figure (`AC = u`) ou deux points (`AC = PQ`) ; C doit être au **croisement de deux cercles
  construits** (compas ou Report) ; avec un angle : côté d'angle au rapporteur, et C sur ce côté (cercle construit
  ou deuxième côté d'angle).
- Triangle rectangle coté en cm (PR 4 de [`regle-graduee`](../archive/wip/regle-graduee-progress.md), #2499) :
  règle posée en A **avant** le côté, C sur une graduation (`ruledGraduationOf`) ; plusieurs C → faux (Q17) ;
  côté jugé sur le trait vu (Q18) ; refus d'auteur : côté plus long que la règle.
- Cercle de rayon donné en cm (PR 3, #2494) : règle posée au centre avant le cercle, ouverture du compas aimantée
  aux graduations ; « Ton compas est ouvert à l'œil : ouvre-le sur une graduation de la règle. »
- 1 unité de la figure = 1 cm ([ADR 0036](../adr/0036-le-cm-de-la-figure.md)), papier uni seulement.

## Phase 0 (validée le 2026-11-14)

Le prof écrit, [AB] déjà tracé dans la figure (6 unités = 6 cm, longueur dite dans l'énoncé) :

```
verifier: triangle ABC : AC = 4 cm ; BC = 5 cm          (trois longueurs)
verifier: triangle ABC : CAB = 50 ; AC = 4 cm           (deux côtés et l'angle compris)
```

« Un côté et ses deux angles adjacents » (`CAB = 50 ; ABC = 60`) marche déjà : [AB] tracé, aucune longueur à
prendre. Rien à faire.

**Nominal**

1. **Trois longueurs** : l'élève pose la règle en A, pique le compas en A, l'ouverture s'aimante à la graduation
   de 4 cm, trace l'arc (ou le cercle) ; de même en B à 5 cm ; place C au croisement ; trace [AC] et [BC] →
   « Juste ». Les deux C (de part et d'autre de (AB)) sont justes.
2. **Deux côtés et l'angle compris** : rapporteur en A, repère à 50°, côté d'angle [Ax) ; puis C à 4 cm de A
   sur ce côté, **au choix** : la règle posée en A le long du côté, C sur la graduation (comme le triangle
   rectangle) ; ou l'arc du compas ouvert à 4 cm sur la règle ; trace [AC] et [BC] → « Juste ».
3. Palette : trois longueurs → Segment · Compas · Règle graduée ; avec l'angle → Segment · Rapporteur · Règle
   graduée · Compas. Report refusé (la longueur se prend sur la règle, pas sur la figure).
4. Correction : la règle posée en A (et en B), les arcs de 4 cm et 5 cm (ou le côté d'angle et la graduation),
   [AC] et [BC] ; comme les PR 3 et 4.

**Limite**

- Papier uni seulement (comme toute longueur en cm).
- Une seule règle posée **avant** le cercle (ou le côté) compte, comme les PR 3 et 4 (pas de faux juste « compas
  ouvert jusqu'à un point visible à 4 cm, règle posée après »).
- Les longueurs en cm au millimètre (3,5 cm, 3 cm 5 mm, 35 mm), comme le triangle rectangle.

**Erreur (message à l'élève)**, dans l'ordre :

- côté manquant, C placé à l'œil (messages actuels du triangle) ;
- compas ouvert à l'œil : « Ton compas est ouvert à l'œil : ouvre-le sur une graduation de la règle. » ;
- mauvaise longueur : « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. » (Q7) ;
- angle faux (messages actuels) ;
- plusieurs C distincts (un éventail) → « Trace un seul triangle ABC. » (Q17 de `regle-graduee`) ;
- [AC] prolongé au-delà de C → jugé sur le trait vu (Q18).

**Erreur (message au prof)** : triangle impossible (inégalité triangulaire, message actuel) ; côté plus long
que la règle graduée ; un cercle ou C hors de la fenêtre ; cm sur quadrillage ; cm et segment à reporter mêlés.

**Questions (recommandations en premier)**

1. **[AB] déjà tracé** (reco : comme le triangle rectangle coté, Q11 de `regle-graduee` ; l'énoncé dit
   « AB = 6 cm ») ; ou l'élève trace aussi [AB] à la règle (un assemblage segment + triangle, plus lourd).
2. **Mêler cm et segment à reporter** dans un même triangle (`AC = 4 cm ; BC = u`) : refusé (reco : une seule
   façon de prendre les longueurs par question) ; ou admis.
3. **Deux côtés et l'angle : C sur la graduation OU à l'arc du compas**, les deux justes (reco : c'est ce que font
   les élèves) ; ou la règle seule.
4. **Report refusé** dans la palette dès qu'une longueur est en cm (reco) ; ou laissé.
5. **Modèle 6-173** : après l'outil, ajouter au modèle des variations en cm (trois longueurs, deux côtés et
   l'angle) à côté de celles en segments à reporter (reco : le prof garde les deux, le BO écrit en cm) ; ou
   remplacer les segments ; ou ne pas toucher au modèle (chantier à part).
6. **Un seul lot** (reco : parseur, juge, vue, correction, catalogue, doc ; une PR) ; ou trois longueurs d'abord,
   l'angle ensuite.
7. **Message de mauvaise longueur** : dire la mesure, « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. » (reco :
   comme le segment en cm de la PR 1, l'élève voit de combien il s'est trompé) ; ou garder le message actuel du
   triangle, « Ton côté [AC] n'a pas la bonne longueur. ».

**Tranché (David, 2026-11-14, « je valide » sur les recommandations)** : 1. [AB] déjà tracé ; 2. cm et segment à reporter mêlés → refusé ; 3. C sur la graduation ou à l'arc, les deux justes ; 4. Report retiré dès qu'une longueur est en cm ; 5. modèle 6-173 : variations en cm ajoutées, celles en segments gardées ; 6. un seul lot, une PR ; 7. « Ton côté [AC] mesure 3,8 cm au lieu de 4 cm. ».

## Journal

- 2026-11-14 : worktree ouvert (`feat/triangle-cote-cm`), code relu (parseur, `triangle.ts`, PR 3 et 4 de
  `regle-graduee`), phase 0 écrite.
- 2026-11-14 : **lot unique codé** (branche `feat/triangle-cote-cm`, pas encore de PR). Parseur
  (`construction-parser.ts`) : les cm admis hors du triangle rectangle, papier uni ; cm et segment à
  reporter mêlés → « les longueurs se donnent toutes en cm (à la règle graduée) ou toutes par un segment
  à reporter, pas les deux » ; palette exigée (trois longueurs : segment, compas, règle graduée ; avec
  l'angle : rapporteur, segment, règle graduée, le compas laissé au choix). Palette (`triangleTools`) :
  Segment · Compas · Règle graduée, ou Segment · Rapporteur · Règle graduée · Compas. Juge
  (`triangle.ts`, `judgeRuledTriangle`) : hors palette → faux sans message ; un seul C (Q17) ; côté
  manquant ; C à l'œil ; compas ouvert à l'œil (règle posée au centre AVANT le cercle,
  `compassGraduationOf` exporté de `circle.ts`) ; mauvaise longueur (graduation, ou bout du trait vu,
  Q18) ; angle faux. Avec l'angle, graduation de la règle OU arc du compas, les deux justes. Refactor
  sans changement de comportement : `distinctVertices`, `seenEndOf` (sortis de `judgeRight`),
  `angleFeedbackOf` (sorti de `judgeTriangle`). Correction : `triangleRuler` → `triangleRulers` (règle
  en A et en B, ou en V le long du côté d'angle) ; arcs de 4 et 5 cm pour les trois longueurs, aucun
  avec l'angle. Vue : `rulerShape` suit le Compas choisi quand la palette a aussi le segment (indice
  « Pique le compas au 0 de la règle… », ‹ › sur l'ouverture). Catalogue : deux exemples ; doc
  `questions.md`, `ubumark.md`.
  - **Tests** : `construction-triangle-cm.test.ts` (41 tests, 40 rouges avant le code ; le 41e, refus
    d'un angle non compris, déjà vert : non-régression) + 1 test modifié dans
    `construction-triangle-rectangle-cm.test.ts` (« refuse une longueur en cm sans l'angle droit » →
    « admet ») : **41 rouges** avant le code, verts après ; 2 tests composant dans
    `figure-a-completer-regle.svelte.test.ts` : rouges avant (parseur), et rouges encore sans le
    changement de la vue (indice du compas), verts après. Suites : construction + catalogue + ubumark
    serveur 7 520 verts ; composants figure 98 verts. `check:incremental` 0 erreur, `types:cliquet`
    tenu, `lint:fast` propre.
  - **Choix faits sans David (à confirmer)** : (1) « plusieurs C distincts » est jugé juste après le côté
    manquant, avant tout autre message (comme Q17 du triangle rectangle) : sinon un éventail dont un C
    est juste serait juste, faux juste que Q17 interdit ; la liste de la phase 0 le met plus bas. (2)
    Q18 appliqué aux deux chemins : un côté d'angle tracé en segment plus long que [AC] (puis l'arc)
    compte comme [AC] prolongé → « mesure 6 cm au lieu de 4 cm », comme au triangle rectangle ; sans
    l'outil droite (palette validée), l'élève trace le côté le long de la règle jusqu'à la graduation.
    (3) Trois longueurs, [AC] prolongé : la longueur du trait vu arrondie au mm (aucune règle ne la lit).
    (4) Indice de l'outil Règle quand la palette a aussi le compas : « Règle posée : touche Compas pour
    l'ouvrir sur la règle, ou Segment pour tracer le long de la règle. … » (nouveau texte d'écran).
    (5) Message d'auteur pour une palette incomplète (deux textes nouveaux, voir le parseur).
  - **Non fait** : point 5 (modèle 6-173 en base), à faire après le merge.
- 2026-11-14 : **corrections de revue de #2658** (le BLOQUANT, chemin du compas avec l'angle face à Q18,
  attend David : non touché). (1) CI : `docs/systeme/utilitaires-et-demos.md` décrit la mécanique du
  catalogue, pas ses exemples → `Doc-inchangée:` dans le commit. (2) Vue : règle posée, le bout d'un
  segment va d'abord à un croisement de traits dans le rayon du toucher (hors du départ), avant la
  graduation de la dernière règle ; test composant « règle de B dirigée vers C » rouge (pas juste) puis
  vert. (3) Indice de la Règle posée : « ou Segment pour tracer le long de la règle » seulement avec le
  rapporteur ; test composant rouge puis vert. (4) Avec l'angle, le compas est désormais exigé dans
  `outils:` (palette entière, la plus simple : un cercle tracé est toujours dans la palette ; remplace
  le choix (5) « compas laissé au choix ») ; test parseur rouge puis vert. (5) `objects[i] as
DrawnCircle` remplacé par un cercle porté avec son indice. Suites : serveur 7 521 verts, composants
  figure 100 verts.
- 2026-11-14 : **Tranché après revue, David, 2026-11-14 : option A.** Avec l'angle, Q18 ne s'applique pas
  au côté d'angle (segment construit parti du sommet qui porte le repère) : il peut dépasser C, et C se
  lit sur lui (graduation de la règle posée en A, ou croisement avec l'arc du compas ouvert sur la
  règle). Un [AC] prolongé par un segment tracé à part au-delà de C reste faux ; rien ne change pour
  trois longueurs ni pour le triangle rectangle coté. Code : `judgeRuledTriangle` retire du trait vu
  les côtés d'angle qui dépassent C. Tests rouges puis verts : S1 (`AC = 3 cm`, côté [A, repère] de
  3,15 cm coupé par l'arc), S2 (côté de 6 cm le long de la règle, compas à 40 mm sur elle), S3 (compas
  ouvert sur une règle verticale) ; l'ancien « juste : C à l'arc » (C tiré d'une règle absente) est
  remplacé par S1-S3 ; le test Q18 devient « [AC] tracé à part, prolongé au-delà de C » (segment
  collé en C).
- 2026-11-14 : **suite après #2658** (branche `feat/triangle-cote-cm-suite`, 2e revue, tranché par David
  « je te suis »). (1) Un côté d'angle tracé en segment (construit, parti du sommet, portant le repère)
  tient lieu de [AC] : [BC] seul arrêté dessus ferme le triangle (`joinedVertices` reçoit les côtés
  d'angle, `angleSideSegments`). **L'effet s'étend au lot 7** (angle avec segment à reporter), même
  code, même geste ; C doit toujours y être construit. Pas de faux juste : C à l'œil sur le côté reste
  faux, [BC] qui n'arrive pas sur le côté reste « doivent se rejoindre ». Tests : 4 dans
  `construction-triangle-cm.test.ts` (3 rouges, le 4e, non-régression, déjà vert), 2 dans
  `construction-triangle-angles.test.ts` (rouges), verts après. (2) Doc : « croisement de traits »
  (tout croisement, droites comprises) dans le commentaire de `FigureACompleterView.svelte` et dans
  `questions.md`, comportement inchangé.
- 2026-11-14 : **revue `code-reviewer` (opus) de #2660** : « prêt pour PR », aucun faux juste (32 sondes : lot 7, un côté et deux angles, cm). **Laissés, à trancher plus tard par David** : (1) lot 7 hors cm, un éventail de [BC] dont un seul arrive au bon croisement est juste (déjà avant la PR ; le cas en cm a « Trace un seul triangle ABC. ») ; (2) côté sans repère qui passe par le bout de [BC] → « Tes côtés [AC] et [BC] doivent se rejoindre en C. », message à préciser (« trace ses côtés avec le rapporteur ») ; (3) hors PR : repère de 140° sous (AB), côté tiré à l'opposé du repère → juste (`isAngleSide` teste l'alignement, pas le sens), avant comme après la PR.
- 2026-11-14 : **point 5, variations en cm du modèle 6-173** (worktree `ubumaths-wt-triangle-cm-variations`,
  branche `feat/triangle-cm-variations`). Instantané prod de f06e45e8 (`export-question-templates`, identique
  au JSON du lot 12 : 4 variations, 15 specs), commité avant l'ajout. Script
  `docs/wip/questions/lot-12b-triangle-cm.py` : v5 trois longueurs en cm (`AC = {{l}} cm ; BC = {{m}} cm`,
  l et m de 3 à 6, [AB] = 5 cm), v6 deux côtés et l'angle compris (`CAB = {{a}} ; AC = {{l}} cm`, a de 30 à
  120 sauf 90, l de 3 à 5) ; palette par défaut (exigée par le parseur) ; 11 specs (6 justes, 5 fausses :
  longueurs échangées, compas ouvert à l'œil, C à l'œil, 130° pour 50°, 3,8 cm pour 4 cm) ; description
  du modèle complétée. Lot `triangle-cm-6` ajouté à `update-published-questions.ts`. `question:specs` 26/26,
  1 800 tirages, 1 500 figures ; `sonde-figures` 0 problème ; corpus + sécurité des réponses 88 verts.
  Brouillon d'essai en base locale : d3c2b97d.
- 2026-11-14 : #2661 mergée (CI verte). Écriture en prod : par David, après le `deploy:prod` qui livre le juge en cm.

### 2026-11-14 — déploiement v0.88.0, variations en prod

- `pnpm deploy:prod` lancé sur demande de David : v0.88.0 (39 commits, dont #2658, #2660, #2661). Vercel `Ready`.
- `update-published-questions.ts --lot triangle-cm-6` (simulation) : « identique », 26/26 specs vertes. La base
  contenait déjà les variations (`updated_at` à 18:52, heure de Paris), donc entre le report du déploiement
  (18:47) et la v0.88.0 (19:11). Auteur de l'écriture inconnu. Rien n'a été réécrit.

### 2026-11-14 — points de revue de #2660 (branche `fix/triangle-cote-cm-juge`)

David : « oui » aux recos (choix du lot 1 (1), (3), (4) gardés ; corriger les 3 points).

- (1) Avec un angle (lot 7 et cas en cm), plusieurs C distincts → « Trace un seul triangle ABC. »
  (`judgeTriangle`, comme `judgeRuledTriangle`). Trois longueurs (lot 4) inchangé : juste si un C convient.
- (2) Aucun C commun, avec un angle, et un côté parti d'un sommet passe par le bout de l'autre → « Ton sommet
  C est placé à l'œil : trace ses côtés avec le rapporteur. » au lieu de « doivent se rejoindre »
  (`joinedVertices`).
- (3) **Pas de changement, ma reco était fausse** : l'angle tracé est juste (graduation 140° de l'autre côté,
  trait prolongé au-delà de A). C'est le geste du test S5 (droite prolongée, admis à la revue de #2348), ici en
  segment. Dit à David.
- Tests : 5 dans `construction-triangle-angles.test.ts` (3 rouges avant le code, 2 de non-régression déjà
  verts). Suites `questions` + `ubumark` serveur : 13 035 verts. `question:specs` f06e45e8 et
  14-construire-un-triangle : importables. En prod, seul f06e45e8 a des triangles à angle (requête MCP).
