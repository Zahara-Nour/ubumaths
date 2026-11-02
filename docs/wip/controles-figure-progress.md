---
status: en-cours
---

# Chantier `controles-figure` — nouveaux contrôles de la figure à compléter (symétrique d'abord)

## Reprendre ici

_Mis à jour le 2026-11-02, après #2226._

- **État** : lot 1 (symétrique sur quadrillage, axial + central, `verifier: symetrique par d`) **mergé**
  (#2226), pas encore en prod (`deploy:prod` sur demande de David). Vérification à l'œil notée dans
  `verifications-manuelles.md`.
- **Prochaine action** : phase 0 du lot 2 — outil « point » (réponse `point(x;y)`, symétrique d'un point,
  6-179 / 6-180 sur papier uni), puis angle, triangle, médiatrice, bissectrice, cercle circonscrit,
  4e sommet (§ 1). Puis écrire les modèles CE2-073, CM1-107/108, CM2-097 (journaux de niveau).
- **En attente de David** : rien.
- **Pièges en cours** : les `testSpecs` d'un modèle ne vérifient que le statut (pas de `feedback`) ;
  sans `grille:`, `symetrique` est refusé à la publication ; un contrôle ne doit jamais donner la
  réponse (`verifier: ?`).
- **Worktree / branche** : aucun (worktree retiré après #2226).

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
