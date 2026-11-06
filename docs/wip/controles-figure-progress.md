---
status: en-cours
---

# Chantier `controles-figure` — nouveaux contrôles de la figure à compléter (symétrique d'abord)

## Reprendre ici

_Mis à jour le 2026-11-06, PR « côtés de la bissectrice » (§ 28) en cours._

- **État** : lots 1 à 9 mergés (#2430, #2439). Décisions du § 28 prises ; la garde M5 est codée sur
  `feat/controles-figure-cotes-bissectrice`.
- **Prochaine action** : CI verte → merger ; puis reste éventuel d'`outils-manquants.md` § 1, ou
  versement du chantier (durable → `docs/systeme/`, journal archivé).
- **En attente de David** : rien.
- **Pièges en cours** : le Compas ne garde pas son écartement : deux cercles égaux à rayon libre =
  Report seulement ; tester avec de vrais touchers (`addTap`, écran) ; commitlint : sujet en
  minuscule, lignes du corps ≤ 100 caractères ; garde « doc à jour » : relancer après `git fetch`.
- **Worktree / branche** : `ubumaths-wt-controles-figure`, `feat/controles-figure-cotes-bissectrice`.

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

## 13. Phase 0 — lot 4 : triangle et 4e sommet (proposée le 2026-11-03, à valider)

BO 6e « Construire des triangles » (« à l'aide du compas, l'élève remarque que la donnée de trois longueurs
ne permet pas toujours de construire un triangle ») ; 5e « Construire des parallélogrammes ». Points 6-173,
5-131, 5-132, 5-068, 5-133. Angle donné (rapporteur) : hors lot (outil n° 4).

### Le geste neuf : report de longueur

- **Report** (bouton de la palette, à côté du Compas) : 1er et 2e touchers = prendre l'écartement entre
  deux points construits (montré en trait fin, rien dans la réponse) ; chaque toucher suivant = un cercle
  centré là, de ce rayon. Changer d'outil ou « Effacer » sans cercle = lâcher l'écartement.
- **Réponse** : `report(cx;cy;ax;ay;bx;by)` (centre, puis les deux points de l'écartement), Zod. Le juge
  le traite comme un cercle ; il est construit si le centre ET les deux points de l'écartement le sont.
  (Un `cercle(…)` ne suffit pas : un rayon rond pris à l'œil passerait pour un report.)
- **Aimantation** : les extrémités des segments de la figure deviennent des points (même anonymes), pour
  prendre l'écartement d'une longueur donnée.

### Écriture par le prof — triangle

```figure-a-completer
fenetre: 0 ; 12 ; 0 ; 9
verifier: triangle ABC : AC = u ; BC = v
---
A = point(2, 2)
B = point(8, 2)
s = segment(A, B)
u = segment(point(1, 8), point(5, 8), etiquette="4 cm")
v = segment(point(7, 8), point(10, 8), etiquette="3 cm")
```

Nouvelle vérification `triangle ABC : AC = <long.> ; BC = <long.>` ; une longueur = un segment nommé de la
figure ou deux points visibles (`AC = AB` : isocèle ; `AC = AB ; BC = AB` : équilatéral). Palette déduite :
Segment · Compas · Report · Règle. L'élève trace [AC] et [BC] au segment ; C = leur extrémité commune.

### Comportements — triangle

- **Nominal** : report de u centré en A, de v centré en B, segments de A et de B jusqu'à une intersection
  → juste. Équilatéral : compas de rayon AB en A et en B, sans report.
- **Limites** (juste) : C de l'un OU l'autre côté de (AB) ; cercles et traits en trop ignorés ; côté
  repassé.
- **Erreurs** (faux, première cause) : aucun segment → « Trace les côtés [AC] et [BC] du triangle. » ;
  un seul → « Il manque le côté [BC]. » ; les deux côtés ne se rejoignent pas → « Tes côtés [AC] et [BC]
  doivent se rejoindre en C. » ; C hors de toute intersection → « Ton sommet C est placé à l'œil :
  construis-le avec ton compas. » ; côté de mauvaise longueur → « Ton côté [AC] n'a pas la bonne
  longueur. »
- **Erreurs d'auteur** : longueurs impossibles (inégalité triangulaire : « ces trois longueurs ne font
  pas un triangle »), les deux C possibles hors de la fenêtre, segment de longueur inconnu ou invisible,
  A ou B invisible, quadrillage (refusé, comme le cercle circonscrit).
- **Correction** : côtés [AC] et [BC] en pointillés, les deux arcs de report en traits fins, longueurs
  codées.

### Écriture par le prof — 4e sommet

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: point D = sommet(parallelogramme(A, B, C), 4)
---
A = point(2, 2)
B = point(7, 2)
C = point(8, 6)
p = polyligne(A, B, C)
```

Vérification `point` existante ; sur papier uni, elle accepte aussi `sommet(parallelogramme(A, B, C), 4)`.
Palette inchangée (Règle · Équerre · Compas · Report · Point).

### Comportements — 4e sommet

- **Nominal** : report de BC centré en A, de AB centré en C, point à l'intersection → juste. Autres
  chemins justes : par les diagonales (milieu de [AC] construit, compas centré au milieu passant par B,
  droite (BI)) ; par les parallèles (équerre deux fois).
- **Erreurs** : celles du point (lot 2b), plus, en tête : point à l'autre intersection des deux reports
  → « Avec ce point, ABCD est croisé : prends l'autre intersection. »
- **Erreurs d'auteur** : D hors de la fenêtre ; A, B ou C invisible ; une construction par report qui
  sort de la fenêtre.
- **Correction** : D et les côtés [CD], [DA] en pointillés, côtés opposés codés.

### Questions à David

1. **Longueurs données** : segments de la figure à reporter au compas (recommandé : c'est le geste du
   BO, et aucun outil neuf de mesure) ; ou nombres en cm avec une **règle graduée** (outil neuf, plus
   tard, avec le rapporteur) ?
2. **Geste** : bouton **Report** à part (recommandé : le Compas ne change pas) ; ou compas à trois
   touchers (écartement, puis centre) ?
3. **Côtés tracés exigés** (recommandé : c'est un triangle à construire) ; ou seul le sommet C placé
   (outil Point) ?
4. **Côté de C** : les deux justes (recommandé) ; ou le prof peut imposer le côté (`C au-dessus de (AB)`) ?
5. **Règle sévère des médiatrices** (§ 12) : la laisser telle quelle dans ce lot (recommandé : la
   relâcher par le report demande sa propre phase 0) ?

Reste ouverte depuis le lot 3b : le message « Ton compas est ouvert à l'œil : ouvre-le jusqu'à un sommet
du triangle. » (ajouté après la revue, sans phase 0).

### Décisions de David (2026-11-03, « je valide » mes recommandations)

1. Longueurs = **segments de la figure à reporter** au compas ; règle graduée plus tard (avec le rapporteur).
2. Bouton **Report** à part ; le Compas ne change pas.
3. **Côtés [AC] et [BC] tracés exigés** ; C = leur extrémité commune, construite.
4. **Les deux côtés de (AB) justes** ; pas de côté imposé.
5. Règle sévère des médiatrices **laissée telle quelle** dans ce lot (sa propre phase 0 plus tard).
6. Message du lot 3b « Ton compas est ouvert à l'œil : ouvre-le jusqu'à un sommet du triangle. »
   **gardé**.

## 14. Lot 4 — ce qui est fait (2026-11-03)

- Geste **Report** (`report`, `CONSTRUCTION_TOOLS`) : deux touchers = l'écartement (`Drawing.span`,
  trait fin `ecartement`), chaque toucher suivant = un cercle ; reprendre Report ou changer d'outil le
  lâche, « Effacer » sans cercle aussi. Réponse `report(cx;cy;ax;ay;bx;by)` (Zod). Consigne visible :
  « Touche les deux bouts de la longueur à reporter. » puis « Touche où piquer le compas. Pour une autre
  longueur, touche Report. » (ajout hors phase 0 : sans elle, rien ne dit comment changer de longueur).
- Aimantation : bouts des segments de la figure (même anonymes) et **bouts des segments de l'élève**
  (ajout : sans lui, deux côtés finis au même toucher libre ne se rejoignaient pas — test d'écran
  instable, 1 échec sur 3).
- Vérification `triangle ABC : AC = u ; BC = v` (`construction/triangle.ts`) : C = bout commun de [AC]
  et [BC], intersection de deux cercles construits (compas ou report sur des points de la figure).
  Messages et erreurs d'auteur du § 13. Générateur : A, B et les longueurs nommés, pas C.
- 4e sommet : `point D = sommet(parallelogramme(A, B, C), 4)` accepté sur papier uni ; message « ABCD
  est croisé » à l'autre intersection des reports ; palette de `point` + Report.
- Correction du triangle : côtés en pointillés, arcs de report fins, longueurs codées
  (`solutionTriangle`). Aide à l'écriture : deux exemples (testés : ils se construisent).
- Tests : `construction-triangle.test.ts`, `construction-parallelogramme.test.ts`, Report dans
  `construction-drawing.test.ts`, écran `figure-a-completer-triangle.svelte.test.ts` (3).
- Revue Opus (2026-11-03), 7 findings. Corrigés : report à l'écartement pris à l'œil compté comme
  construit pour le 4e sommet (un report n'est un trait que si centre ET écartement sont construits) ;
  symétrique avec `report` dans `outils:` jugé « faux » sans message (le report y est un trait de
  construction) ; bouts de segments avant les intersections dans l'aimantation (désormais au même
  rang, le plus proche l'emporte : `SnapTargets.ends`) ; losange, B pris pour « l'autre intersection »
  (« croisé ») ; A ou B hors de la fenêtre non refusé (erreur d'auteur) ; correction du 4e sommet du
  § 13 non livrée (D, [CD], [DA] en pointillés, côtés opposés codés) ; égalité dans le choix du C de la
  correction (le plus haut). Non corrigé (règle du lot 2b, question à David) : sur papier uni, un
  point à l'intersection de deux droites tracées à l'œil est « construit » — D aux coordonnées rondes
  se forge avec deux droites libres. [AB] non tracé dans la figure : pas exigé (absent du § 13).

### Décision de David (2026-11-03, « je te suis » sur ma recommandation)

- Sur papier uni, **tout point** (lots 2b à 4) ne compte comme construit que s'il est un point de la
  figure ou l'intersection de deux traits **eux-mêmes construits** ; deux droites tracées à l'œil ne
  construisent plus rien. Dans une PR à part.

## 15. Point construit, de proche en proche (2026-11-03)

Phase 0 validée par David le 2026-11-03 (« ok »), deux exceptions tranchées en cours de route
(« Deux exceptions », sur ma recommandation, quand 4 tests anciens ont cassé).

- **Règle** (`constructionOf`, `instruments.ts`, une seule fonction pour les points, droites,
  cercles et le sommet du triangle ; remplace `isConstructed`, `isConstructedLine`,
  `constructedParts`, l'ancien `constructedCircles`) : points de départ = points de la figure et bouts
  de ses segments ; un trait de l'élève est construit s'il tient sur des points construits (droite :
  deux bouts, ou équerre le long d'un trait droit construit ; cercle : centre et point de passage ;
  report : centre et écartement) ; un point est construit s'il est de départ ou l'intersection de deux
  traits construits ; on recommence jusqu'à ce que rien ne s'ajoute (l'ordre des tracés ne compte pas,
  rien ne se justifie par soi-même).
- **Exception 1 (symétrique, lot 2b)** : un cercle piqué SUR un trait construit (n'importe où sur
  l'axe) et passant par un point construit est construit. Sans elle, un axe sans point visible dans
  la fenêtre rendait le symétrique impossible.
- **Exception 3 (parallèle « à la 6e », revue Opus, tranchée par David)** : une droite à l'équerre le
  long d'un trait droit construit, partie d'un point posé SUR ce trait (perpendiculaire en un point
  quelconque d'un côté), est construite ; partie d'un point d'un autre trait, non. L'exception 1 est
  réservée aux traits droits (compas piqué sur un cercle construit : rien), tranché au même moment.
- **Exception 2 (médiatrice à écartement quelconque, lot 3)** : deux cercles (compas ou report) de
  même rayon, même pris à l'œil, centrés sur deux points construits, construisent leurs deux
  intersections, sans devenir des traits (leurs autres intersections ne comptent pas).
- **Ce qui change pour l'élève** : deux droites à l'œil ne construisent plus rien (le D forgé de la
  revue du lot 4) ; un compas piqué sur un toucher libre hors de tout trait non plus. Deux tests du
  lot 2b passent de « même distance » / « perpendiculaire » à « placé à l'œil » (leurs traits étaient
  libres) ; ces messages restent testés sur quadrillage.
- **Tests** : `construction-point-construit.test.ts` (16, vérifiés rouges sans le correctif, sauf le
  test de garde de l'équerre), 389 tests de construction et 47 tests d'écran verts.
- **Revue Opus** (2026-11-03) : 3 findings, tous traités (parallèle à la 6e → exception 3 ; compas sur
  un cercle → traits droits seulement ; en-tête du test). Simulations de bout en bout (symétriques,
  milieu, médiatrice, parallélogramme) toutes justes.

## 16. Phase 0 — lot 5 : angle de mesure donnée, au rapporteur (validée le 2026-11-03)

BO 6e « Mesurer un angle » (6-169), « Construire un angle de mesure donnée » (6-170) ; outil n° 4 de
[outils-manquants.md](outils-manquants.md). Le CM2 n'utilise pas le rapporteur (BO CM2 grandeurs) : 6e
d'abord. Existant : le dessin du rapporteur (`constructions-v2/instruments/components/Protractor.svelte`,
deux échelles, rayon `PROTRACTOR_RADIUS`) et sa chorégraphie (`bissectrice @mesure`) ; aucun geste élève.

### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: angle AOy = 50
---
O = point(2, 2)
A = point(8, 3)
x = demidroite(O, A)
```

Nouvelle vérification `angle AOy = <mesure>` : O = le sommet, A = un point du côté donné (deux points de la
figure), y = le nom du côté à tracer (lettre libre, pour les messages : « [Oy) ») ; mesure en degrés,
entière, de 1 à 179 (`{{a}}` d'une variable du modèle, comme le reste du bloc). Papier uni seulement.
Palette déduite : Rapporteur · Segment.

### Le geste neuf : rapporteur

- **Poser** : 1er toucher = le centre (aimanté comme le compas), 2e toucher = un point du côté, ou
  n'importe où sur un trait droit qui part du centre → le rapporteur apparaît, sa base le long de ce
  côté, le 0 sur lui, le corps du côté trigonométrique. Un bouton **Retourner** le passe de l'autre côté.
- **Viser** : toucher près du bord → un **repère** (petit trait, comme au crayon) à la graduation entière
  la plus proche. Deux boutons ‹ 1° › le décalent d'un degré (1° au bord du rapporteur ≈ 3 px : trop fin
  pour un doigt). Le repère se lit sur l'une ou l'autre échelle : rien ne dit « 50 » à l'élève.
- **Tracer** : le Segment, du centre au repère (le repère est un point aimanté). Le rapporteur reste posé
  jusqu'au changement d'outil ; « Effacer » = le dernier repère, puis le rapporteur.
- **Clavier** : centre et côté parmi les boutons de points ; puis flèches = ±1°, Maj+flèches = ±10°,
  Entrée pose le repère.
- **Réponse** : `repere(vx;vy;ax;ay;deg;sens)` (centre, point de la base, graduation 0..180, côté ±1),
  Zod ; c'est un point construit si le centre et le point de la base le sont (§ 15).

### Comportements

- **Nominal** : rapporteur centré en O, base sur [OA), repère à 50 sur la bonne échelle, segment de O au
  repère → juste.
- **Limites** (juste) : le côté [Oy) d'un côté ou de l'autre de (OA) ; traits et repères en trop ignorés ;
  un côté construit autrement à la mesure exacte (60° d'un triangle équilatéral au compas). _Note du
  codage : sans compas dans la palette, ce dernier chemin n'existe pas ; un point de la figure à la
  bonne mesure, lui, est juste._
- **Erreurs** (faux, première cause) : aucun segment partant de O → « Trace le côté [Oy) de l'angle,
  depuis le sommet O. » ; segment dont le bout n'est ni un repère ni un point construit → « Ton côté est
  tracé à l'œil : place un repère avec le rapporteur. » ; angle de 180 − 50 → « Ton angle mesure 130° au
  lieu de 50° : tu as lu la mauvaise graduation du rapporteur. » ; autre mesure → « Ton angle mesure 45°
  au lieu de 50°. »
- **Erreurs d'auteur** : mesure non entière ou hors 1..179 ; O ou A invisible ou confondus ; quadrillage
  (refusé) ; aucun des deux côtés possibles n'a la place d'un segment d'au moins 2 unités dans la fenêtre.
- **Correction** : [Oy) en pointillés, l'arc de l'angle codé « 50° ».

### Questions à David

1. **Côté tracé** au **Segment** (recommandé : rien de neuf, le juge lit la direction O → l'autre bout) ;
   ou un outil **Demi-droite** neuf (fidèle à la notation [Oy)) ?
2. **Viser le degré** : toucher, puis boutons ‹ 1° › (recommandé) ; ou glisser le doigt le long du bord
   avec une loupe ?
3. **Côté du rapporteur** : bouton **Retourner** (recommandé) ; ou le corps se pose du côté où l'élève
   touche ensuite ?
4. **Message « mauvaise graduation »** pour 180 − a : le garder (recommandé : c'est l'erreur type) ?
5. **Mesurer un angle (6-169)** : lot suivant, avec le même geste et une réponse en degrés (recommandé) ;
   ou dans ce lot ? Le triangle donné par un côté et deux angles (5e) viendrait après.

### Décisions de David (2026-11-03, « je suis tes recos »)

1. Côté tracé au **Segment** (pas d'outil Demi-droite).
2. Viser : toucher le bord, puis boutons **‹ 1° ›** (flèches au clavier).
3. Bouton **Retourner** pour passer le rapporteur de l'autre côté.
4. Message « mauvaise graduation » pour 180 − a **gardé**.
5. Mesurer un angle (6-169) au **lot suivant**, même geste ; triangle par un côté et deux angles après.

## 17. Lot 5 — ce qui est fait (2026-11-03)

- Outil `rapporteur` (`CONSTRUCTION_TOOLS`, `INSTRUMENT_TOOLS`) ; vérification `angle AOy = 50`
  (`AngleCheck`, parseur : mesure entière 1..179, `°` admis ; seule dans la figure, palette Rapporteur ·
  Segment, papier uni ; le rapporteur refusé dans toute autre vérification).
- Réponse `repere(vx;vy;ax;ay;r;deg;sens)` (Zod : graduation entière 0..180, sens ±1, r > 0) ; position
  `repereAt` ; un repère est un point construit quand son centre l'est et sa base aussi, ou posée sur un
  trait droit construit qui passe par le centre (`isBuiltMark`, dans `constructionOf`).
- Juge `construction/angle.ts` : messages et erreurs d'auteur du § 16 ; un repère dans une case qui
  n'est pas un angle = faux sans message (réponse forgée : il construirait n'importe quel point).
- Geste (`drawing.ts`) : `Drawing.protractor`, `markDegree` (degré entier le plus proche, rien de
  l'autre côté de la base), `flipProtractor`, `nudgeMark` (‹ › : le dernier repère de la même pose,
  retourné ou non ; sans repère, en pose un), « Effacer » = ses repères puis lui, changer d'outil le lève.
- Écran : dessin du rapporteur de `constructions-v2` (140 unités SVG, au plus 0,45 de la fenêtre),
  repères en petits traits, boutons ‹ 1° › et Retourner, consignes, « Touche du côté des graduations, ou
  touche Retourner. » (ajout : sinon un toucher sous la base ne faisait rien, en silence) ; clavier :
  rapporteur `role="slider"`, flèches ±1°, Maj ±10° (Entrée inutile : les flèches posent le repère) ;
  repères en boutons pour le segment. Correction : [Oy) en pointillés, arc codé « 50° ».
- Revue Opus (2026-11-03), 5 findings. Corrigés : un repère n'est plus un point construit (sa distance
  au centre est libre : un rapporteur piqué en A, r = AO, forgeait un isocèle à 50° en O) ; il ne vaut
  que pour un côté tiré depuis son propre centre O (`isBuiltMark`, `judgeAngle`) ; après Retourner,
  ‹ › posent un repère du nouveau côté (au lieu de décaler l'ancien) ; test d'un côté [OA) oblique.
  Ouverts (question à David) : rapporteur coupé par le bord de la figure quand O en est près, et côté
  admis par l'auteur (2 unités de place) dont le repère tombe hors de la fenêtre ; retourné, le 0 sur
  [OA) est celui de l'échelle intérieure, graduée de 10 en 10 seulement (l'extérieure y lit 180 − a).
- Aide à l'écriture : exemple « Construire un angle de mesure donnée (rapporteur) ».
- Tests : `construction-angle.test.ts` (37), écran `figure-a-completer-angle.svelte.test.ts` (4) ; trois
  anciens tests prenaient « rapporteur » comme outil inconnu (→ « crayon »).

## 18. Rapporteur près du bord (2026-11-03)

### Décisions de David (2026-11-03, « je valide » mes recommandations)

1. Rayon du rapporteur **fixé** à 0,35 du plus petit côté de la fenêtre (le même à l'écran et au refus).
2. **Refus à la publication** si le demi-rapporteur posé en O ne tient entier dans la fenêtre ni d'un
   côté de (OA) ni de l'autre : « le rapporteur posé en O sort de la figure… ». Remplace la marge de
   2 unités (point 4 de la revue du lot 5 : le repère est toujours dans la fenêtre).
3. Exemple de l'aide déplacé (O en (4 ; 3)).
4. Échelle intérieure graduée de 10 en 10 **laissée telle quelle** (lire l'autre échelle est la
   difficulté du rapporteur) ; traits au degré plus tard si les élèves bloquent.

### Ce qui est fait

- `protractorRadiusOf`, `protractorFits` (`angle.ts`) : un côté [Oy) possible = un côté où le
  demi-rapporteur tient (la barre sous la base peut dépasser) ; `ANGLE_SIDE_ROOM` retiré. L'écran
  prend le même rayon (`radiusFor`).
- Tests : décor déplacé (O(4 ; 3), A(10 ; 3)) ; refus des deux côtés (vérifié rouge avant), tenue d'un
  seul côté (publiable, correction de ce côté). Capture : rapporteur entier dans la figure, retourné ou non.
- Revue Opus (#2305) : rien de bloquant (`protractorFits` comparé à un échantillonnage de l'arc sur
  200 000 cas : aucun désaccord ; le refus ne touche que la publication, jamais un verdict). Corrigé
  (M2) : un côté juste tracé du côté où le rapporteur ne tient pas garde sa correction de ce côté-là.
  Ouvert (M1, question à David) : fenêtre très allongée sur un petit écran → rapporteur minuscule
  (0,35 de 4 unités sur 320 px ≈ 22 px de rayon), graduations illisibles.

## 19. Phase 0 — lot 6 : mesurer un angle (proposée le 2026-11-03, à valider)

BO 6e « Mesurer un angle » (6-169). Le geste existe (lot 5, § 16) : poser le rapporteur, le retourner.
Ce qui est neuf : l'angle est **donné** (ses deux côtés tracés) et la réponse est **une mesure en degrés**.
Existant relevé : la figure de travail (```figure-de-travail) accepte n'importe quel outil, rapporteur
compris, et rien n'y est noté ; une case ordinaire `[_]` ne sait pas donner de message ciblé (feedback
`correct` / `incorrect` seulement) ; le langage des figures a `rotation(A, angle=50, centre=O)`.

### Écriture par le prof (recommandée : la mesure dans la case figure)

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: mesure AOB
---
O = point(4, 3)
A = point(9, 3)
B = rotation(A, angle={{a}}, centre=O)
x = demidroite(O, A)
y = demidroite(O, B)
```

Nouvelle vérification `mesure AOB` : O le sommet, A et B un point de chaque côté (trois points de la
figure). La réponse attendue est **calculée sur la figure** : l'auteur ne l'écrit pas, elle ne peut pas
la contredire. Palette déduite : Rapporteur seul. Sous la figure, une case « AOB = [ ] ° » (entier, clavier
numérique). Les poses du rapporteur et les repères ne sont pas notés. Papier uni seulement.

### Comportements

- **Nominal** : l'élève pose le rapporteur en O, lit 50, tape 50 → juste.
- **Limites** (juste) : « 50° » ou « 50 » ; angle obtus (130) ; rapporteur jamais posé (rien ne le
  distingue d'une lecture faite ailleurs, et rien ne l'exige) ; rapporteur posé sur [OB) au lieu de [OA).
- **Erreurs** (faux) : 130 au lieu de 50 → « L'angle mesure 50°, pas 130° : tu as lu la mauvaise
  graduation du rapporteur. » ; autre mesure → « L'angle mesure 50°, pas 45°. » ; case vide → « Valider »
  bloqué comme toute case vide ; nombre non entier → refusé à la saisie (« au degré près »).
- **Erreurs d'auteur** : mesure de AOB non entière (à 0,01° près) → « l'angle AOB mesure 47,3° : placer B
  avec rotation(A, angle=…, centre=O) » ; angle nul ou plat ; O, A ou B invisible ou confondus ; pas de
  trait de la figure le long de [OA) ou de [OB) ; un côté qui s'arrête avant le bord du rapporteur (rien à
  lire) ; le demi-rapporteur posé en O ne tient dans la fenêtre ni sur [OA) côté B, ni sur [OB) côté A
  (règle du § 18) ; quadrillage.
- **Correction** : l'arc de l'angle codé « 50° » (comme au lot 5).

### Questions à David

1. **Où taper la mesure** : dans la case figure, mesure calculée sur la figure, message « mauvaise
   graduation », erreurs d'auteur (recommandé) ; ou une figure de travail avec le rapporteur + une case
   `[_]°` ordinaire (presque rien à coder, mais la réponse est écrite à la main par l'auteur, sans message
   ciblé ni contrôle que le rapporteur tient dans la figure) ?
2. **Tolérance** : mesure exacte (recommandé : la figure est construite au degré et le geste vise au degré) ;
   ou ± 1° comme sur papier ?
3. **Message « mauvaise graduation »** pour 180 − a : le garder, comme au lot 5 (recommandé) ?
4. **Variante « rapporteur déjà posé »** (lire seulement, sans geste) : plus tard si besoin (recommandé) ;
   ou dans ce lot ?

### Décisions de David (2026-11-03, « je suis tes recos »)

1. La mesure se tape **dans la case figure** (`verifier: mesure AOB`), mesure calculée sur la figure.
2. Mesure **exacte**.
3. Message « mauvaise graduation » pour 180 − a **gardé**.
4. Variante « rapporteur déjà posé » : **plus tard**, si besoin.
5. M1 du § 18 : fenêtre **refusée** à la publication pour un angle (construire ou mesurer) quand son
   rapport largeur / hauteur dépasse 2.

## 20. Lot 6 — ce qui est fait (2026-11-03)

- Vérification `mesure AOB` (`MeasureCheck`, parseur : trois points, sommet au milieu ; seule dans la
  figure, le rapporteur seul, papier uni ; le rapporteur admis pour `angle` et `mesure`).
- Réponse : les repères puis `mesure(50)` en dernier (`splitMeasuredAnswer`, `serializeMeasuredAnswer`) ;
  hors d'une case `mesure`, `mesure(…)` est illisible (faux).
- Juge `construction/measure.ts` : mesure calculée sur la figure, exacte ; messages du § 19 ; repères
  seuls sans mesure tapée → « Tape la mesure de l'angle AOB, en degrés. » (Valider n'est bloqué que
  sur une réponse vide). Erreurs d'auteur du § 19 ; côtés lus dans les traits de la figure (segment,
  demi-droite, droite) jusqu'au rayon du rapporteur.
- M1 : `protractorWindowError` (rapport > 2 refusé) pour `angle` et `mesure`.
- Écran : case « Mesure de l'angle AOB : [ ] ° » sous la figure (chiffres seulement, 3 au plus ;
  désactivée après Valider et dans la copie) ; consigne « Lis la mesure sur le rapporteur, puis
  tape-la sous la figure. » ; correction : l'arc codé.
- Énoncé masqué d'une évaluation : `verifier: mesure AOB` laissé tel quel (rien à cacher, l'écran en
  tire la case) ; la garde `findUnmaskedAnswers` l'admet.
- Aide à l'écriture : exemple « Mesurer un angle (rapporteur) » ; liste `verifier:` et `outils:` complétée.
- Tests : `construction-measure.test.ts` (24), écran `figure-a-completer-mesure.svelte.test.ts` (4),
  masquage (2), M1 au lot 5 (1) ; vérifiés rouges en cassant chaque règle (le juge a été écrit avant ses
  tests : preuve rouge faite après coup, par mutation).
- Revue Opus (#2327), 6 findings. Corrigés : A et B visibles et dans la fenêtre (la case nomme
  l'angle) ; « 50,5 » garde 50 et dit « Au degré près : tape un nombre entier. » ; test de la pose sur
  [OB) seule (vérifié rouge en inversant le signe) ; un segment qui ne fait que toucher O = « n'est pas
  tracé ». Vérifié : aucun modèle en prod n'a `verifier: angle` ni `mesure` (pas de régression M1).
  Ouvert puis tranché : l'énoncé masqué gardait `B = rotation(A, angle={{a}}, …)`, la réponse en
  clair dans la source envoyée pendant une évaluation.

### Décision de David (2026-11-03, « je te suis » sur ma recommandation)

Énoncé masqué d'un angle à mesurer : chaque point nommé défini par un calcul est réécrit en
coordonnées (`maskMeasureFigure` ; `visible=faux` gardé, autres réglages d'affichage perdus en
évaluation) ; une `rotation(` ou un `angle=` restés dans la figure → la garde refuse l'envoi. Reste
admis : recalculer l'angle depuis les coordonnées. Fait, tests vérifiés rouges sans la réécriture
et sans la garde.

## 21. Phase 0 — lot 7 : triangle par un côté et deux angles (proposée le 2026-11-03, à valider)

BO 5e « Construire des triangles à partir de données partielles » (5-059). Décidé au § 16 (décision 5).
Existant : le rapporteur et ses repères (lot 5) ; le triangle de trois longueurs (lot 4,
`triangle ABC : AC = u ; BC = v`, C = bout commun de [AC] et [BC], construit). Ce qui manque : un
repère n'est pas un point construit (revue du lot 5) et le côté d'angle du lot 5 n'est qu'un segment
de O au repère, trop court pour rejoindre l'autre côté. Il faut donc pouvoir **prolonger** un côté
d'angle.

### Écriture par le prof (recommandée : la vérification `triangle` du lot 4, élargie)

```figure-a-completer
fenetre: 0 ; 12 ; 0 ; 8
verifier: triangle ABC : CAB = {{a}} ; ABC = {{b}}
---
A = point(2, 2)
B = point(9, 2)
s = segment(A, B)
```

Une donnée à trois lettres est un angle en degrés (entier, de 1 à 179), le sommet au milieu, et ce sommet
est A ou B ; à deux lettres, une longueur comme au lot 4. Palette déduite : Rapporteur · Règle · Segment.

### Le geste (rien de neuf à l'écran)

Rapporteur posé en A, base sur [AB), repère à 40 ; **Règle** de A au repère → la droite, qui va jusqu'au
bord ; idem en B ; puis les côtés [AC] et [BC] au Segment, C aimanté à l'intersection des deux droites.
Règle neuve dans `constructionOf` : **un trait droit qui passe par le centre d'un rapporteur et par un
repère construit de ce rapporteur est construit** (un « côté d'angle ») ; C, intersection de deux côtés
d'angle, est donc construit. Le repère seul ne construit toujours rien.

### Comportements

- **Nominal** : 40° en A, 65° en B, du même côté de (AB), droites, côtés → juste.
- **Limites** (juste) : C d'un côté ou de l'autre de (AB) (comme au lot 4) ; rapporteur retourné ;
  côté [AC] tracé au Segment directement de A à C, à travers le repère, sans la Règle ; traits et repères
  en trop ignorés.
- **Erreurs** (faux, première cause) : celles du lot 4 (« Trace les côtés [AC] et [BC] du triangle. »,
  « Il manque le côté [BC]. », « Tes côtés … doivent se rejoindre en C. ») ; C pas construit → « Ton
  sommet C est placé à l'œil : trace ses côtés avec le rapporteur. » ; angles tracés de part et d'autre
  de (AB) → « Tes deux angles sont tracés de part et d'autre de [AB] : trace-les du même côté. » (sans ce
  message, l'élève lirait « ton angle ABC mesure 115° ») ; 180 − a → « Ton angle CAB mesure 140° au lieu
  de 40° : tu as lu la mauvaise graduation du rapporteur. » ; autre mesure → « Ton angle CAB mesure 45°
  au lieu de 40°. »
- **Erreurs d'auteur** : angle non entier ou hors 1..179 ; somme des deux angles ≥ 180 (« ces deux
  angles ne font pas un triangle ») ; sommet de l'angle autre que A ou B ; A ou B invisible, confondus,
  hors de la fenêtre ; les deux C possibles hors de la fenêtre ; le rapporteur ne tient ni en A ni en B
  d'un même côté de (AB) (règle du § 18) ; fenêtre de rapport > 2 (§ 19, décision 5) ; quadrillage.
- **Correction** : [AC] et [BC] en pointillés, les deux arcs codés « 40° » et « 65° ».

### Questions à David

1. **Écriture** : la vérification `triangle` élargie, angles à trois lettres (recommandé : une seule
   vérification pour tous les triangles) ; ou une vérification à part ?
2. **Prolonger le côté d'angle** : Règle par A et le repère, puis les côtés au Segment (recommandé :
   c'est le geste du cahier, et la Règle existe) ; ou un outil **Demi-droite** neuf ; ou un Segment de A
   prolongé au-delà du repère, sans Règle ?
3. **Message « de part et d'autre de [AB] »** pour deux angles de côtés opposés : le garder (recommandé) ?
4. **Deux côtés et l'angle compris** (`AC = u ; CAB = 40`) : dans ce lot (recommandé : même vérification,
   aucun geste neuf, Report + Rapporteur + Règle + Segment) ; ou au lot suivant ?
5. **Angle non adjacent au côté** (côté [AB], angles en A et en C : calcul du 3e angle d'abord) : hors
   lot (recommandé : c'est un calcul, 5e « somme des angles », puis le même geste) ?

### Décisions de David (2026-11-03, « je suis tes recos »)

1. La vérification **`triangle` élargie** : une donnée à trois lettres est un angle (sommet A ou B).
2. Côté d'angle prolongé à la **Règle** (par le centre du rapporteur et un repère), puis côtés au
   Segment ; pas d'outil Demi-droite.
3. Message « de part et d'autre de [AB] » **gardé**.
4. **Deux côtés et l'angle compris** (`AC = u ; CAB = 40`) **dans ce lot**.
5. Angle non adjacent au côté : **hors lot**.

## 22. Lot 7 — ce qui est fait (2026-11-03)

- Vérification `triangle` élargie (`TriangleCheck` : `lengths` et `angles`, deux données en tout) :
  `CAB = 40 ; ABC = 65` (un côté et deux angles), `AC = u ; CAB = 40` (deux côtés et l'angle compris) ;
  `BAC` admis pour `CAB`, `°` permis. Parseur : angle de sommet A ou B seulement, mesure entière 1..179,
  somme < 180, un angle en A et un en B, angle compris au bout du côté donné.
- Palette (`triangleTools`) : Rapporteur · Règle · Segment, plus Report et Compas avec une longueur ;
  le rapporteur admis dans ce triangle (et lui seul hors angle / mesure) ; palette sans rapporteur,
  règle ou segment refusée.
- Règle neuve (`constructionOf`, `isAngleSide`) : un trait droit qui part du centre d'un repère
  construit et passe par ce repère est construit (« côté d'angle ») ; le repère seul ne construit
  toujours rien.
- Juge (`triangle.ts`) : avec un angle, C = croisement de deux traits construits ; messages du § 21
  (« placé à l'œil : trace ses côtés avec le rapporteur », « de part et d'autre de [AB] », mauvaise
  graduation si le repère est du côté de C, sinon la mesure lue). Le côté de chaque repère est lu sur
  le repère qui porte [VC). Trois longueurs : inchangé (cercles construits).
- Erreurs d'auteur : fenêtre de rapport > 2 ; rapporteur qui ne tient ni d'un côté ni de l'autre (le
  message nomme le sommet où il ne tient d'aucun côté) ; les deux C hors de la fenêtre ; A et B
  confondus.
- Correction : côtés en pointillés (du côté où le rapporteur tient quand l'élève n'a rien tracé),
  arcs de report pour les longueurs, angles codés (`TriangleCorrection.angles`, dessinés comme au
  lot 5).
- Aide à l'écriture : deux exemples (un côté et deux angles ; deux côtés et l'angle compris), liste
  `verifier:` complétée (le triangle n'y était pas depuis le lot 4).
- Tests : `construction-triangle-angles.test.ts` (35), écran
  `figure-a-completer-triangle-angles.svelte.test.ts` (3, geste complet avec Retourner en B) ; deux
  tests du lot 4 adaptés (`angles: []`, message « [AC] ou [BC] »). Écrits après le code : preuve
  rouge par mutation de chaque règle (côté d'angle, repère refusé au triangle, part et d'autre,
  graduation, C construit, somme, angle compris, repère à base libre — ce dernier a fait ajouter un
  test).
- Revue Opus (#2348), 4 findings, tous traités, tests vérifiés rouges avant le correctif :
  - **Important** : C passait pour construit par les exceptions du § 15 (deux cercles de même rayon
    sans rapporteur, compas piqué sur le côté d'angle, droite exacte au pied de la hauteur) :
    réponses forgées jugées justes. Désormais C = croisement d'un côté d'angle parti de A et d'un parti
    de B (`angleSideVertex`), ou, angle compris, du côté d'angle et d'un cercle construit centré au même
    sommet ; cercle ou report sans longueur donnée = faux sans message (hors palette).
  - « De part et d'autre de [AB] » seulement si un angle est faux (un repère à 180 − a de l'autre côté,
    droite prolongée, donne un angle juste).
  - Erreurs d'auteur : « le rapporteur ne tient pas en A et en B du même côté de (AB) » quand chacun tient
    d'un côté ; « poser le rapporteur » au lieu de « piquer le compas » ; le refus du rapporteur cite le
    triangle. Le cas donné par la revue (A(3 ; 1)) était faux : le rapporteur n'y tient d'aucun côté (sa
    barre déborde sous la base) ; le test prend A(3,5 ; 2,2), B(8,5 ; 5,8).
  - Cas limite du § 21 « côté [AC] tracé d'un trait à travers le repère » : admis par le juge, mais
    **inatteignable à la main** (rien n'aimante le bout du segment sur la direction du repère) ; le test
    le dit. À montrer à David.

## 23. Phase 0 — lot 8 : mesurer un angle, rapporteur déjà posé (proposée le 2026-11-03, à valider)

BO 6e « Mesurer un angle » (6-169), premier temps : **lire** le rapporteur avant de savoir le poser.
Décidé « plus tard » au § 19 (décision 4). Existant : `verifier: mesure AOB` (lot 6), mesure calculée
sur la figure, messages « mauvaise graduation » / « L'angle mesure 50°, pas 45° », masquage de l'énoncé ;
le dessin du rapporteur, son rayon fixé (§ 18), `protractorFits`. Ce qui est neuf : le rapporteur
**apparaît posé** au chargement, l'élève n'a aucun outil, il tape seulement la mesure.

### Écriture par le prof (recommandée : un mot de plus sur la vérification)

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: mesure AOB, rapporteur posé
---
O = point(4, 3)
A = point(9, 3)
B = rotation(A, angle={{a}}, centre=O)
x = demidroite(O, A)
y = demidroite(O, B)
```

Le rapporteur est posé en O, **base sur le premier côté nommé** ([OA) pour `AOB`), le corps du côté de
B. L'ordre des lettres choisit donc la pose : `BOA` le pose sur [OB). Selon la pose, le 0 du côté de base
est sur l'échelle extérieure ou intérieure : l'auteur choisit ainsi la difficulté de lecture. Palette
vide (aucun outil, ni Effacer ni Retourner) ; `outils:` interdit avec `rapporteur posé`.

### Comportements

- **Nominal** : rapporteur posé en O sur [OA), l'élève lit 50, tape 50 → juste.
- **Limites** (juste) : « 50 » ou « 50° » ; angle obtus (130) ; lecture sur l'échelle intérieure
  (pose `BOA`) ; « 50,5 » → « Au degré près : tape un nombre entier. » (comme au lot 6).
- **Erreurs** (faux) : celles du lot 6, inchangées : 180 − a → « L'angle mesure 50°, pas 130° : tu as lu
  la mauvaise graduation du rapporteur. » ; autre mesure → « L'angle mesure 50°, pas 45°. » ; case vide
  → Valider bloqué.
- **Erreurs d'auteur** : toutes celles du lot 6 ; en plus, le demi-rapporteur posé sur le premier côté,
  du côté du second, ne tient pas dans la fenêtre → « le rapporteur posé sur [OA) sort de la figure :
  écrire mesure BOA » si l'autre pose tient, sinon « déplacer O » ; `rapporteur posé` avec `outils:`.
- **Correction** : l'arc codé « 50° », rapporteur laissé posé.
- **Masquage (évaluation)** : identique au lot 6 (`maskMeasureFigure`) ; `rapporteur posé` n'apprend rien
  de la réponse, laissé tel quel.

### Questions à David

1. **Écriture** : `verifier: mesure AOB, rapporteur posé` (recommandé : la même vérification, un mot de
   plus) ; ou une ligne à part `rapporteur: O ; A` (posable aussi dans d'autres figures plus tard) ?
2. **Côté de la base** : le premier côté nommé, l'auteur choisit en ordonnant les lettres (recommandé :
   prévisible, et c'est lui qui règle échelle extérieure ou intérieure) ; ou le moteur choisit la pose qui
   tient, [OA) d'abord ?
3. **Rapporteur figé** : l'élève ne peut ni le bouger ni le reposer (recommandé : c'est l'exercice de
   lecture seule ; le lot 6 couvre le geste complet) ; ou Retourner permis ?
4. **Message « mauvaise graduation »** : le garder, même texte qu'au lot 6 (recommandé) ?

### Décisions de David (2026-11-03, « je suis tes recos »)

1. Écriture **`verifier: mesure AOB, rapporteur posé`** (la vérification du lot 6, un mot de plus).
2. Base sur le **premier côté nommé** ([OA) pour `AOB`) : l'auteur choisit la pose par l'ordre des lettres.
3. Rapporteur **figé** : ni déplacé, ni retourné, ni reposé ; aucun outil.
4. Message « mauvaise graduation » **gardé**, même texte qu'au lot 6.
5. Cas limite du § 22 (côté [AC] d'un trait à travers le repère) : **gardé tel quel** (admis, inatteignable).

## 24. Lot 8 — ce qui est fait (2026-11-04)

- `verifier: mesure AOB, rapporteur posé` (`MeasureCheck.posed`) ; parseur : virgule puis « rapporteur
  posé » (accent facultatif), toute autre suite visant la pose → la forme dite ; `outils:` refusé avec la
  pose ; palette interne inchangée (le rapporteur), l'écran n'en montre rien.
- Juge (`measure.ts`) : `posedProtractorOf` (centre O, base A, sens vers B, rayon du § 18) ; erreur
  d'auteur neuve : la pose demandée sort de la figure, l'autre tient → « écrire « mesure BOA, rapporteur
  posé » » ; aucune ne tient → message du lot 6. Verdicts et messages du lot 6, inchangés.
- Écran : `drawable` = `interactive` sans pose ; ni palette, ni Effacer, ni zone de tracé ni boutons de
  points ; rapporteur dessiné figé (`rapporteur-pose`, `aria-hidden`) dans la copie, la correction et la
  réponse attendue ; consigne « Lis la mesure sur le rapporteur, puis tape-la sous la figure. ».
- Masquage : la garde `MEASURE_CHECK` admet le suffixe (sinon une évaluation refusait l'envoi).
- Aide à l'écriture : exemple « Lire un angle sur un rapporteur déjà posé », liste `verifier:` complétée.
- Tests : `construction-measure-posed.test.ts` (17), écran `figure-a-completer-mesure-pose.svelte.test.ts`
  (3), garde du masquage (2). Juge et parseur : rouges avant le code (16 échecs) ; écran : preuve rouge
  par mutation (pose désactivée → rouge).
- Piège : la carte rend deux `.figure-a-completer` (la case et la réponse attendue) ; un test d'écran
  compte dans celle qui porte la case.
- Revue (code-reviewer, #2359) : rien de bloquant ni d'important ; mineur traité : l'orientation du
  rapporteur posé assertée à l'écran (AOB 0°, BOA 130°), rouge en inversant le sens de la pose.
- CI : la garde « doc à jour » a demandé `utilitaires-et-demos.md` (couvre `block-catalog/**`), passée en
  local faute de `git fetch` ; doc générale du catalogue, sans liste d'exemples → `Doc-inchangée:`.

## 25. Phase 0 — lot 9 : bissectrice construite + règle des médiatrices relâchée (validée le 2026-11-06)

Ordre de David du 2026-11-06 (`outils-manquants.md` § 1, reliquat du n° 1). BO 6e « Bissectrice d'un angle
saillant » (« utiliser la définition de la bissectrice pour effectuer des constructions »), point 6-172 ;
5e « reconnaître une bissectrice ». Existant : la fonction `bissectrice(A, V, B)` du DSL (une droite) et sa
chorégraphie (`arcs_egaux`, `arc_milieu`, `@mesure`) ; aucun juge.

### Partie A — la bissectrice

#### Écriture par le prof

```figure-a-completer
fenetre: 0 ; 10 ; 0 ; 8
verifier: droite d = bissectrice(A, O, B)
---
O = point(2, 2)
A = point(8, 3)
B = point(4, 7)
x = demidroite(O, A)
y = demidroite(O, B)
```

Même vérification que la médiatrice (`droite <nom> = <expression>`), `bissectrice(A, O, B)` admise sur
papier uni. Palette déduite : Compas · Règle (recommandé, cf. question 1) ; `outils:` peut ajouter le
Rapporteur.

#### Le geste (rien de neuf à l'écran)

Compas piqué en O, ouvert à l'œil → il coupe [Ox) en A' et [Oy) en B' ; deux arcs de même rayon en A' et
B' → ils se coupent en P ; Règle de O à P. **Une exception neuve à la règle du § 15 (exception 4)** : un
cercle centré sur un point construit, même ouvert à l'œil, construit ses intersections avec les traits
droits construits **qui passent par son centre** (rien d'autre : il ne devient pas un trait). C'est le
report d'une longueur quelconque sur deux côtés partant de O ; il ne forge rien que l'élève ne puisse
faire au compas (la perpendiculaire en un point d'une droite, au compas, devient construite aussi : elle
l'est sur le cahier).

#### Comportements

- **Nominal** : arc en O, deux arcs égaux en A' et B', droite (OP) → juste. Autres chemins : un tracé au
  Segment de O à P ; deux arcs égaux de rayons différents de l'arc en O ; arcs pris au Report.
- **Limites** (juste) : arcs et traits en trop ignorés ; la droite entière (au-delà de O) ; P de l'autre
  côté de O (arcs qui se coupent derrière) ; au rapporteur si la palette l'a (repère à la moitié de la
  mesure, côté d'angle du lot 7), à **1° près** (la mesure de AOB n'est pas entière en général).
- **Erreurs** (faux, première cause) :
  - aucun trait droit par O → « Trace la bissectrice de l'angle AOB, depuis son sommet O. » ;
  - trait droit qui ne passe pas par O, mais dans l'angle → « Ta bissectrice doit partir du sommet O. » ;
  - trait par O non construit → « Ta bissectrice est tracée à l'œil : construis-la avec tes
    instruments. » ;
  - trait par O construit, perpendiculaire à la bissectrice (arcs piqués sur [Ox) et sur le prolongement
    de [Oy)) → « Ta droite partage l'angle voisin, pas l'angle AOB : pique le compas sur [Ox) et [Oy). » ;
  - sinon → « Les deux angles ne sont pas égaux : ce n'est pas la bissectrice de l'angle AOB. »
- **Erreurs d'auteur** : quadrillage (refusé) ; O, A ou B invisible ou confondus ; A, O, B alignés (angle
  plat ou nul : pas un angle saillant) ; la bissectrice n'a pas 2 unités dans la fenêtre.
- **Correction** : la bissectrice en pointillés, les deux angles codés du même signe, l'arc en O et les
  deux arcs égaux en traits fins.

### Partie B — la règle sévère des médiatrices (§ 12)

Aujourd'hui (`mediatriceSupportError`, `line.ts`) : la médiatrice de [AB] n'est jugée faisable que si les
cercles de centres A et B **de rayon AB** se coupent dans la fenêtre ; d'où des triangles ordinaires
refusés au cercle circonscrit, et des segments refusés à la médiatrice et au milieu. Or le juge accepte
depuis le § 15 (exception 2) deux cercles de même rayon **quelconque** : la règle d'auteur est plus
sévère que l'élève.

- **Proposé** : faisable si la médiatrice a **au moins 2 unités dans la fenêtre** (l'élève y trouve deux
  croisements de cercles égaux, de part et d'autre de [AB] ou du même côté). Même mesure que les côtés
  d'angle (lot 5) et la bissectrice.
- **Ce qui change** : rien côté élève (le juge ne bouge pas) ; des figures aujourd'hui refusées à l'auteur
  deviennent acceptées (médiatrice, milieu, cercle circonscrit et son centre). Message d'auteur neuf :
  « la médiatrice de [AB] n'a pas 2 unités dans la fenêtre : agrandir la fenêtre ou déplacer A et B ».
- **Correction** du cercle circonscrit : inchangée (deux médiatrices en traits fins).

### Questions à David

1. **Bissectrice : compas, rapporteur, ou les deux ?** Recommandé : **compas par défaut** (c'est la
   construction par la définition, et la seule exacte), rapporteur **admis si le prof l'ajoute** à
   `outils:`, jugé à 1° près.
2. **Exception 4** (cercle ouvert à l'œil, intersections avec les traits droits construits par son
   centre) : l'accepter (recommandé : sans elle, le geste du cahier est impossible) ?
3. **Écriture** `droite d = bissectrice(A, O, B)` (recommandé : comme la médiatrice) ; ou une vérification
   à part (`bissectrice AOB`) ?
4. **Message de l'angle voisin** : le garder (recommandé : c'est l'erreur type quand un arc est piqué sur
   le mauvais prolongement) ?
5. **Médiatrices** : critère « 2 unités dans la fenêtre » (recommandé) ; ou garder les cercles de rayon AB
   et seulement assouplir le cercle circonscrit ?
6. **Un lot ou deux PR ?** Recommandé : **deux PR** (B d'abord, petite et sans geste ; puis A), même
   phase 0.

### Décisions de David (2026-11-06, « je te suis » sur mes recommandations)

1. Bissectrice **au compas par défaut** ; rapporteur admis si le prof l'ajoute à `outils:`, jugé à 1° près.
2. **Exception 4 acceptée** (cercle ouvert à l'œil centré sur un point construit : ses intersections avec
   les traits droits construits par son centre sont construites).
3. Écriture **`droite d = bissectrice(A, O, B)`**, comme la médiatrice.
4. Message de **l'angle voisin gardé**.
5. Médiatrices : faisable si la médiatrice a **au moins 2 unités dans la fenêtre**.
6. **Deux PR** : B (médiatrices) d'abord, puis A (bissectrice).

## 26. Lot 9, PR B — médiatrices relâchées (2026-11-06)

- `mediatriceSupportError` (`line.ts`) : la médiatrice de [AB] est faisable si elle a **au moins 2 unités
  dans la fenêtre** (`MEDIATRICE_MIN_ROOM`, longueur de la droite dans la fenêtre par Liang-Barsky,
  `roomInFrame`) ; plus de cercles de rayon AB exigés. Vaut pour la médiatrice, le milieu, le cercle
  circonscrit et son centre (`circumcenterSupportError`, message ajusté). Juge de l'élève inchangé
  (l'exception 2 du § 15 acceptait déjà des cercles égaux de rayon quelconque).
- Message d'auteur : « la médiatrice de [AB] n'a pas 2 unités dans la fenêtre (l'élève ne peut pas la
  construire) : agrandir la fenêtre ou déplacer A et B ».
- Aide du catalogue (`block-catalog/figure-a-completer.ts`) et `docs/systeme/questions.md` mis à jour.
- Tests : `construction-line.test.ts` (A(2 ; 3), B(7 ; 5) admis pour la médiatrice et le milieu ; cercles
  égaux de rayon 4 → juste ; coin de la fenêtre, 1,7 unité → refusé), `construction-circle.test.ts`
  (triangle presque équilatéral admis, pour le cercle et le centre seul). Rouges avant le code (5 échecs) ;
  le test « rayon 4 → juste » est une garde, vert avant (le juge l'acceptait déjà).
- Pas de refus testé pour le cercle circonscrit : les médiatrices passent par le centre, déjà exigé dans
  la fenêtre ; le cas qui refuse (triangle presque plat dans un coin) est exotique.
- **Revue (code-reviewer, #2430), finding important** : à l'écran, le Compas ne garde pas son écartement
  (centre puis point de passage) et le juge veut deux rayons égaux au calcul près ; sans Report, le seul
  rayon reproductible était AB, donc l'ancienne règle. Mon test « rayon 4 » donnait des coordonnées
  exactes qu'aucun doigt ne produit. **Décision de David (« je suis tes recos »)** : le **Report dans la
  palette** de `droite` (papier uni ; `LINE_GRID_TOOLS` sans lui sur quadrillage) et de `cercle` ; les
  juges `line.ts` et `circle.ts` admettent le report comme trait de construction.
- **2e passe de la revue** : aucun report ne forge de réponse (construit seulement si centre et écartement
  le sont) ; **important** : le cercle circonscrit tracé au Report (écartement O → A, piqué en O) était
  ignoré (« Trace le cercle… ») → `circleOf` (`circle.ts`) lit un report comme le cercle de même centre et
  de même rayon ; écartement pris à l'œil pile au bon rayon → « Ton compas est ouvert à l'œil… ». Mineur
  traité : `outils: report` sur quadrillage refusé pour une droite (erreur d'auteur). Tests rouges avant
  (3).
- Tests du correctif (rouges avant, 5) : palettes ; Report pris à la main (`addTap`), piqué en A et B,
  croisements dans la fenêtre → juste ; deux rayons à la main au Compas → « tracée à l'œil » ; milieu de
  [AB] au bord (A(0 ; 3), B(0 ; 5)) : deux paires de reports du même côté → juste ; cercle circonscrit
  par médiatrices au Report → juste ; écran (`figure-a-completer-mediatrice`) : vrais touchers Report
  puis Règle aimantée, A(3 ; 3), B(9 ; 5) → juste.

## 27. Lot 9, PR A — bissectrice construite (2026-11-06)

- `droite d = bissectrice(A, O, B)` (`bissectriceOf`, `ubumark/types/construction.ts`) : papier uni
  seulement (quadrillage refusé) ; O, A, B visibles, non alignés, au moins 2 unités de bissectrice
  (demi-droite issue de O) dans la fenêtre (`bissectriceSupportError`, `line.ts`). Palette déduite :
  celle d'une droite ; `outils:` peut ajouter le rapporteur (parseur : seule droite qui l'admet).
- Juge (`judgeBissectrice`, `line.ts`) : droite construite qui recouvre la bissectrice ; au
  rapporteur, côté d'angle tiré de O (`angleSideVertex`) à 1° près. Messages dans l'ordre du § 25.
- **Exception 4** (`constructionOf`, option `arcsOnSides`, `instruments.ts`) : **bornée à la
  bissectrice**, pas globale (écart avec le § 25, à valider par David) : ailleurs, un arc à l'œil sur
  un trait droit par son centre rendrait « construite » une longueur prise à l'œil (côté de triangle
  au compas ouvert à l'œil pile à la bonne longueur). Et un cercle refait sur ses propres points
  (même centre, même rayon) reste à l'œil ; l'écartement OA' reporté ailleurs (losange) reste admis.
- Correction : bissectrice en pointillés (`lineSolution`), demi-angles codés d'un même trait, arc en
  O et deux arcs égaux en traits fins (`solutionBissectrices`, `FigureACompleterView`).
- Écarts mineurs : pas de tracé au Segment (palette de la droite sans segment) ; message de l'angle
  voisin avec « [OA) et [OB) » (les côtés ne s'appellent pas toujours x et y) ; le juge admet un
  repère pour une bissectrice même sans rapporteur dans la palette (il ne connaît pas les outils :
  réponse forgée seulement) ; pas de garde « fenêtre trop allongée » pour le rapporteur de la
  bissectrice.
- Tests : `construction-bissectrice.test.ts` (29, rouges avant le code, 5 gardes vertes avant),
  écran `figure-a-completer-bissectrice.svelte.test.ts` (vrais touchers : arc en O par (5 ; 1), arcs
  de A' par B' et de B' par A', règle de O au croisement → juste ; à l'œil → message et correction).
- **Revue (`code-reviewer`, Opus)** : aucune forge trouvée. Corrigé : I1, un cercle centré sur un côté
  était déclaré « à l'œil » avant que son point de passage soit construit (l'ordre comptait) ;
  désormais refusé seulement s'il s'appuie sur un point que son propre arc a construit (tests rouges
  avant, 2). M1 : un côté seulement repassé → « Trace la bissectrice… ». M2 : message d'auteur du
  rapporteur qui cite la bissectrice. M3/M4 : doc précisée (exception 4 pour toute la figure qui
  vérifie une bissectrice ; repère admis par le juge sans voir la palette). **M5 à trancher par
  David** : une bissectrice dont les côtés ne sont pas tracés est acceptée à l'auteur, et l'élève qui
  pique l'arc sans tracer les côtés reçoit « tracée à l'œil ».

## 28. Décisions de David après le lot 9 (2026-11-06, « je te suis » sur mes recos)

1. **Exception 4 bornée aux figures qui vérifient une bissectrice** : validée (écart au § 25 tranché).
   L'étendre plus tard = cas par cas, avec son test anti-forge.
2. **M5** : erreur d'auteur si un côté de l'angle n'est pas tracé (« l'angle AOB doit être tracé :
   ajouter x = demidroite(O, A) et y = demidroite(O, B) ») ; un trait droit de la figure par O et A
   suffit (demi-droite, droite, segment). `bissectriceSupportError`, tests rouges avant (1).
