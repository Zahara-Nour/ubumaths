# Chantier « regle-graduee » — règle graduée (cm, mm) dans la case « figure »

> Ligne n° 18 de [outils-manquants.md](../../wip/outils-manquants.md) (« à décider avec David : la taille réelle à l'écran est
> le nœud »). Débouchés : CE2-039 (tracer un segment de 6 cm, 5 cm 3 mm, 72 mm), CE2-070 coté (rectangle 7 cm × 3 cm,
> carré de 6 cm, cercle de rayon 4 cm, triangle rectangle 10 cm et 4 cm), peut-être CP-035 et CE1-044 (mesurer un
> segment à la règle graduée). Ouvert le 2026-11-08 depuis la session `questions-ce2`, à la demande de David.
> Vérifié le 2026-11-08 : aucune règle graduée dans `src/lib/ubumark` ni `src/lib/questions` (seul le rapporteur
> existe, `constructions-v2/instruments/components/Protractor.svelte`).

## Reprendre ici

_Mis à jour le 2026-11-09, après #2508. **Chantier clos**, journal archivé._

- **État** : clos. Livré : segment de longueur donnée (#2485), sur une demi-droite (#2490, #2503), cercle de rayon
  en cm (#2494), triangle rectangle coté (#2499), carré et rectangle cotés sur papier uni (#2508, Q19-Q22).
  Doc durable : `docs/systeme/questions.md`, `docs/systeme/ubumark.md`, ADR 0036. Ligne n° 18 de
  `outils-manquants.md` passée dans « Livré » ; le geste « poser la règle pour mesurer » (CP-035, CE1-044,
  couverts par des modèles à règle dessinée) y est la ligne n° 26.
- **Prochaine action** : aucune ici. Les modèles CE2-039 / CE2-070 cotés se font dans `questions-ce2`.
- **En attente de David** : vérifications sur téléphone (#2485, #2490, #2494, #2499, #2508), dans
  `docs/wip/verifications-manuelles.md`.
- **Pièges durables** : le juge prend le **segment vu** ; seules les règles posées AVANT le trait comptent ;
  tests de composant : toucher pile sur une graduation (le bout s'aimante d'abord aux graduations).
- **Worktree / branche** : aucun.

## 1. Phase 0 — le nœud et les questions (tranchée le 2026-11-08)

**Question d'accès** : aucune — code de la case « figure », ni table, ni policy, ni route.

**Le nœud** : on ne connaît pas la taille réelle d'un pixel (écran, zoom du navigateur, tablette ou téléphone) ; un
« vrai » centimètre à l'écran ne se garantit pas.

### Questions à David

- **Q1** — Quel centimètre ?
  - **A (reco)** : le cm **de la figure** : 1 unité de la figure = 1 cm ; la règle est dessinée et graduée à l'échelle
    de la figure, comme sur une photocopie réduite. Règle et figure restent d'accord sur tout écran.
  - B : vraie taille, après un étalonnage (l'élève pose une carte au format bancaire sur l'écran). Lourd, fragile.
- **Q2** — Précision au mm sur téléphone : à 320 px de large, une figure de 12 cm donne ~2,5 px par mm, trop fin pour
  le doigt. Reco : l'élève **pose la règle** (comme le rapporteur), puis le bout du segment **s'aimante à la
  graduation du mm** la plus proche ; plus une loupe à la pose. Juste = longueur exacte au mm près.
- **Q3** — Périmètre du chantier : (a) tracer un segment de longueur donnée (039) ; (b) mesurer un segment et écrire
  sa longueur (CP-035, CE1-044 : y a-t-il déjà des modèles par image ?) ; (c) constructions cotées (070 : carré,
  rectangle, triangle rectangle cotés ; cercle de rayon donné, compas ouvert sur la règle). Reco : (a) puis (c) ;
  (b) seulement si les modèles actuels en manquent.
- **Q4** — Supports : papier uni seulement (sur quadrillage, le carreau fait déjà l'unité) ? Reco : oui.

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q1 cm de la figure (1 unité = 1 cm, règle à l'échelle
de la figure, pas d'étalonnage) ; Q2 règle posée comme le rapporteur, bout du segment aimanté au mm, loupe ; Q3 (a)
tracer un segment (039) puis (c) constructions cotées (070), (b) mesurer après relevé des modèles existants ; Q4
papier uni seulement.

## 2. Tracer un segment de longueur donnée (CE2-039) — comportements proposés (2026-11-08)

ADR 0036 commitée sur `main` (3623b957b). Constat : la règle graduée existe déjà,
`constructions-v2/instruments/components/Ruler.svelte` (1 grande graduation par unité, 10 petites, `pixelsPerUnit`) ;
on la réutilise comme `Protractor.svelte` dans `FigureACompleterView.svelte`. Modèle de geste : l'angle au rapporteur
(`angle.ts` : pose, repère, segment ; refus « tracé à l'œil »).

**Comportements proposés** (nominal / limite / erreur) :

- **Nominal** — `verifier: segment AB = 6 cm` (A donné et visible). Outils : `regle` + `segment`. L'élève pose la règle :
  1er toucher = le 0 (aimanté au point le plus proche, comme le centre du rapporteur), 2e toucher = la direction ;
  « Retourner » change le bord gradué. Outil segment : un bout en A, l'autre **aimanté à la graduation du mm** de la
  règle posée la plus proche (cible d'aimantation en plus, `SNAP_RADIUS_PX`). Juste : un segment d'un bout en A, de
  longueur L exacte (1e-9 relatif), dans la fenêtre. B : le nom de l'autre bout, pour les messages.
- **Longueurs** : `6 cm`, `5 cm 3 mm`, `5,3 cm`, `72 mm` acceptés dans la vérification ; stockées en mm entiers.
- **Limite** — longueur que la fenêtre ne peut pas contenir depuis A (aucune direction) ou plus longue que la règle →
  **erreur d'auteur** à la publication. Papier uni seulement (quadrillage → erreur d'auteur, ADR 0036 § 3).
- **Erreur** — aucun segment depuis A : « Trace le segment [AB] depuis le point A. » ; bout hors graduation : « Ton
  segment est tracé à l'œil : arrête-le sur une graduation de la règle. » ; mauvaise longueur : « Ton segment mesure
  5,8 cm au lieu de 6 cm. » (au mm, virgule).
- **Correction** : la règle posée depuis A et le segment juste (comme le rapporteur de la correction d'un angle).

**Questions ouvertes** : Q5 forme de la loupe ; Q6 0 de la règle aimanté ou libre ; Q7 direction libre ou donnée
(demi-droite [Ax) de la figure) ; Q8 refus « tracé à l'œil » ou longueur seule. Voir le message à David du 2026-11-08.

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q5 loupe = boutons ‹ › qui décalent le bout d'1 mm
(comme le repère du rapporteur ; vraie loupe plus tard) ; Q6 le 0 de la règle s'aimante au point le plus proche au
1er toucher ; Q7 l'auteur choisit : direction libre depuis A (défaut, 039) ou le long d'une demi-droite [Ax) de la
figure (070) ; Q8 un bout hors graduation est refusé (« tracé à l'œil »), comme l'angle.

## 3. PR 1 — segment de longueur donnée (039), direction libre (2026-11-08)

Commit 7643c129c : `segment-length.ts`, parseur, `drawing.ts` (pose, ‹ ›, Retourner), `instruments.ts` (aimantation au mm),
juge, vue, `Ruler.svelte` (`mirrored`), catalogue, docs. Tests rouges vérifiés puis verts (55 purs, 4 composant).

**Choix faits sans David (à valider)** : (1) `fenetre:` exigée, B absent de la figure ; (2) longueur de la règle =
plus grand côté de la fenêtre en cm entiers, 20 cm au plus (`rulerLengthOf`) ; (3) pose stockée dans la réponse,
`regle(ox;oy;bx;by;sens)`, la dernière fait foi ; Effacer retire le segment puis la règle ; (4) aimantation : point
nommé, sinon graduation du mm, sinon instruments ; (5) ‹ › sans segment en tracent un depuis le 0 ; Maj ±1 cm ;
(6) messages dans l'unité de l'auteur (« 5 cm 8 mm » pour `5 cm 3 mm`, « 58 mm » pour `72 mm`) ; (7) bout sur un point
construit accepté (`constructionOf`) ; (8) libellé « Règle graduée » (`droite` = « Règle ») ; (9) correction : règle
posée en A dans la direction de la règle de l'élève, sinon de son segment, sinon la 1re qui tient.

**Douteux** : règle posée ailleurs qu'en A → message « tracé à l'œil » trompeur (rare : le 0 s'aimante) ; rendu de la
règle retournée et lisibilité sur téléphone non vus.

**Revue opus (2026-11-08)** : 2 faux juste (segments superposés ; prolongement) → corrigés en 840688610 : le juge prend
le **segment vu** (segments alignés depuis A, à 2° près, qui se touchent = un seul, jugé par son bout le plus loin),
graduation comparée en mm entiers, `constructionOf` retiré (seule une graduation d'une règle posée en A fait foi),
refus d'auteur si un autre point visible est déjà à la longueur demandée de A ; graduation prioritaire sur A pour le
bout du segment (pas pour le départ). Reste **Q9** (David) : éventail de segments dans des directions distinctes
depuis A (5,1 … 6,9 cm), jugé juste aujourd'hui.

**Décisions de David (« je suis tes recos », 2026-11-08)** : choix (1)-(9) du § 3 acceptés (le (7) « point construit »
remplacé par la revue : seule une graduation fait foi) ; Q9 (a) : plusieurs segments vus depuis A → faux, « Trace un
seul segment… ».

## 4. Phase 0 de la suite — demi-droite et constructions cotées (CE2-070), proposée le 2026-11-08

**Question d'accès** : aucune — code de la case « figure », ni table, ni policy, ni route.

**Constats** (code de `main` après #2485) : `carre` et `rectangle` ne vivent que sur quadrillage (`polygon.ts`, côtés
donnés, CP-060) ; le cercle de centre donné prend son rayon sur un point ou un segment (`cercle(O, rayon=distance(D, E))`,
n° 19) ; le triangle rectangle prend `AC` sur un segment au Report ou en carreaux (n° 20, `AC = 3` laissé libre pour
les cm) ; `segment AB = 6 cm` juge un bout sur une graduation d'une règle posée avec son 0 en A, quelle que soit la
direction — la même règle sert à tout côté coté qui part d'un sommet.

**Découpage proposé** (une PR chacune, revue `code-reviewer` en `model: opus`, tests d'abord) :

- **PR 2 — segment sur une demi-droite donnée** : `verifier: segment AB = 6 cm sur [Ax)`, où `[Ax)` est une
  `demidroite(A, X)` de la figure.
  - Nominal : la règle posée, 0 en A ; au 2e toucher, la direction **s'aimante à la demi-droite** si on est près ;
    segment de A jusqu'à une graduation → « Juste ».
  - Erreurs : segment hors de [Ax) ou du mauvais côté de A : « Trace ton segment sur la demi-droite [Ax). » ; puis
    les messages de la PR 1 (tracé à l'œil, mauvaise longueur, plusieurs segments).
  - Limite (refus d'auteur) : la demi-droite ne tient pas 6 cm dans la fenêtre ; X déjà à 6 cm de A.
  - Correction : la règle le long de [Ax), le segment.
- **PR 3 — cercle de rayon donné en cm** : `verifier: cercle c = cercle(O, rayon=4 cm)`.
  - Nominal : la règle posée, 0 en O ; le compas piqué en O, son ouverture **s'aimante aux graduations** → « Juste ».
  - Erreurs, dans l'ordre : il manque le cercle ; mauvais centre (messages du n° 19) ; ouvert à l'œil : « Ton compas
    est ouvert à l'œil : ouvre-le sur une graduation de la règle. » ; mauvais rayon : « Ton cercle a un rayon de
    3,8 cm au lieu de 4 cm. »
  - Limite : le cercle ne tient pas dans la fenêtre → refus d'auteur.
- **PR 4 — triangle rectangle coté** : `verifier: triangle ABC : CAB = 90 ; AC = 4 cm` ([AB] = 10 cm déjà tracé).
  - Nominal : perpendiculaire à l'équerre en A, règle posée en A le long d'elle, C sur la graduation de 4 cm,
    [AC] et [BC] → « Juste ». Les deux côtés de (AB) sont justes.
  - Erreurs : celles du n° 20 (côté manquant, côté tracé à l'œil sans l'équerre, angle non droit), puis C hors
    graduation : « Ton point C est placé à l'œil : arrête [AC] sur une graduation de la règle. », mauvaise longueur
    en cm.
- **PR 5 — carré et rectangle cotés, papier uni** : `verifier: carre A ; B` sans grille ([AB] = 6 cm tracé),
  `verifier: rectangle A ; B : BC = 3 cm` ([AB] = 7 cm tracé). Outils : Segment · Équerre · Règle graduée.
  - Nominal : perpendiculaires à l'équerre en A et en B, longueurs à la règle graduée posée en A et en B, 4e côté.
  - Erreurs : les messages actuels de `polygon.ts` (pas fermé, pas un carré, trait de trop, côté prolongé), plus
    angle non droit / tracé sans l'équerre, sommet placé à l'œil, mauvaise longueur.

Puis le lot de modèles CE2-070 cotés, dans `questions-ce2`.

### Questions à David

- **Q10** — Découpage en 4 PR (2 demi-droite, 3 cercle, 4 triangle rectangle, 5 carré et rectangle), dans cet
  ordre ? (reco : oui ; chaque PR est petite et réutilise le juge de la PR 1)
- **Q11** — Figures cotées : on part d'un **côté déjà tracé** ([AB] = 10 cm, 6 cm, 7 cm), comme les triangles et
  les carrés actuels (reco), ou de rien (l'élève trace aussi [AB], direction libre : le juge ne sait plus où regarder) ?
- **Q12** — Cercle de rayon 4 cm : règle posée au centre, ouverture du compas aimantée aux graduations (reco ; même
  geste que le segment), ou « prendre l'écartement sur la règle puis piquer en O » (un Report depuis la règle, plus
  proche du geste réel mais deux étapes de plus) ?
- **Q13** — Carré et rectangle sur papier uni : angle droit à l'équerre **exigé** (« tracé à l'œil » refusé), comme
  le triangle rectangle ? (reco : oui)
- **Q14** — Assemblages (« carré de 6 cm + cercle de rayon 4 cm ») : plus tard, après la PR 5 (reco), ou dans le
  chantier ?

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q10 4 PR dans cet ordre (2 demi-droite, 3 cercle,
4 triangle rectangle, 5 carré et rectangle) ; Q11 on part d'un côté déjà tracé ; Q12 règle posée au centre,
ouverture du compas aimantée aux graduations ; Q13 angle droit à l'équerre exigé ; Q14 assemblages après la PR 5.

## 5. PR 2 — segment sur une demi-droite donnée (2026-11-08)

Commit 09851df5c : `segment AB = 6 cm sur [Ax)` (`SegmentLengthCheck.ray`, x = nom d'une `demidroite(A, …)` de la
figure ; `FigureLine.kind` ajouté), juge (`onRay` après « un seul segment »), refus d'auteur, correction le long de
[Ax), catalogue (1 exemple), docs `systeme/questions.md` et `systeme/ubumark.md`. Tests : 19 purs (rouges puis
verts), 2 composant (le 2e toucher de la règle s'aimante déjà aux traits : vue inchangée) ; `construction/` +
`ubumark` 6 772 verts ; `check:incremental` 0 erreur ; cliquet tenu.

**Choix faits sans David** : (1) écriture `sur [Ax)` avec le NOM de la demi-droite en minuscule (convention [Ax),
comme `x = demidroite(O, A)` des bissectrices), pas `[AX)` par un point ; (2) bout du segment sur [Ax) à la
tolérance de calcul près (1e-9 relatif) : une règle posée à 1° est refusée — l'aimantation garantit la pose
exacte ; (3) consigne de la règle inchangée (« Touche un point dans la direction du segment »).

**Revue opus (2026-11-08)** : (1) Important, demi-droite de longueur nulle (X sur A) publiée, direction NaN, tout
faux → refus d'auteur ; (3) croisement (ou bout) de traits de la figure sur [Ax) à la longueur demandée → refus
d'auteur (cas frère de #2485 ; pas étendu à la direction libre). Tests rouges puis verts (21). Restent à David :
**Q15** (finding 2) : la fusion à 2° de `seenSegments` accepte un trait de 5 cm à 1,9° de [Ax) superposé au bon
segment (le trait s'écarte de ~1,7 mm) : garder, ou serrer la fusion quand la demi-droite est donnée ? (reco :
serrer, à la tolérance de calcul, avec `ray`) ; **Q16** (finding 4) : accepter aussi `[AX)` (X un point de la
figure) ? (reco : oui, plus tard si un auteur le demande ; le refus actuel cite la forme attendue).

## 6. PR 3 — cercle de rayon donné en cm (2026-11-09)

`verifier: cercle c = cercle(O, rayon=4 cm)` (aussi 3,5 cm, 3 cm 5 mm, 35 mm) : `CenteredCircle.kind = 'longueur'`,
`readLengthText` déplacée du parseur vers `ubumark/types/construction.ts` (partagée avec le segment) ; cercle attendu
calculé à part dans `expectedPoints` (O, longueur / 10) ; juge `judgeRuled` (`circle.ts`) ; vue : au compas, règle
posée, l'ouverture s'aimante à la graduation du mm (même branche que le segment), ‹ › décalent l'ouverture
(`nudgeRulerEnd`, `shape: 'cercle'`), outil de départ = Règle graduée ; correction : la règle posée en O
(`circleLengthRuler`) et le cercle ; catalogue (1 exemple), docs `systeme/questions.md`, `systeme/ubumark.md`.
Tests : 32 purs (rouges puis verts), 2 composant ; `construction/` + `ubumark` + `atelier` + catalogue 16 166 verts ;
`check:incremental` 0 erreur ; cliquet tenu ; `lint:fast` propre.

**Choix faits sans David (à valider)** : (1) plusieurs cercles de centre O de rayons distincts → faux, « Trace un
seul cercle de centre O. » (l'analogue de Q9 : un éventail de rayons n'est pas un cercle juste) ; avec des cercles
concentriques attendus, le seuil est le nombre de cercles attendus en O ; (2) palette exactement Règle graduée ·
Compas (Report, segment, droite refusés) ; le cercle ne se mêle qu'à d'autres cercles ; (3) la règle doit avoir son
0 en O (pas « 0 ailleurs et différence de deux graduations ») ; (4) Règle graduée = outil de départ (comme le
segment) ; (5) pas de refus d'auteur « un point visible à 4 cm de O » (le compas s'y aimanterait, mais le juge
exige une graduation : l'élève mesure quand même).

**Revue opus (2026-11-09)** : rien de bloquant ; 4 mineurs corrigés : (1) refus d'auteur de `cercle(O, rayon=4)`
sans unité : le message cite `cercle(O, rayon=4 cm)` ; (2) cercles concentriques attendus et un cercle de trop :
« Trace seulement les 2 cercles de centre O demandés. » ; (3) correction : une règle par centre
(`solutionRulers`) ; (4) faux juste : compas ouvert jusqu'à un point visible à 4 cm, règle posée APRÈS → était
juste ; seules les règles posées avant le cercle comptent désormais (remplace un refus d'auteur, choix (5)).

## 7. PR 4 — triangle rectangle coté en cm (2026-11-09)

Commit 3233b329f : `triangle ABC : CAB = 90 ; AC = 4 cm` (aussi 3,5 cm, 3 cm 5 mm, 35 mm) : `TriangleLength`
`{ length, unit }` + `isRuledLength` ; parseur `TRIANGLE_RULED_REGEX` (lue par `readLengthText`), refus des cm
sans angle droit ou sur quadrillage, refus d'une longueur hors du mm ; palette Segment · Équerre · Règle graduée
(`triangleTools`) ; `judge.ts` laisse passer la règle ; juge `judgeRight` : la graduation remplace le croisement
du report (`ruledGraduationOf`) ; refus d'auteur : côté plus long que la règle ; correction : `triangleRuler`
(par `solutionRulers`), sans arc ni codage de longueur ; catalogue (1 exemple), docs `systeme/questions.md`,
`systeme/ubumark.md`. Tests : 22 purs (rouges puis verts), 2 composant ; `construction/` + `ubumark` + catalogue
7 151 verts ; `check:incremental` 0 erreur ; cliquet tenu ; `lint:fast` propre.

**Choix faits sans David (à valider)** : (1) seule une règle posée AVANT le premier côté qui arrive en C compte
(comme le cercle de #2494) ; (2) la vue est inchangée : outil de départ = Segment (comme le n° 20), le 2e toucher
de la règle s'aimante à la perpendiculaire, le bout de [BC] s'aimante à la graduation de C ; (3) les cm
seulement pour le triangle rectangle (pas le lot 4 ni l'angle quelconque) ; (4) palette exactement Segment ·
Équerre · Règle graduée (Report refusé).

**Revue opus (2026-11-09)** : (1) **bloquant, faux juste** : un éventail de triangles (règle restée en A, C à 3 cm
et à 4 cm, chacun fermé par [B…]) est juste dès qu'un C convient ; aussi un C juste au-dessus de (AB) et un faux
en dessous ; (2) **important** : [AC] prolongé au-delà de C (trait vu de 4,5 cm, C au milieu) est juste. Preuves
rouges : `construction-triangle-rectangle-cm.revue.test.ts` (4 rouges sur 5, commité exprès, à intégrer au test
de la PR). Vérifié sans défaut : ordre de la règle, règle ailleurs, croisement, côté trop long, réponse forgée,
parseur, correction. Questions à David :

- **Q17** : plusieurs C distincts (côté en cm) → faux, « Trace un seul triangle ABC. » ? Un C de chaque côté de
  (AB) compte-t-il pour deux ? (reco : oui et oui, comme Q9 du segment et le cercle)
- **Q18** : [AC] prolongé au-delà de C → faux, jugé sur le trait vu (`seenSegments` de la PR 1) ? (reco : oui)

**Décisions de David (« je te suis », 2026-11-09)** : choix (1)-(4) du § 7 acceptés ; **Q17** : côté en cm,
plusieurs C distincts → faux, « Trace un seul triangle ABC. », un C de chaque côté de (AB) compte pour deux, un
même C atteint deux fois pour un ; **Q18** : côté en cm, [AC] jugé sur le trait vu depuis A (`seenSegments` de la
PR 1, bout le plus loin) : prolongé au-delà de C → « Ton côté [AC] mesure 4,5 cm au lieu de 4 cm. » (ou « placé à
l'œil » hors graduation) ; le n° 20 (report) inchangé.

**Correction Q17/Q18 (2026-11-09, #2499)** : `judgeRight`, côté en cm : C distincts dédoublonnés,
plus d'un → `severalTrianglesFeedback` ; la graduation est lue au bout du trait vu depuis le sommet
(`seenSegments` exportée de `segment-length.ts`). Sondes de la revue fondues dans
`construction-triangle-rectangle-cm.test.ts` (5 rouges → verts, plus « même C deux fois : juste ») ;
fichier `.revue.test.ts` retiré.

**Décisions de David (« je suis tes recos », 2026-11-09)** : choix (1)-(3) du § 5 et (1)-(4) du § 6 validés ;
**Q15** : serrer — sur demi-droite donnée, les segments depuis A ne fusionnent qu'à la tolérance de calcul
(`SAME_DIRECTION_ON_RAY` = 1e-6 rad, paramètre `sameDirection` de `seenSegments`) ; **Q16** : `[AX)` plus tard,
si un auteur le demande. PR 5 (`fix/regle-graduee-demi-droite`) : Q15, test rouge puis vert.
PR 5 mergée (#2503) ; revue Opus : rien de bloquant, 3 mineurs traités (règle reposée sur [Ax), trait presque
opposé → deux segments, JSDoc de `seenSegments`). Limite connue, non visée par Q15 : un trait qui ne part pas de
A (du milieu de [AB]) est ignoré.

## 8. Phase 0 de la PR 6 — carré et rectangle cotés sur papier uni (2026-11-09)

**Question d'accès** : aucune (case « figure », ni table, ni policy, ni route).

**Constat** : `carre A ; B` et `rectangle A ; B ; C` (`polygon.ts`, CP-060) ne jugent que la figure fermée
(côtés fusionnés), outil Segment seul, sans instruments ni longueur : c'est le quadrillage qui fait l'angle droit
et la longueur. Rien ne vérifie l'équerre ni la règle. Le triangle rectangle coté (§ 7) a déjà tout le reste :
droite construite à l'équerre par le sommet, graduation d'une règle posée en ce sommet AVANT le trait, trait vu.

**Comportements proposés** (papier uni ; quadrillage inchangé) :

- **Nominal, carré** : `verifier: carre A ; B ; C ; D`, [AB] tracé dans la figure (6 cm). Palette Segment ·
  Équerre · Règle graduée. L'élève trace la perpendiculaire à (AB) en B à l'équerre, pose la règle 0 en B, trace
  [BC] jusqu'à la graduation de 6 cm ; de même en A pour D ; trace [CD] → « Juste ». Les deux côtés de (AB) sont
  justes.
- **Nominal, rectangle** : `verifier: rectangle A ; B ; C ; D : BC = 3 cm`, [AB] tracé (7 cm) ; même geste,
  3 cm en B et en A.
- **Erreurs, dans l'ordre** : hors palette → faux sans message ; figure pas fermée (« Ta figure n'est pas
  fermée. », messages actuels de `polygon.ts`, côté donné prolongé compris) ; plusieurs figures (un C de chaque
  côté) → « Trace un seul carré ABCD. » (comme Q17) ; côté [BC] (ou [AD]) hors d'une droite construite par B
  (A) → « Ton côté [BC] est tracé à l'œil : utilise l'équerre. » ; C hors graduation → « Ton point C est placé à
  l'œil : arrête [BC] sur une graduation de la règle. » ; mauvaise longueur → « Ton côté [BC] mesure 5,8 cm au
  lieu de 6 cm. » (trait vu, Q18) ; trait de trop / trait qui dépasse (messages actuels).
- **Limites (erreurs d'auteur)** : quadrillage avec des cm ; [AB] pas au mm près ; C ou D déjà dans la figure ;
  carré (rectangle) qui ne tient dans la fenêtre d'aucun côté ; côté plus long que la règle ; `BC = 3 cm` sur un
  carré.
- **Correction** : les perpendiculaires en A et B (traits fins), les règles posées en A et en B, les trois côtés
  du côté où l'élève a le plus tracé.

### Questions à David

- **Q19** — Écriture : sur papier uni, nommer les quatre sommets (`carre A ; B ; C ; D`,
  `rectangle A ; B ; C ; D : BC = 3 cm`, C et D absents de la figure, pour les messages), les formes du
  quadrillage (`carre A ; B`, `rectangle A ; B ; C`) inchangées ? (reco : oui)
- **Q20** — Le 4e sommet D : seulement « perpendiculaire en A + règle posée en A » (comme C en B), ou aussi D au
  croisement de deux droites construites (perpendiculaire en A et perpendiculaire à (BC) en C, sans mesurer
  [AD]) ? (reco : accepter les deux — la seconde est une construction exacte qu'un élève fait aussi)
- ~~Q21~~ — tracé sans l'équerre : déjà tranché par **Q13** (angle droit à l'équerre exigé), pas reposé.

**Décisions de David (2026-11-09)** : **Q19** quatre sommets nommés sur papier uni (`carre A ; B ; C ; D`,
`rectangle A ; B ; C ; D : BC = 3 cm`), formes du quadrillage inchangées ; **Q20** D accepté de deux façons :
perpendiculaire en A + règle posée en A, ou croisement de deux droites construites (perpendiculaire en A et
perpendiculaire à (BC) en C).

## 9. PR 6 — carré et rectangle cotés sur papier uni (2026-11-09)

`ruled-polygon.ts` (`judgeRuledPolygon`, `assertRuledPolygon`, correction : `ruledPolygonSolution`,
`ruledPolygonRulers`, `ruledPolygonCorrection` rendue par `solutionTriangle`) ; `RuledPolygonCheck`
(`ruled: true`, `isRuledPolygonCheck`, `RULED_POLYGON_TOOLS`) ; parseur `readRuledPolygon` et
`ruledPolygonError` ; `instance-generator.ts` ne demande que A et B nommés (le test de composant l'a
révélé) ; catalogue (1 exemple) ; docs `systeme/questions.md`, `systeme/ubumark.md`. Tests : 40 purs
(`construction-carre-rectangle-cm.test.ts` ; rouges = module absent, pas assertion par assertion), 2 composant
(`figure-a-completer-regle.svelte.test.ts`) ; `construction/` + `ubumark` + catalogue 7 239 verts ;
`check:incremental` 0 erreur ; cliquet tenu ; `lint:fast` propre.

**Choix faits sans David (à valider)** : (1) deux côtés opposés depuis B (un carré de chaque côté) sont deux
côtés vus (`throughA` de `seenSegments` ignoré), d'où « Trace un seul carré ABCD. » ; (2) C et D doivent
être du même côté de (AB) pour fermer la figure (un quadrilatère croisé = « pas fermée ») ; (3) l'arité
fautive (`carre A ; B ; C`) cite aussi la forme du papier uni ; (4) unité des messages du carré : cm
(« 5,8 cm »), le côté [AB] n'ayant pas d'unité écrite ; (5) correction : du côté où l'élève a le plus
tracé, sinon le plus haut.

**Revue opus (2026-11-09)** : aucun faux juste (14 sondes). (1) **Important**, faux faux : A d'abord, puis C
au croisement de la perpendiculaire en B et de la perpendiculaire à (AD) en D → refusé « à l'œil » →
**Q22** (David, 2026-11-09) : accepté dans les deux ordres ; le premier sommet à la règle, l'autre à la
règle ou au croisement. Mineurs traités : Q20 le long de la droite de l'équerre testé ; côté prolongé au
croisement → longueur du trait vu (pas « à l'œil ») ; [AB] exigé dans la figure (erreur d'auteur) ;
`rectangle A ; B ; C : BC = 3 cm` → message d'arité (pas « quatre sommets »). Assumés (messages seuls,
verdict faux juste) : carré + diagonales → « Trace un seul carré » ; [BC] tracé d'un trait qui passe par
B → « Il manque le côté [BC] » ; [AB] prolongé → « dépasse » (le quadrillage dit « ne doit pas être
prolongé »).
