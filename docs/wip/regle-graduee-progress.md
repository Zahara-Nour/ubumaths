# Chantier « regle-graduee » — règle graduée (cm, mm) dans la case « figure »

> Ligne n° 18 de [outils-manquants.md](outils-manquants.md) (« à décider avec David : la taille réelle à l'écran est
> le nœud »). Débouchés : CE2-039 (tracer un segment de 6 cm, 5 cm 3 mm, 72 mm), CE2-070 coté (rectangle 7 cm × 3 cm,
> carré de 6 cm, cercle de rayon 4 cm, triangle rectangle 10 cm et 4 cm), peut-être CP-035 et CE1-044 (mesurer un
> segment à la règle graduée). Ouvert le 2026-11-08 depuis la session `questions-ce2`, à la demande de David.
> Vérifié le 2026-11-08 : aucune règle graduée dans `src/lib/ubumark` ni `src/lib/questions` (seul le rapporteur
> existe, `constructions-v2/instruments/components/Protractor.svelte`).

## Reprendre ici

_Mis à jour le 2026-11-08, après #2485._

- **État** : PR 1 (#2485, CE2-039, segment de longueur donnée, direction libre) **mergée** ; pas déployée. ADR 0036
  commitée sur `main` local (1c4a333f2), **push en attente** : index de `main` occupé par une autre session
  (`outils-manquants.md`, plus son commit db22307cf).
- **Prochaine action** : (1) dès `main` libre : pull --rebase, push de l'ADR, ligne « règle graduée (#2485) : rendu
  sur téléphone, règle retournée » dans `verifications-manuelles.md`, lien vers l'ADR rétabli dans `questions.md` ;
  (2) PR 2 : demi-droite [Ax) (Q7 b) et constructions cotées CE2-070 — phase 0 des comportements d'abord.
- **En attente de David** : vérification sur téléphone (règle retournée) ; feu vert `--autostash` si `main` reste bloqué.
- **Pièges en cours** : correction des réponses → tests d'abord, revue `code-reviewer` en `model: opus` ; le juge
  prend le **segment vu** (§ 3) : à garder pour les côtés cotés de 070.
- **Worktree / branche** : `../ubumaths-wt-regle-graduee`, `feat/regle-graduee-cotes` (depuis `origin/main` après #2485).

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
