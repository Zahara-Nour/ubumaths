# Chantier « cercle-triangle-rectangle » — cercle de centre donné et triangle rectangle à construire

> Lignes n° 19 et n° 20 de [outils-manquants.md](outils-manquants.md). Débouchés : CE2-070 (lot 12b de
> [questions-ce2](questions-ce2-progress.md)), CE1-072. Code : `src/lib/questions/construction/` (`circle.ts`,
> `triangle.ts`), suite du chantier archivé [controles-figure](../archive/wip/controles-figure-progress.md).
> Ouvert le 2026-11-08 depuis la session `questions-ce2`, à la demande de David.

## Reprendre ici

_Mis à jour le 2026-11-08, après #2473. Chantier clos, journal archivé._

- **État** : n° 19 (#2463) et n° 20 (#2473) livrés ; doc versée dans `systeme/questions.md` et `systeme/ubumark.md`.
- **Prochaine action** : aucune ici ; le lot 12b du CE2 (CE2-070, CE1-072) se fait dans `questions-ce2`.
- **En attente de David** : les deux vérifications manuelles (`verifications-manuelles.md`, #2463 et #2473).
- **Pièges** : aucun en cours. Brouillon d'essai `9c92cf8f` en base LOCALE seulement.
- **Worktree / branche** : supprimés après #2473.

## 1. Phase 0 — comportements (validée le 2026-11-08)

**Question d'accès** : aucune — code pur de la case « figure », ni table, ni policy, ni route.

### n° 19 — Cercle de centre donné

Écriture de l'auteur : `verifier: cercle c = cercle(O, passant=A)` (de centre O passant par A) et
`verifier: cercle c = cercle(O, rayon=u)` (rayon pris sur un segment u de la figure ; écriture exacte calée sur le
langage des figures). Le rayon en cm (« cercle de rayon 4 cm ») dépend de la règle graduée (n° 18, chantier
`regle-graduee`) : hors de ce chantier.

- **Nominal** : l'élève pique le compas en O et l'ouvre jusqu'à A → « Juste ». Rayon donné : Report sur [u], puis
  pointe en O → « Juste ». Les autres cercles et droites sont des traits de construction, ignorés (règle du cercle
  circonscrit).
- **Limite** : quadrillage (CE1-072 : « cercle de centre donné passant par un point donné ») : O et A sur des nœuds,
  compas aimanté aux nœuds. Papier uni : O et A sont des points de la figure.
- **Erreurs, dans l'ordre** : il manque le cercle (« Trace le cercle de centre O passant par A. ») ; mauvais centre
  (« Pique ton compas en O. ») ; bon centre, ne passe pas par A (« Ton cercle a le bon centre mais ne passe pas par
  A. ») ; rayon ouvert à l'œil (« Ton compas est ouvert à l'œil : ouvre-le jusqu'à A. ») ; rayon reporté d'un autre
  segment (« Ton cercle n'a pas le bon rayon. »).

### n° 20 — Triangle rectangle

Recommandation : **étendre la vérification `triangle`** (un angle de 90° construit à l'équerre, pas au rapporteur,
hors cycle 2), plutôt qu'une vérification neuve.

Écriture : `verifier: triangle ABC : CAB = 90 ; AC = u` ([AB] tracé ; angle droit en A ; AC reportée de u), ou
`CAB = 90` seul (triangle rectangle quelconque : C n'importe où sur la perpendiculaire).

- **Nominal, papier uni** : équerre le long de (AB) en A → perpendiculaire ; Report de u piqué en A → C au
  croisement ; segments [AC] et [BC] → « Juste ». Les deux C (de part et d'autre de (AB)) sont justes.
- **Nominal, quadrillage** : sans instrument, C sur un nœud ; côtés sur les lignes ou obliques (pas (3;1) →
  perpendiculaire (−1;3)).
- **Erreurs** : côté manquant (messages actuels de `triangle.ts`) ; angle en A non droit (« Ton angle en A n'est pas
  droit : trace la perpendiculaire à (AB) avec l'équerre. ») ; perpendiculaire tracée à l'œil (« Ton côté [AC] est
  tracé à l'œil : utilise l'équerre. ») ; mauvaise longueur (message actuel).

### Questions à David

- **Q1** — Cercle : quadrillage ET papier uni ? (reco : oui, les deux ; le CE1-072 cite le quadrillé et le pointé)
- **Q2** — Triangle rectangle : extension de `triangle` avec `= 90` à l'équerre (reco), ou vérification neuve
  `triangle_rectangle` ?
- **Q3** — Triangle rectangle sur quadrillage : comment donner la longueur de AC ? (reco : en carreaux, côtés sur les
  lignes ; sur les obliques, `AC = AB` seulement, le triangle rectangle isocèle)
- **Q4** — Ordre : n° 19 puis n° 20, une PR chacun, puis le lot 12b du CE2 dans `questions-ce2` (reco : oui)

**Décisions de David (« je suis tes recos », 2026-11-08)** : Q1 quadrillage et papier uni ; Q2 extension de
`triangle` (`CAB = 90` à l'équerre) ; Q3 carreaux sur les lignes, `AC = AB` seul sur les obliques ; Q4 n° 19 puis
n° 20, une PR chacun, revue `code-reviewer` en `model: opus`, puis le lot 12b du CE2.

## 2. N° 19 — cercle de centre donné (2026-11-08)

- `centeredCircleOf` / `centeredCircleTools` (`ubumark/types/construction.ts`) : lecture de `cercle(O, passant=A)` et
  `cercle(O, rayon=distance(D, E))`, palette déduite (compas ; compas + report).
- Parseur : quadrillage admis pour `passant=`, refusé pour `rayon=` (et pour `report` dans `outils:`) ; `rayon=`
  exige le report.
- Juge (`circle.ts`, `judgeCentered`) : messages du § 1 ; sur quadrillage, tout cercle tracé est construit.
- Piège trouvé : `cercle(O, rayon=distance(D, E))` donne le nom interne AUSSI à la distance intérieure ;
  `expectedPoints` prenait la distance (aucun cercle attendu). Corrigé : il prend l'élément qui est un cercle.
- Tests : `construction-circle-centre.test.ts` (33, rouges puis verts) ; `construction/` 562 verts, catalogue,
  parseur et rendu 231 verts, navigateur cercle + quadrillage 8 verts ; `check:incremental` 0 erreur.
- Essai dans l'appli (port 5176, base LOCALE, brouillon d'essai `9c92cf8f`, jamais en prod) : Report de [DE]
  piqué en O → « Juste » ; quadrillage, compas ouvert jusqu'au mauvais nœud → « Faux », « Ton cercle a le bon
  centre mais ne passe pas par A. », correction en pointillés.
- Doc : `systeme/questions.md`, `systeme/ubumark.md`, fiche du catalogue (2 exemples).
- Revue Opus (2026-11-08) : 1 finding important corrigé — figure à deux cercles (rosace), seul le second tracé →
  « Pique ton compas en O. » au lieu de « il manque le cercle » ; un cercle qui recouvre un AUTRE cercle attendu
  n'est plus un essai (test ajouté, rouge puis vert). Mineurs : (a) le message « mauvais rayon » du code (« Ton cercle
  a le bon centre mais pas le bon rayon : reporte la longueur DE. ») est plus précis que celui du § 1 (« Ton cercle
  n'a pas le bon rayon. ») : gardé, signalé à David ; (b) noms à prime refusés dans `cercle(…)` : sans objet, le
  langage des figures n'a pas de prime.
- 2026-11-08 : #2463 mergée (CI verte sur `d2d873c96`, revue Opus : 1 finding corrigé) ; branche supprimée ; vérification manuelle notée.

## 3. N° 20 — triangle rectangle, phase 0 (validée le 2026-11-08, « je suis tes recos »)

Vérifié en prod (lecture seule, 2026-11-08) : aucun modèle n'écrit `= 90` dans un `verifier: triangle` (seul publié :
`AC = u ; BC = v`, « Reproduire un triangle au compas »).

- **Écriture** : `triangle ABC : CAB = 90 ; AC = u` (ou `AC = AB`, `AC = DE`), `CAB = 90` seul, idem en B. Sur
  quadrillage : `CAB = 90 ; AC = 3 carreaux` ([AB] sur une ligne du quadrillage, sinon erreur d'auteur),
  `CAB = 90 ; AC = AB` (lignes ou oblique), `CAB = 90` seul (C sur un nœud de la perpendiculaire).
- **Refus à la publication** : `AC = u` sur quadrillage ; `carreaux` sans quadrillage ; hypoténuse donnée
  (`CAB = 90 ; BC = u`) ; `90` avec un autre angle (Q6).
- **Q5** : `AC = 3 carreaux`, unité obligatoire (`AC = 3` reste libre pour les cm de la règle graduée).
- **Q7** : `= 90` dans un triangle = l'équerre, plus le rapporteur.
- **Q8** : palettes déduites Segment · Équerre (· Report s'il y a une longueur) sur papier uni ; Segment seul sur
  quadrillage. Pas de Compas.
- **Erreurs, dans l'ordre** : côté manquant / côtés disjoints (messages actuels) ; papier uni, C sur aucune droite
  construite par A : « Ton côté [AC] est tracé à l'œil : utilise l'équerre. » ; angle non droit (papier uni : « … :
  trace la perpendiculaire à (AB) avec l'équerre. », quadrillage : « Ton angle en A n'est pas droit. ») ; C sur la
  perpendiculaire hors du croisement du Report : message actuel ; mauvaise longueur (message actuel ; en carreaux :
  « Ton côté [AC] mesure 4 carreaux au lieu de 3. »).
- **Correction** : [AC], [BC], petit carré en A ; papier uni : la perpendiculaire et l'arc de report en traits fins.

## 4. N° 20 — triangle rectangle, code (2026-11-08)

- Types : `TriangleLength` devient une union (`squares` pour les carreaux), `isSquaresLength`, `rightAngleOf` ;
  `triangleTools(check, grid)` (Segment · Équerre · Report / Segment seul).
- Parseur (`readTriangle`, `coherenceError`) : angle droit seul admis, `AC = 3 carreaux` (1..50), refus du § 3.
- Juge (`triangle.ts`, `judgeRight`) : papier uni, C sur une droite construite par le sommet de l'angle droit,
  angle droit, croisement avec un cercle construit centré au même sommet, longueur ; quadrillage, angle et
  longueur. Message du C le plus avancé. `assertRight` : A et B sur des nœuds, C dans la fenêtre / sur un nœud.
- Correction : `rightAngles` (petit carré), `guides` (perpendiculaire, papier uni), arcs sans quadrillage.
- Bug trouvé par le test navigateur : le générateur lisait `l.source` d'une longueur en carreaux (« le point
  undefined n'est pas nommé ») ; corrigé, test serveur rouge sans le correctif.
- Tests : `construction-triangle-rectangle.test.ts` (41, rouges puis verts), navigateur 6 ; suites voisines
  12 668 serveur, 18 navigateur ; `check:incremental` 0 erreur ; doc `systeme/questions.md`, `systeme/ubumark.md`,
  catalogue (2 exemples).
- #2473 mergée le 2026-11-08 (CI verte sur `55fce9ae4`, après fusion de `main` : conflit sur les lignes « Vérifié » des docs). Revue Opus : (1) quadrillage, angle droit seul, la correction allait vers un nœud collé à A (les bouts A et B de
  l'élève comptaient) → bouts A et B écartés ; (2) papier uni, angle droit seul, perpendiculaire hors fenêtre
  acceptée → erreur d'auteur. Tests rouges puis verts.
