# Relevé « Cercles et disques » de 6e (2026-11-28)

Chantier [`idees-6e-cercles`](idees-6e-cercles-progress.md). Lecture des 9 exercices 6G2 de l'autre plateforme
(copie locale, code lu, `-old` ignorés), comparés à nos modèles de prod (MCP, lecture seule). Points de 6e :
6-162 (définitions : cercle, disque, rayon, diamètre, corde), 6-163 (cercle et disque comme ensembles de points),
6-164 (problèmes de distances à un point). BO : `src/lib/server/programmes/transcriptions/cycle-3/6-espace.md`
(« Cercles et disques ») ; bornes : `docs/systeme/programmes/bornes/cycle3.md` (aucune précision pour ces trois
points).

## Nos modèles (prod, 2026-11-28)

| Point             | Modèle                                               | Variations                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6-162             | b8939937 Cercle, disque, rayon, diamètre, corde      | 4 : que représente le segment [OA], [BC] ou [DE] (figure) ; rayon ↔ diamètre (calcul) ; cercle ou disque (figure) ; une corde peut-elle mesurer c cm (oui / non)                 |
| 6-163             | 48524505 Cercle et disque : des ensembles de points  | 3 : points sur le cercle (distances données, plusieurs réponses) ; points du disque ; où est M (sur le cercle, dans le disque, hors du disque)                                   |
| 6-164             | 2f3da9ce Problèmes de distances à un point           | 3 : la chèvre peut-elle brouter la touffe (oui / non) ; maisons à moins de 3 km de la gare et à plus de 2 km de l'usine (tableau) ; combien de points à a cm de A et à b cm de B |
| 6-161             | 3ec74bbc Milieu d'un segment                         | 3 : longueur de la moitié, du segment entier, I est-il le milieu                                                                                                                 |
| CM1-099 / CM2-091 | f988f07a Cercle, disque, rayon, diamètre, corde, arc | 4 : nom du trait rouge, cercle ou disque, quel point est sur le cercle, rayon ↔ diamètre                                                                                         |
| CM1-104 / CM2-094 | 2e15c33a Tracer un cercle de rayon donné             | 2 : rayon entier, rayon décimal (`cercle(O, rayon=… cm)`)                                                                                                                        |
| CE2-070           | 1c0ba52e, d73d429b                                   | cercle de centre O passant par A ; rayon donné par un segment                                                                                                                    |

En 6e, rien ne fait **construire** un cercle (les tracés sont au CE2 et au CM, rayon donné), ni nommer un objet
**dans l'autre sens** (« un diamètre est… »), ni distinguer **le** rayon (une longueur, $OA$) d'**un** rayon (un
segment, $[OA]$), ni lire une **région grisée** en condition sur une distance.

## Les exercices

| Id     | Ce qu'on demande (plages lues dans le code)                                                                                                                                                                                                                                                    | Forme chez eux                                   | Nos modèles                               | Verdict                                                                                         | Fiche  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| 6G2A   | Une figure : cercle de centre O, [OA] rayon, [BC] diamètre (codés), [DE] corde. Deux sens : « un rayon est … » (nommer l'objet) et « [AB] est … » (sa nature). Six types : le rayon ($OA$, sans crochets), un rayon ($[OA]$), le diamètre, un diamètre (aussi une corde), une corde, le centre | QCM à plusieurs réponses ou saisie               | b8939937 v1 (un seul sens, sans notation) | 🟡 le sens inverse, « le » / « un » et « un diamètre est aussi une corde » absents              | F1     |
| 6G2A-1 | Rayon r (11..49 cm) → diamètre ; diamètre → rayon ; I milieu de [BC], BC = 2r → BI ; BI → BC. Schéma en option                                                                                                                                                                                 | saisie, « cm » affiché                           | b8939937 v2, 3ec74bbc v1 et v2            | ✅ couvert                                                                                      | —      |
| 6G2A-2 | Segment [CD] de 6..9 cm (ou décimal), 1 à 4 cercles : centre C ou D et rayon 3..5 cm ; centre C ou D passant par l'autre ; diamètre [CD] (milieu à placer) ; centre C ou D et diamètre 6..11 cm                                                                                                | papier, correction animée                        | 2e15c33a (CM), 1c0ba52e (CE2)             | ❌ aucune construction de cercle en 6e ; diamètre donné (longueur ou segment) jamais demandé    | N1     |
| 6G2A-3 | L'inverse de 6G2A-2 : la figure tracée, écrire le programme de chaque cercle (« de centre … et de rayon … », « passant par … », « de diamètre … »)                                                                                                                                             | étiquettes à glisser                             | aucun                                     | ❌ décrire un cercle tracé absent                                                               | N2     |
| 6G2B   | Dans un cadre, 1 à 4 points (coordonnées entières −4..4) ; construire l'ensemble des points à r unités (cercle) ou à au plus r unités (disque) de chacun, r de 2 à 5 au dixième                                                                                                                | figure interactive (cercle, disque, remplissage) | 48524505 (distances données, choix)       | 🟡 tracer le cercle : faisable ; colorier un disque : outil manquant                            | F2, O1 |
| 6G2B-1 | Forme faite d'arcs dans un carré de 9 cm (12 points sur le bord) : écrire le programme (arcs de centre et d'extrémités donnés) ou reproduire la forme                                                                                                                                          | éditeur de programme de construction             | aucun                                     | ❌ arcs de cercle ni tracés ni jugés : outil manquant                                           | O3     |
| 6G2C   | Chèvre attachée à un piquet sur le mur d'une cabane dans un enclos rectangulaire (12..16 m × 10..15 m), corde donnée : reproduire à l'échelle et hachurer la zone broutée ; cabane dans un coin, sur un côté, ou au milieu                                                                     | papier, pas interactif                           | 2f3da9ce v1 (oui / non sans figure)       | 🟡 la forme de la zone (quart, demi-disque, disque) jamais demandée ; hachurer : outil manquant | F3, O1 |
| 6G2C-1 | M dans la partie grisée : intérieur d'un disque (MC < r), extérieur (MC > r), cercle (=) ; couronne (r1 < MC < r2) ; intersection de deux disques, extérieur des deux, l'un sans l'autre (r de 1,5 à 4,5 au dixième). Médiatrice et demi-plan : hors rubrique (6G3)                            | signes <, =, > à remplir                         | 48524505 v3 (le sens inverse)             | ❌ lire une région grisée en condition absent                                                   | F2, F3 |
| 6G2C-2 | Reporter au compas, sur une demi-droite, le périmètre d'une figure (triangle, rectangle, ligne brisée…, côtés 1,5..5 cm), puis tracer en bleu le segment de cette longueur                                                                                                                     | éditeur de construction, 4 points                | aucun                                     | ❌ reports bout à bout : outil manquant (périmètre, point du CM)                                | O2     |

## Ce que leur format fait et pas le nôtre

- **Colorier ou hachurer une région** (disque 6G2B, zone broutée 6G2C) : notre case « figure » trace des cercles,
  jamais une surface. Outil proposé O1.
- **Reporter plusieurs longueurs bout à bout au compas** sur une demi-droite (6G2C-2). Outil proposé O2.
- **Tracer un arc de cercle** d'extrémités données, et juger une figure faite d'arcs (6G2B-1). Outil proposé O3.
- Le reste se fait chez nous : figure composée (n° 45, `construction/composite.ts`) pour plusieurs cercles et le
  milieu à placer avant le cercle de diamètre [AB] (`point I = milieu(A, B)` puis `cercle c = cercle(I, passant=A)`) ;
  `cercle(O, rayon=4 cm)` pour un rayon ou un diamètre donné ; bloc `figure` avec `remplissage` et `opacite_fond`
  pour griser une région ; case choix à plusieurs bonnes réponses.
