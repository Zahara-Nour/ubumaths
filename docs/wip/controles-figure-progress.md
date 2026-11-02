---
status: en-cours
---

# Chantier `controles-figure` — nouveaux contrôles de la figure à compléter (symétrique d'abord)

## Reprendre ici

_Mis à jour le 2026-11-02, après #2264._

- **État** : lots 1, 2a, 2b, « point construit exigé » et 3 (médiatrice, milieu sur papier uni, #2264)
  **mergés**, pas encore en prod (`deploy:prod` sur demande de David). Vérifications à l'œil dans
  `verifications-manuelles.md` (#2257, #2264).
- **Prochaine action** : lot **3b, cercle circonscrit** (phase 0 validée, § 11) en cours ; ensuite
  triangle (report de longueur, 4e sommet du parallélogramme), angle, bissectrice.
- **En attente de David** : rien.
- **Pièges en cours** : `perpendiculaire(A, s)` échoue quand A est un bout de s (geometry-core,
  « createTranslatedPoint… must all be distinct ») ; pas de prime dans le langage des figures (§ 6) ;
  `symetrie(P, axe=d)` échoue si P définit d ; l'« Essayer » de l'aide ne rend pas la case jouable ;
  au clavier, droites annoncées « Droite 1, 2… » ; plafond de 20 objets sans message.
- **Worktree / branche** : `../ubumaths-wt-controles-figure`, `feat/controles-figure-cercle`.

---

## 1. Origine et périmètre

La case « figure » (` ```figure-a-completer `, `verifier:`) ne sait vérifier que `droite_par`, `carre`,
`rectangle` (`CONSTRUCTION_CHECK_KINDS`, `src/lib/ubumark/types/construction.ts`) avec deux outils élève,
`droite` et `segment`. Il manque, d'après [outils-manquants.md](outils-manquants.md) § 1 n° 1 et § 2 :

- **symétrique** (transformations, priorité) : axial — CE2-073, CM1-107, CM1-108, CM2-097 (axe vertical,
  horizontal ou diagonale du quadrillage), 6-180 (papier uni aussi) ; central — tracé en 5e ; image par
  translation en 3e (tracé) ;
- angle, triangle, cercle circonscrit, bissectrice, médiatrice, 4e sommet, point isolé :
  6-170, 172, 173, 207, 166 ; 5-131, 132, 068, 133 ; 4-038 ; CM1-167, 168.

Hors chantier : rotation, homothétie (absentes du BO au collège) ; rapporteur (outil n° 4).

## 2. Existant (relevé le 2026-11-02)

- **Contrôles** (`CONSTRUCTION_CHECK_KINDS`, `ubumark/types/construction.ts`) : `droite_par P ; Q`
  (outil `droite`), `carre A ; B` et `rectangle A ; B ; C` (outil `segment`, un seul par figure, jamais
  mêlé à `droite_par`). Un outil par figure (`CHECK_TOOL`).
- **Réponse** (`construction/answer.ts`) : `droite(x1;y1;x2;y2)` / `segment(…)` séparés par `|`, 20 objets
  et 1 000 caractères au plus, Zod. Aucun objet « point » : un point isolé demandera un nouvel outil.
- **Tracé** (`drawing.ts`) : deux touchers = un trait ; aimantation sur les points nommés (24 px) et,
  avec `grille:`, sur les **nœuds** du quadrillage (`snapToGrid`) ; « Effacer » = dernier trait.
- **Juge** (`judge.ts`, `polygon.ts`) : par positions, tout-ou-rien, message de la première vérification
  ratée. `polygon.ts` sait déjà **fusionner** côtés donnés et traits de l'élève par droite porteuse
  (côté en morceaux, trait repassé : sans effet), dire « trait de trop », « trait qui dépasse », « hors
  des lignes du quadrillage » — briques réutilisables pour un symétrique.
- **Correction** : `solutionLines` (bonne figure en pointillés, `FigureAnswer.svelte`) ; `checkTemplate`
  construit la figure à chaque tirage et appelle `assertConstructionChecks` (erreurs d'auteur).
  Évaluation : `verifier: ?` masque les contrôles (`masked`), la case publique ne porte rien.
- **Langage des figures** : `symetrie(axe=d)`, `symetrie(centre=O)`, `symetrie(M, axe=d)` existent
  (`dsl-builtins.md`, `transform-apply.ts`) ; `translation` aussi. Le prof peut donc DESSINER une
  image ; ce qui manque est le CONTRÔLE de l'image tracée par l'élève.
- **Points du BO** : CE2-073 « compléter, sur une feuille quadrillée ou pointée, une figure simple pour la
  rendre symétrique par rapport à un axe donné » ; CM1-107 (compléter, axe H ou V) ; CM1-108 et CM2-097
  (construire le symétrique d'une figure sur quadrillage, axe H, V, puis diagonale au CM2) ; 6-180
  (propriétés de la symétrie axiale pour construire, papier uni compris). Journaux qui les attendent :
  `questions-ce2` l. 100, `questions-cm1` l. 80, `questions-cm2` l. 97, `questions-6` l. 127.

## 3. Phase 0 — lot 1 : symétrique sur quadrillage (validée le 2026-11-02)

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 12 ; 0 ; 8
grille: 1
verifier: symetrique par d
---
d = droite(point(6, 0), point(6, 8))
A = point(2, 2)
B = point(4, 2)
C = point(4, 6)
polygone(A, B, C)
```

`verifier: symetrique par d` : l'élève trace (outil `segment`, déduit) l'image de **tout ce qui est
tracé dans la figure sauf l'axe**. `par O` (un point) = symétrie centrale (5e), même juge.

### Comportements

- **Nominal** : l'image de chaque segment de la figure est couverte par les traits de l'élève, rien de
  plus → juste. Correction : l'image en pointillés sur la figure.
- **Limites** (juste) : un côté de l'image tracé en deux morceaux ; un trait repassé sur la figure de
  départ ou sur l'axe (sans effet) ; « compléter » (CE2-073, CM1-107) : la moitié donnée touche l'axe, ses
  sommets sur l'axe sont leurs propres images ; axe diagonal (CM2-097) : les sommets de l'image restent
  des nœuds, l'aimantation suffit.
- **Erreurs** (faux, message de la première cause, dans cet ordre) :
  1. rien tracé → vide (comme aujourd'hui) ;
  2. un trait qui n'appartient pas à l'image → « Ce trait n'est pas à sa place : ce n'est pas le
     symétrique. » ; si TOUTE la figure tracée est la figure de départ **glissée** (translation, erreur
     classique) → « Ta figure a glissé : le symétrique est retourné de l'autre côté de l'axe. » ;
  3. un morceau de l'image manque → « Il manque une partie du symétrique. » ;
  4. trait qui dépasse de l'image → message existant (« Un de tes traits dépasse… »).
- **Erreurs d'auteur** (refus à la publication, `assertConstructionChecks`) : axe ou centre inconnu ;
  figure sans rien à transformer ; image hors de la fenêtre ; image dont un sommet n'est pas un nœud de
  la grille (l'élève ne pourrait pas l'atteindre).
- **Évaluation** : `verifier: ?` masque déjà le contrôle (rien à faire).

### Questions à David

1. **Ce que l'élève transforme** : tout le tracé sauf l'axe (recommandé : rien à nommer, l'écriture la
   plus simple) ou une liste de sommets (`symetrique A ; B ; C par d`, plus précis si la figure contient
   d'autres traits) ?
2. **Message « ta figure a glissé »** : le garder (erreur fréquente, coût faible) ou s'en tenir au
   message générique ?
3. **Symétrie centrale dans le même lot** (même juge, `par O`) ou plus tard ?
4. **6-180 (papier uni)** : sans quadrillage, l'élève n'atteint l'image qu'avec des instruments (équerre,
   compas) ou un outil « point » — hors du lot 1 (recommandé), à reprendre avec l'outil « point » ?

### Décisions de David (2026-11-02, « je valide » mes recommandations)

1. L'élève transforme **tout le tracé sauf l'axe** (`symetrique par d`) ; forme facultative
   `symetrique A ; B ; C par d` : seulement les traits dont les deux bouts sont parmi ces points.
2. « Ta figure a glissé » **gardé**, seulement quand TOUT ce que l'élève a tracé (hors figure de départ et
   axe) est la figure de départ glissée ; même règle pour l'erreur d'axe oblique (l'élève retourne comme
   si l'axe était vertical ou horizontal) → « L'axe est oblique : … ».
3. **Symétrie centrale dans le lot** (`symetrique par O`, O un point).
4. 6-180 papier uni **hors du lot 1** (outil « point », lot suivant). Translation (3e) plus tard (outil n° 3).

Lots suivants (après celui-ci) : outil « point » et symétrique d'un point, puis angle, triangle,
médiatrice, bissectrice, cercle circonscrit, 4e sommet (§ 1).

## 4. Lot 1 — ce qui est fait (2026-11-02)

- `verifier: symetrique par d` / `par O` / `symetrique A ; B ; C par d` (`symétrique` accentué admis),
  outil segment déduit ; un seul carré, rectangle ou symétrique par figure.
- Juge `construction/symmetry.ts` (fusion par droite porteuse reprise de `polygon.ts`) ; le registre rend
  aussi les traits de la figure (`constructionShapes`, segments et côtés de polygones visibles, objets
  droits nommés pour l'axe).
- Correction : l'image en pointillés, sans ce que la figure de départ trace déjà (`symmetrySolution`).
- Erreurs d'auteur (`assertConstructionChecks`, à chaque tirage) : axe/centre inconnu, rien à
  transformer, pas de `grille:`, image hors fenêtre ou hors nœuds. Décision prise en codant : **sans
  quadrillage, refus** (l'élève ne pourrait pas atteindre l'image : c'est le lot 2).
- Aide à l'écriture : deux exemples (axe vertical, centre) et une erreur (« par » oublié).
- Tests : juge (21), lecture (5), modèle de bout en bout (`check-template-figure`, 2), écran (2).
- Revue Opus (2026-11-02), 5 points corrigés, tests rouges avant / verts après : trait hors liste
  repassé sur la figure (était faux), coût borné par le tracé (figure de 150 côtés : 1,2 s → < 200 ms),
  « glissé » quand la figure glisse sur elle-même, figure déjà symétrique refusée à la publication,
  registre en lecture seule.

## 5. Phase 0 — lot 2 : placer un point, symétrique sur papier uni (proposée le 2026-11-02)

Points : 6-179 (définition du symétrique d'un point), 6-180 (construire, papier uni ajouté au quadrillé
et au pointé). Le même contrôle sert ensuite au 4e sommet, au centre du cercle circonscrit et à
l'intersection (§ 1).

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: point A' = symetrie(A, axe=d)
---
d = droite(point(4, 0), point(7, 8))
A = point(2, 5)
```

À droite du `=` : une expression du langage des figures (`symetrie`, `milieu`, `intersection`…),
calculée à chaque tirage. Plusieurs lignes `point …` dans le même `verifier:` : plusieurs points à placer.

### Comportements

- **Nominal** : l'élève place un point (outil `point`, un toucher, réponse `point(x;y)`) sur l'image de
  A → juste. Le point prend l'étiquette A'. Correction : A' en pointillés, avec [AA'] et son codage.
- **Limites** (juste) : traits de construction en plus (perpendiculaire, arcs de compas) → ignorés ;
  avec `grille:`, le point est aimanté sur les nœuds (pas besoin d'instruments) ; A sur l'axe → A' = A
  (refusé à la publication : rien à placer).
- **Erreurs** (faux, première cause) :
  1. rien placé → vide ;
  2. point à la bonne distance de l'axe, mais [AA'] pas perpendiculaire → « Le segment [AA'] doit être
     perpendiculaire à l'axe. » ;
  3. point sur la perpendiculaire, mais pas à la même distance → « A' doit être à la même distance de
     l'axe que A. » ;
  4. ailleurs → « Ce point n'est pas le symétrique de A. » ;
  5. un point de trop → « Tu as placé un point de trop. » ; un point manque → « Il manque un point. »
- **Erreurs d'auteur** : expression invalide ou qui ne donne pas un point ; point attendu hors de la
  fenêtre ; point attendu déjà présent dans la figure ; avec `grille:`, point attendu hors des nœuds.
- **Évaluation** : `verifier: ?` masque le contrôle (rien à faire).

### Questions à David

1. **Papier uni : comment l'élève atteint-il A' ?**
   (a) **instruments** (recommandé) : outils « équerre » (perpendiculaire à une droite par un point) et
   « compas » (cercle par son centre et un point), le point s'aimante sur les intersections des traits,
   juge exact. Fidèle au cahier ; le compas resservira à la médiatrice, au triangle, au cercle
   circonscrit, à la bissectrice. Le lot grossit (deux outils) ;
   (b) **tolérance** : point posé à l'œil, juste à moins d'une distance fixée — simple, mais juge
   l'estimation, pas la construction (un élève qui devine passe) ;
   (c) **papier pointé seulement** (nœuds aimantés, sans lignes) ; l'uni reporté.
2. **Écriture du contrôle** : expression du langage des figures (`point A' = symetrie(A, axe=d)`,
   recommandé : un seul contrôle pour tous les points à placer) ou un mot dédié (`symetrique A par d`) ?
3. **Plusieurs points à placer** : l'élève ne les nomme pas, jugés comme un ensemble (recommandé :
   chaque point attendu touché, aucun en trop ; étiquettes posées à la correction), ou l'élève choisit
   l'étiquette de chaque point ?
4. **Messages 2 et 3** (perpendiculaire / même distance) : les garder (recommandé, ils disent la
   propriété du BO) ou s'en tenir au message générique ?

### Décisions de David (2026-11-02, « je valide » mes recommandations)

1. Papier uni : **instruments** (équerre = perpendiculaire à une droite par un point ; compas = cercle par
   son centre et un point ; aimantation sur les intersections des traits ; juge exact).
2. Contrôle écrit en **expression du langage des figures** : `verifier: point A' = symetrie(A, axe=d)`.
3. Plusieurs points : **non nommés, jugés comme un ensemble** ; étiquettes posées à la correction.
4. Messages « perpendiculaire » et « même distance » **gardés**.
5. Découpage : **lot 2a** = outil point + contrôle `point …` (quadrillage, nœuds aimantés) ; **lot 2b** =
   équerre, compas, aimantation sur les intersections (papier uni).

## 6. Lot 2a — ce qui est fait (2026-11-02)

- `verifier: point A' = <expression>` (une ligne par point, nom unique, expression ≤ 200 caractères),
  outil `point` déduit (un toucher, réponse `point(x;y)`, aux nœuds sur quadrillage).
- **Le langage des figures n'a pas de prime** (`A' = …` : « Caractere inattendu »). Le nom écrit dans
  `verifier:` n'est donc pas un objet de la figure : il sert à l'étiquette de la correction et aux
  messages. Le registre calcule l'expression sous un nom interne (`zzPointAttendu`), dans une figure à
  part (`expectedPoints`, `constructionExpected`) : jamais affiché, jamais aimanté.
- Juge `construction/point.ts` : ensemble de points, traits ignorés ; messages « perpendiculaire » /
  « même distance » pour `symetrie(A, axe=d)` (axe nommé), générique sinon (centre compris).
- Erreurs d'auteur : expression qui ne se calcule pas ou ne donne pas un point, nom déjà pris, point déjà
  dans la figure (A sur l'axe), sans `grille:`, hors fenêtre, hors nœuds, deux points au même endroit.
- Correction : point en pointillés + nom ; symétrique : [AA'] en pointillés, angle droit (axe) et une
  marque sur chaque moitié.
- **Défaut de geometry-core trouvé, non corrigé** : `symetrie(P, axe=d)` quand `P` définit `d`
  (`d = droite(P, Q)`) → « addNode "reflL_5": duplicate parent IDs are not allowed ». Contourné dans les
  tests (point M de l'axe) ; pour l'auteur, l'erreur sort à la publication.
- Revue Opus (2026-11-02), 3 points corrigés : double toucher sur un nœud = un seul point (était
  « point de trop » avec une seule croix visible) ; avec plusieurs points, le message porte sur la paire
  (point attendu, essai) la plus proche ; point attendu au bout d'un trait sans nom = déjà dans la figure.
- Tests : juge et lecture (`construction-point.test.ts`, 47), modèle (`check-template-figure`, 2), écran
  (`figure-a-completer-point.svelte.test.ts`, 2).

## 7. Phase 0 — lot 2b : instruments sur papier uni (proposée le 2026-11-02)

Points : 6-180 (papier uni), puis 5e (symétrie centrale tracée). Les instruments resserviront à la
médiatrice, au triangle, au cercle circonscrit et à la bissectrice (§ 1).

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: point A' = symetrie(A, axe=d)
---
d = droite(point(4, 0), point(7, 8))
A = point(2, 5)
```

Même contrôle qu'au lot 2a ; **sans `grille:`**, il n'est plus refusé : l'élève reçoit les instruments.

### Les gestes

- **Palette** (plusieurs outils dans une figure : nouveau) : Règle · Équerre · Compas · Point, boutons
  au-dessus de la figure ; un seul outil → pas de palette (comme aujourd'hui). Changer d'outil annule
  un départ en attente.
- **Règle** : comme l'outil droite actuel (deux touchers, droite jusqu'aux bords).
- **Équerre** : 1er toucher **sur une droite** (de la figure ou de l'élève : elle se surligne), 2e
  toucher sur un point → la perpendiculaire à cette droite par ce point, jusqu'aux bords. 1er toucher
  loin de toute droite → rien, et l'écran dit « Touche d'abord une droite. »
- **Compas** : 1er toucher = le centre, 2e = un point du cercle → le cercle entier.
- **Point** : un toucher place un point (comme au lot 2a).
- **Aimantation** (à chaque toucher, dans le rayon de 24 px, dans cet ordre) : point nommé →
  **intersection de deux traits** (droites, segments, cercles, de la figure ou de l'élève) → **sur un
  trait** (le toucher est ramené sur la droite ou le cercle le plus proche) → libre (arrondi au
  centième, comme aujourd'hui). « Sur un trait » sert à piquer le compas n'importe où sur l'axe.
- **Effacer** : le départ en attente, sinon le dernier objet (perpendiculaire et cercle compris).
- **Clavier** : les points nommés ET les intersections sont des boutons (Tab, Entrée) ; avec
  l'équerre, les droites aussi. Pas de toucher libre au clavier (inutile : seuls les points exacts
  comptent).
- **Réponse** : la perpendiculaire s'écrit `droite(…)` (rien de neuf pour le juge) ; le cercle,
  `cercle(cx;cy;px;py)` (nouveau, Zod) ; coordonnées en pleine précision → plafond porté de 1 000 à
  2 000 caractères (20 objets inchangé).

### Comportements

- **Nominal** : perpendiculaire à d par A, compas centré au pied H par A, point à l'autre
  intersection → juste. Autre chemin juste : deux cercles centrés sur l'axe passant par A, point à leur
  seconde intersection.
- **Limites** (juste) : traits de construction en trop ignorés ; point posé sur A' par une autre
  construction exacte.
- **Erreurs** (faux, première cause) : celles du lot 2a, plus, en tête : point posé **hors de toute
  intersection** de traits et loin de A' → « Ton point est placé à l'œil : construis-le avec tes
  instruments. »
- **Erreurs d'auteur** (à la publication) : sans `grille:`, expression autre que `symetrie(…, axe=…)`
  ou `symetrie(…, centre=…)` (les autres attendent les lots suivants) ; axe hors de la fenêtre ; A'
  hors de la fenêtre.
- **Correction** : inchangée (A' en pointillés, [AA'] codé).

### Questions à David

1. **Palette** : déduite (`point` sans `grille:` → Règle, Équerre, Compas, Point ; recommandé) ou
   écrite par le prof (`outils: equerre, compas, point`) ? Dans les deux cas `outils:` peut restreindre.
2. **Aimantation « sur un trait »** (seulement quand il y a des instruments) : la garder (recommandé :
   sans elle, un compas piqué « sur l'axe » est à un centième près, et A' est faux) ?
3. **Message « placé à l'œil »** : le garder (recommandé, il dit ce qu'on attend) ?
4. **Symétrique d'une FIGURE sur papier uni** (`symetrique par d` sans `grille:`, outil segment +
   instruments) : dans ce lot (recommandé : le juge existe, seule l'aimantation change) ou plus tard ?
5. **Report de longueur au compas** (prendre l'écartement AB, piquer ailleurs) : plus tard, avec le
   triangle (recommandé) ?

### Décisions de David (2026-11-02, « je te suis » sur mes recommandations)

1. Palette **déduite** (`point` ou `symetrique` sans `grille:` → Règle, Équerre, Compas, Point —
   Segment en plus pour `symetrique`) ; `outils:` peut la restreindre.
2. Aimantation **sur un trait** gardée (seulement avec des instruments).
3. Message « placé à l'œil » **gardé**.
4. Symétrique d'une **figure** sur papier uni **dans ce lot**.
5. Report de longueur au compas **plus tard** (avec le triangle).

## 8. Lot 2b — ce qui est fait (2026-11-02)

- Outils `equerre` et `compas` (`CONSTRUCTION_TOOLS`) ; plusieurs outils = une palette. Sans `grille:`
  (ou `grille: non`), `point` reçoit Règle · Équerre · Compas · Point, `symetrique` Segment · Règle ·
  Équerre · Compas (`PLAIN_PAPER_TOOLS`) ; `outils:` restreint ; sans quadrillage, une palette sans
  instrument est refusée ; `droite_par` / `carre` / `rectangle` : un seul outil.
- Géométrie pure `construction/instruments.ts` : intersections (droite, demi-droite, segment, cercle),
  aimantation point → intersection → trait → libre, droite la plus proche (équerre), perpendiculaire.
  Pleine précision (jamais arrondi) : une construction exacte arrive exacte au juge.
- Réponse `cercle(cx;cy;x;y)` ; plafond 2 000 caractères (celui de l'envoi). La perpendiculaire s'écrit
  `droite(…)`.
- Traits visibles de la figure (`FigureShapes.traits`, cercles compris) pour l'aimantation et le juge.
- Juge point : « Ton point est placé à l'œil… » si le point n'est ni un point de la figure ni une
  intersection de traits ; sans quadrillage, seulement `symetrie(…, axe=…)` / `symetrie(…, centre=…)`,
  axe dans la fenêtre. Juge symétrique : seuls les segments sont jugés, droites et cercles ignorés.
- Écran : palette (`aria-pressed`), droite choisie surlignée, « Touche d'abord une droite. », cercles,
  clavier (intersections et droites en boutons). Énoncé masqué : la palette écrite en `outils:`.
- Aide à l'écriture : exemple « Construire le symétrique d'un point sur papier uni ».
- Tests : `construction-instruments.test.ts` (42), écran `figure-a-completer-instruments` (3), modèle
  (`check-template-figure`, 2), énoncé masqué (1).
- Non vu à l'œil dans le navigateur : l'« Essayer » de l'aide ne rend pas la case jouable ; à faire dans
  un modèle brouillon (ligne de `verifications-manuelles.md` au merge).
- Revue Opus (2026-11-02), corrigé : intersection construite sur le bord de la fenêtre écartée de
  l'aimantation (filtre strict → `isInFrame`) ; tangence au flottant près rendue en deux points
  (`TANGENT_EPSILON`, test rouge avant / vert après) ; outil de départ = Point aussi dans une évaluation
  (palette `point` en tête) ; axe `visible=faux`, centre invisible ou hors fenêtre refusés sur papier
  uni ; clavier : pas de bouton d'intersection doublant un point nommé, « Touche d'abord une droite. »
  aussi au clavier ; carte de l'éditeur : tous les outils d'une figure de travail. Non corrigé : droites
  annoncées « Droite 1, 2… » au clavier (pas leur nom), plafond de 20 objets atteint sans message.
- **Question ouverte à David (revue, point 2)** : un toucher libre est arrondi au centième ; posé pile
  sur un A' « rond » (ex. (5 ; 2)), il est jugé JUSTE sans construction. Phase 0 : « placé à l'œil » =
  hors intersection ET loin de A'. Gardé tel quel (choix qui ne change rien) en attendant sa réponse ;
  autre choix : exiger un point construit (point nommé ou intersection) même bien placé.

### Décision de David (2026-11-02, « je te suis » sur ma recommandation)

- Sur papier uni, un point **doit être construit** (point de la figure ou intersection de deux traits) :
  posé à l'œil pile sur A' (coordonnées rondes), il est **faux**, « Ton point est placé à l'œil… ».
  Fait dans `judgePoints` (vérifié avant l'appariement) ; quadrillage inchangé (touchers aux nœuds).

## 9. Phase 0 — lot 3 : médiatrice (validée le 2026-11-02)

BO 6e « Médiatrice d'un segment » ; elle ouvre le milieu construit, le cercle circonscrit (6e, 5e) et le
4e sommet.

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: droite m = mediatrice(A, B)
---
A = point(2, 3)
B = point(7, 5)
s = segment(A, B)
```

Nouvelle vérification `droite <nom> = <expression>` (comme `point A' = …`). Palette déduite : Règle ·
Équerre · Compas (`outils:` restreint). `point` accepte aussi `milieu(A, B)` sur papier uni.

### Comportements

- **Nominal** : deux cercles de même rayon centrés en A et B, droite par leurs intersections → juste.
  Autres chemins : deux paires de cercles de rayons différents ; sur quadrillage, droite par deux nœuds.
- **Limites** (juste) : cercles et traits de construction en trop ignorés ; droite repassée.
- **Erreurs** (faux, première cause) : aucune droite → « Trace la médiatrice de [AB]. » ; droite qui ne
  passe pas par deux points construits (papier uni) → « Ta droite est tracée à l'œil : construis-la avec
  tes instruments. » ; perpendiculaire hors du milieu ; par le milieu, pas perpendiculaire ; sinon « Ce
  n'est pas la médiatrice de [AB]. »
- **Erreurs d'auteur** : expression qui n'est pas une droite, droite hors de la fenêtre, A ou B invisible.
- **Correction** : la médiatrice en pointillés, angle droit et moitiés égales codés.

### Décisions de David (2026-11-02, « je suis tes recos »)

1. Plusieurs droites tracées : **juste si l'une est la médiatrice** (les autres = traits de construction).
2. **Équerre gardée** dans la palette (quadrillage : milieu au nœud + équerre).
3. **Milieu construit** (`point I = milieu(A, B)`) **dans ce lot**.
4. **Cercle circonscrit** au **lot 3b** (vérification `cercle` neuve).
5. **4e sommet du parallélogramme** avec le **triangle** (report de longueur au compas).

## 10. Lot 3 — ce qui est fait (2026-11-02, #2264)

- Vérification `droite m = <expression>` (`LineCheck`, `construction/line.ts` : `judgeLines`, `assertLines`) ;
  droites attendues calculées avec les points (`expectedPoints` → `lines`). Une des droites de l'élève
  recouvre la droite attendue, le reste est de construction. Jamais mêlée à une autre vérification ;
  palette limitée à règle, équerre, compas (parseur), avec ou sans quadrillage.
- Papier uni : droite construite = deux extrémités construites, ou le tracé exact de l'équerre (départ
  construit, second point `perpendicularThrough`) ; sinon « Ta droite est tracée à l'œil… ». Seulement
  `mediatrice(A, B)` sans quadrillage ; A, B visibles ; les cercles de rayon AB se coupent dans la fenêtre
  (`mediatriceSupportError`, aussi pour `milieu(A, B)`, désormais accepté sur papier uni).
- Messages de la médiatrice : perpendiculaire hors du milieu, par le milieu pas perpendiculaire, ce n'est
  pas la médiatrice ; (AB) repassée n'est pas prise pour l'essai.
- Écran : sur quadrillage, la droite à construire va aux nœuds avec tous ses outils (l'équerre choisit
  d'abord sa droite, au doigt ou au clavier) ; correction : la droite en pointillés, codage au milieu.
- Aide à l'écriture : exemple « Construire la médiatrice d'un segment ».
- Tests : `construction-line.test.ts` (40), écran `figure-a-completer-mediatrice.svelte.test.ts` (4).
- Revue Opus : 8 findings, tous corrigés (règle et équerre hors des nœuds sur quadrillage, intersections
  hors fenêtre — l'exemple de l'aide l'était —, palette avec point/segment, point de passage invisible,
  règle prise pour l'équerre, (AB) repassée, même droite deux fois).

## 11. Phase 0 — lot 3b : cercle circonscrit (validée le 2026-11-02)

BO 6e « Connaître et construire le cercle circonscrit à un triangle » ; 5e (triangles particuliers) ; 4e
(triangle rectangle : centre au milieu de l'hypoténuse).

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: cercle c = cercle_circonscrit(A, B, C)
---
A = point(3, 4)
B = point(7, 4)
C = point(4, 7)
t = triangle(A, B, C)
```

Nouvelle vérification `cercle <nom> = <expression>` (comme `point`, `droite`). Palette déduite : Règle ·
Équerre · Compas (`outils:` restreint). Réponse inchangée (`cercle(cx;cy;x;y)`).

### Comportements

- **Nominal** : deux médiatrices (compas + règle), compas piqué à leur intersection, passant par un
  sommet → juste. Autres chemins : médiatrice à l'équerre au milieu construit ; triangle rectangle
  (centre = médiatrice ∩ hypoténuse).
- **Limites** (juste) : arcs et droites de construction en trop ignorés ; un des cercles suffit ; passage
  par B ou C plutôt que A.
- **Construit** : centre ET point de passage construits (point de la figure ou intersection de traits).
- **Erreurs** (faux, première cause ; cercle « essai » = celui qui passe par le plus de sommets, à
  égalité le dernier tracé) : aucun cercle → « Trace le cercle circonscrit au triangle ABC. » ; à l'œil →
  « Ton cercle est tracé à l'œil : construis son centre avec tes instruments. » ; bon centre, mauvais
  rayon → « Ton cercle a le bon centre mais ne passe pas par les sommets du triangle. » ; deux sommets
  seulement → « Ton cercle passe par A et B mais pas par C. » ; sinon « Ce n'est pas le cercle
  circonscrit au triangle ABC. »
- **Erreurs d'auteur** : expression qui n'est pas un cercle, sommets alignés, sommet invisible, centre
  hors fenêtre, moins de deux médiatrices constructibles dans la fenêtre, cercle qui sort de la fenêtre.

### Décisions de David (2026-11-02, « je suis tes recos »)

1. **Centre seul** (`point O = centre(cercle_circonscrit(A, B, C))`) **dans ce lot**.
2. **Quadrillage refusé** pour l'instant (erreur d'auteur « ajouter grille: non »).
3. **Cercle entier dans la fenêtre** exigé.
4. **Correction** : cercle et centre en pointillés + médiatrices de deux côtés en traits fins.

_(L'exemple proposé en phase 0, A(2 ; 2), B(8 ; 3), C(4 ; 7), est refusé par la règle « deux médiatrices
constructibles » : remplacé par celui de l'aide, revue du 2026-11-02.)_

## 12. Lot 3b — ce qui est fait (2026-11-02, #2268)

- Vérification `cercle c = cercle_circonscrit(A, B, C)` (`CircleCheck`, `construction/circle.ts` :
  `judgeCircles`, `assertCircles`, `circleSolution`) ; cercles attendus calculés avec les points
  (`expectedPoints` → `circles`, `circleOf` extrait de `figureShapes`). Parseur : quadrillage refusé,
  palette règle · équerre · compas, jamais mêlée. Centre seul : `centre(cercle_circonscrit(…))` accepté
  par `point` sur papier uni (`circumcenterSupportError`).
- Écran : correction = cercle et centre en pointillés, deux médiatrices en traits fins (`bon-cercle`).
  Aide à l'écriture : exemple « Construire le cercle circonscrit à un triangle ».
- Tests : `construction-circle.test.ts` (36), écran `figure-a-completer-cercle.svelte.test.ts` (3).
- Revue Opus : 5 findings. Corrigés : bon centre construit + compas ouvert à la main → « bon centre »
  (l'ancien code disait « construis son centre ») ; le bon cercle ouvert à l'œil pile au rayon → message
  neuf « Ton compas est ouvert à l'œil : ouvre-le jusqu'à un sommet du triangle. » ; centre déjà nommé
  dans la figure = erreur d'auteur ; tests en coordonnées non entières. Gardés : un cercle centré sur un
  sommet n'est jamais l'essai (indiscernable d'un arc de médiatrice) ; règle « deux médiatrices au
  compas de rayon un côté » sévère (refuse des triangles ordinaires dans 0..10 × 0..8) — même règle que
  la médiatrice, à revoir avec le report de longueur (lot triangle).
