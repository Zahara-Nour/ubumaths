---
status: en-cours
---

# Chantier `controles-figure` — nouveaux contrôles de la figure à compléter (symétrique d'abord)

## Reprendre ici

_Mis à jour le 2026-11-02, après #2233._

- **État** : lot 1 (#2226) et lot 2a (#2233, `verifier: point A' = <expression>`, outil point sur
  quadrillage) **mergés**, pas encore en prod (`deploy:prod` sur demande de David). Vérifications à
  l'œil notées dans `verifications-manuelles.md`.
- **Prochaine action** : lot 2b — équerre (perpendiculaire à une droite par un point), compas (cercle
  par son centre et un point), aimantation sur les intersections des traits, papier uni (§ 5,
  décisions) : phase 0 des gestes d'abord. Puis angle, triangle, médiatrice, bissectrice, cercle
  circonscrit, 4e sommet (§ 1) ; modèles CE2-073, CM1-107/108, CM2-097, 6-179/180 (journaux de niveau).
- **En attente de David** : rien.
- **Pièges en cours** : le langage des figures n'a pas de prime (`A'` = nom de correction seulement,
  § 6) ; geometry-core : `symetrie(P, axe=d)` échoue si P définit d (« duplicate parent IDs ») ;
  `testSpecs` = statut seulement ; sans `grille:`, `symetrique` et `point` refusés à la publication.
- **Worktree / branche** : aucun (retiré après #2233).

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
