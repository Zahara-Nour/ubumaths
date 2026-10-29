# Chantier « questions-tspe » — couvrir la terminale spécialité en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points` (décisions lts-1 à lts-9
> dans `tspe.md`). En base, le niveau est `T_SPE`. Chantiers par thème déjà faits (septembre-octobre 2026),
> fichiers dans `scripts/questions/` : `suites-terminale`, `fonctions-terminale`,
> `convexite-integration-terminale`, `primitives-ed-terminale`, `trigo-terminale`, `denombrement-terminale`,
> `geometrie-espace-terminale`, `probas-stats-terminale`. Chantier jumeau : `questions-1spe` (même situation,
> décisions D1-D11 reprises ici comme propositions).

## Reprendre ici

_Mis à jour le 2026-10-29, lot 0-suites vérifié (§ 6)._

- **État** : D1-D7 validées ; lot 0-suites vérifié (17 brouillons, 1 correction), page à cocher publiée.
- **Prochaine action** : après les verdicts : PR de l'instantané, merge, puis David lance `create-questions --dir scripts/questions/tspe-0-suites --publier --mettre-a-jour` et `publier-lot --publier` ; ensuite lot 0-limites et fonctions.
- **En attente de David** : verdicts de la page à cocher des suites (§ 6).
- **Pièges en cours** : `create-questions` et `publier-lot` → David ; les vieux dossiers
  `scripts/questions/<thème>-terminale/` ne concordent peut-être plus avec la base → partir des id
  (`export-question-templates.ts --ids`, comme en 1re spé) ; la case choix est en prod (figure-et-choix lots 1-5,
  v0.55.0) : plus d'ancien QCM à écrire.
- **Worktree / branche** : `../ubumaths-wt-questions-tspe`, `feat/questions-tspe-0-suites`.

## 1. Relevé (prod, 2026-10-29)

- **326 points** de terminale spé (325 dans `points-lycee.csv` + TSPE-626, ajouté depuis : « Utiliser l'équation
  fonctionnelle de l'exponentielle pour transformer une écriture », **sans borne**) ; **135** ont au moins un
  modèle, **191** aucun ; **2** seulement ont un modèle publié (TSPE-382, TSPE-416).
- **186 modèles** liés au niveau (niveau `T_SPE` ou tag TSPE) : **2 publiés** (b4096cd8 « Étude de fonction : où
  chercher les limites », 07bce646 « Opérations sur les limites »), **184 brouillons** ; tous rangés sur un nœud.
  Beaucoup portent aussi `T_COMP` et un point TCOMP (permis : un point par niveau).
- **1 modèle sans tag** : a80a780f « Caractérisations de la convexité et du point d'inflexion ».
- **11 modèles de niveau `T_SPE` tagués seulement d'un point TCOMP** : 624bf511 (allure y′ = ay + b, TCOMP-249),
  5e702745 (∫ₐˣ : variations, TCOMP-272), 7a0b795c (encadrer une valeur moyenne, TCOMP-269), 07ebdcbe
  (coefficients binomiaux : chemins, TCOMP-288), 4ff9d049 (binomiale : n et p, TCOMP-367 + TTECHNO-089), 7d3632bb
  (loi géométrique : absence de mémoire, TCOMP-301), efb12f4b (reconnaître une solution d'une équation
  différentielle, TCOMP-250), ef3c495c (relation et triangle de Pascal, TCOMP-296), f1963ef2 (seuil par le
  logarithme, TCOMP-239), 9f14d672 et 81ff485d (suites arithmético-géométriques, TCOMP-214 / TCOMP-208).
- **4 modèles tagués TSPE d'un autre niveau** : 8b599a53 « Dériver g(ax + b) » (TSPE-408), fece187e et afd9b3ff
  « Résoudre cos x = a / sin x = a sur un tour » (TSPE-457) — niveau `1_SPE`, à passer en `T_SPE` (D3 de
  `questions-1spe` dit « retirer `1_SPE` », pas encore fait) ; 1cfc575d « Probabilité d'un chemin dans un arbre
  pondéré » — niveau `2`, tagué TSPE-616.

Points couverts (nombre de modèles) : 304, 305, 306 (2), 307, 308, 542, 543, 309 (2), 311, 312, 545, 546, 313, 314,
315, 318 (2), 319 (2), 320, 322, 323, 325, 550 (2), 332, 333, 345, 557, 346, 558, 559, 352, 353, 354, 562, 563,
360, 364, 365, 366, 367, 565, 369, 370, 371, 567, 372, 375, 376 (2), 378, 379, 380, 382, 383 (3), 384, 385 (2),
577, 578, 579, 580, 583, 404, 407, 408, 409, 412, 413 (2), 414, 415 (2), 416 (2), 417, 418, 419, 587, 588, 590,
420, 425, 430, 431, 432 (2), 438, 441, 594, 442, 443, 444, 445, 595, 446, 596, 597 (2), 598 (2), 599 (3), 454,
600, 456, 601, 457 (6), 458 (4), 459 (2), 602, 464, 467 (3), 468 (8), 469, 607, 470, 475, 476, 479, 481, 482,
483, 487, 488, 490, 492, 493, 498, 502 (2), 616, 618, 510 (2), 619, 620, 511, 516 (3), 522, 621, 524, 622, 526,
527, 530, 531, 533.

## 2. L'existant contre les bornes

_Premier regard (titres, tags) ; la vérification par tirages réels (`pnpm question:specs --apercu`) se fait thème
par thème au lot 0 (Q1)._

- **Approfondissements déjà couverts** (« en aucun cas obligatoires ») : 322 (combinaisons avec répétitions),
  323, 325 (Python), 360 (sphère et plan), 375 (vecteur orthogonal à deux vecteurs, lts-8), 376 (sphère),
  bf13ac32 et 34b03dee compris. À publier quand même ? (Q4)
- **Doublon de point** : 0965c56c et e76a43eb sur 309 (k-uplets distincts), deux niveaux d'une même famille :
  voulu a priori.
- Rien d'autre vu sur les titres ; la lecture par tirages dira le reste.

## 3. Points sans modèle, classés (191)

Classes : **A** texte / formule seuls · **B** outil existant · **B\*** figure de l'espace en perspective (Q5) ·
**C** outil neuf · **D** non évaluable · **P** démonstration ou approfondissement (BO p.3 : « en aucun cas
obligatoires ») · **=** point de connaissance dont une capacité voisine a déjà des modèles, ou qu'un modèle
existant couvre une fois retagué (Q2, Q3).

| Kind × exigence (sans modèle)   | Points |
| ------------------------------- | -----: |
| connaissance, attendu           |     76 |
| savoir-faire, attendu           |     45 |
| démonstration                   |     19 |
| savoir-faire, approfondissement |     31 |
| algorithme, approfondissement   |     19 |
| TSPE-626 (hors CSV)             |      1 |

### 3.1 Vocabulaire ensembliste et logique (4)

- **=** : 301, 540 (n-uplet, produit cartésien ≈ 306).
- **A** : 302 (négation avec un ou deux quantificateurs), 303 (raisonner par équivalence).

### 3.2 Dénombrement (9)

- **=** : 541, 544 (parties ↔ n-uplets de {0, 1}, ↔ issues de Bernoulli ≈ 542, 543) ; 316, 547 (relation et
  triangle de Pascal : ef3c495c à retaguer) ; 317 (représentation adaptée ≈ 318).
- **A** : 310 (définition de n!).
- **P** : 321, 548 (démonstrations), 324 (Python).

### 3.3 Vecteurs, droites et plans de l'espace (19)

- **=** : 326, 327, 328, 329, 330, 331 (connaissances ≈ 550, 333, 365, 366).
- **A** : 549 (translations).
- **B\*** : 334 (représenter une combinaison linéaire : geste « tracer » sur une figure, plutôt C), 335, 338
  (exprimer, lire une décomposition sur une figure), 337, 553 (lire si des vecteurs forment une base), 336, 551,
  552 (positions relatives sur un cube), 339 (configurations : alignement, coplanarité).
- **P** : 340, 554, 341 (barycentres, Leibniz).

### 3.4 Orthogonalité et distances (21)

- **=** : 342 (≈ 345), 343 (≈ 352), 348 (≈ 357), 349 (≈ 565, 375), 560 (≈ 367), 350 (≈ 370), 561 (≈ 369),
  351 (≈ 353).
- **A** : 555, 556 (bilinéarité, symétrie), 347 (développement de ‖u + v‖²), 344 (base orthonormée), 355
  (longueur par le produit scalaire), 356 (distance d'un point à une droite), 625 (grandeurs : longueur, angle,
  aire, volume — en repère), 357 (orthogonalité de deux droites), 358 (plan médiateur).
- **P** : 359 (démonstration), 564, 361, 362 (approfondissements).

### 3.5 Représentations paramétriques et équations cartésiennes (7)

- **=** : 363 (≈ 365, 366).
- **A** : 368 (reconnaître un plan par son équation), 566 (traduire par un système), 568 (interpréter les
  solutions du système).
- **P** : 373 (démonstration), 374 (intersection de deux plans, lts-7), 377 (sphère et droite).

### 3.6 Suites (15)

- **=** : 381, 570 (comparaison, gendarmes ≈ 385, 578).
- **A** : 569 (croissante non majorée → +∞), 386 (récurrence sur une suite ≈ 304, mais centrée suite), 387
  (évolutions : 9f14d672, 81ff485d à retaguer ?).
- **P** : 388, 389, 390, 391 (démonstrations), 392, 393 (algorithmes), 394, 395, 396, 571 (approfondissements).

### 3.7 Limites des fonctions (17)

- **=** : 397, 572, 573 (limite en ±∞, en un point ≈ 415), 398 (asymptote ≈ 404), 399, 574, 575 (limites des
  fonctions de 1re ≈ 403 une fois couvert), 400 (comparaison ≈ 582), 401, 581 (opérations : 806c10f4 et 04ec9518
  sont tagués 415 — à doubler d'un modèle ou retaguer).
- **A** : 402 (suite : limites usuelles), 576 (suite : croissances comparées), 403 (fonction : limites usuelles),
  582 (fonction : majorations, encadrements).
- **P** : 405 (démonstration), 406, 584 (asymptotes obliques, branches infinies).

### 3.8 Compléments sur la dérivation (10)

- **=** : 410, 411, 585, 586 (définitions et caractérisations de la convexité : a80a780f, sans tag, à retaguer
  — un seul point par modèle, Q3).
- **B** : 589, 591 (point d'inflexion lu sur la courbe de f′, de f″ : ` ```courbe `, comme e3e19d28 / 225c8682).
- **P** : 421 (démonstration), 422, 423, 424.

### 3.9 Continuité (10)

- **=** : 427 (≈ 432), 428, 429 (TVI ≈ 430).
- **A** : 426 (dérivable ⟹ continue, vrai ou faux / réciproque).
- **P** : 433, 434, 592 (algorithmes), 435, 436, 437.

### 3.10 Logarithme (10)

- **=** : 439 (≈ 444), 440 (≈ 414).
- **A** : 593 (variations de ln), 447 (problème avec exp et ln : f1963ef2 à retaguer ?), 626 (équation
  fonctionnelle de l'exponentielle pour transformer une écriture — **borne à écrire**, Q6).
- **P** : 448, 449 (démonstrations), 450, 451, 452.

### 3.11 Sinus et cosinus (3)

- **=** : 453 (≈ 597-601).
- **B** : 455 (lier la courbe et le cercle : ` ```trig ` + ` ```courbe `).
- **P** : 460 (tangente).

### 3.12 Primitives, équations différentielles (13)

- **=** : 463, 603, 604, 605, 606 (primitives de référence ≈ 467 : fe25be0a, d0930e8c, 23402520 couvrent xⁿ,
  1/√x, exp, sin, cos), 466 (≈ 469, 607).
- **A** : 461 (y′ = f), 462 (notion de primitive : « F est-elle une primitive de f ? »).
- **B** : 465 (allure des solutions de y′ = ay : ` ```courbe ` ou case choix de courbes ; 624bf511 fait
  y′ = ay + b).
- **P** : 471, 472 (démonstrations), 473, 474.

### 3.13 Calcul intégral (18)

- **=** : 477 (≈ 487), 484 (≈ 488), 608 (≈ 481 : dd0ee69a « Encadrer une intégrale » est tagué 481), 609
  (7a0b795c à retaguer).
- **A** : 478 (existence de primitives), 480 (linéarité), 489 (majorer par une autre fonction), 491 (suite
  d'intégrales).
- **B** : 485, 486 (estimer graphiquement une intégrale, une valeur moyenne : ` ```courbe ` quadrillée).
- **P** : 494, 495 (démonstrations), 496, 497, 610, 611, 499, 500.

### 3.14 Succession d'épreuves, schéma de Bernoulli (18)

- **=** : 503, 504, 614 (schéma de Bernoulli, loi binomiale ≈ 618, 510 ; 07ebdcbe → 614), 508 (≈ 618 ;
  4ff9d049 à retaguer).
- **A** : 501, 612 (produit des probabilités, produit cartésien), 505, 615 (modéliser), 507 (indépendance), 509
  (seuil par la loi binomiale).
- **B** : 613, 506 (arbre : ` ```probtree ` à trous), 617 (probabilités totales sur un arbre).
- **P** : 512 (démonstration), 513, 514, 515, 517.

### 3.15 Sommes de variables aléatoires (9)

- **=** : 519 (≈ 526), 520 (≈ 527), 523 (≈ 524).
- **A** : 518 (somme de deux variables), 521 (V(aX) = a²V(X)), 525 (écrire une variable comme somme).
- **P** : 528, 623 (démonstrations), 529.

### 3.16 Concentration, loi des grands nombres (8)

- **A** : 532 (loi des grands nombres : interprétation).
- **P** : 534, 624, 535, 536 (algorithmes), 537, 538, 539.

### Bilan

| Classe | Points | Suite                                                                      |
| ------ | -----: | -------------------------------------------------------------------------- |
| A      |     43 | lots de texte                                                              |
| B      |      9 | ` ```courbe `, ` ```probtree `, ` ```trig `                                |
| B\*    |      9 | figures de l'espace en perspective (Q5)                                    |
| C      |      0 | (334 « représenter une combinaison linéaire » le deviendrait, Q5)          |
| D      |      0 | les exercices Python sont tous des approfondissements (P)                  |
| =      |     61 | connaissance doublée d'une capacité couverte, ou modèle à retaguer (Q2-Q3) |
| P      |     69 | 19 démonstrations, 50 approfondissements (Q4)                              |

## 4. Lots proposés (ordre)

0. **Les 184 brouillons** (Q1), un lot par thème : tirages contre les bornes, corrections, page à cocher,
   publication. Thèmes : suites → limites et fonctions (continuité, ln) → convexité et intégration → primitives et
   équations différentielles → trigonométrie → dénombrement → géométrie dans l'espace → probabilités.
1. **Migration des tags et des niveaux** (§ 1, Q3).
2. **Limites : capacités** (402, 576, 403, 582) — A.
3. **Logarithme, continuité, convexité : restes** (593, 447, 626, 426, 589, 591) — A, B.
4. **Intégrales et primitives : restes** (461, 462, 478, 480, 489, 491, 485, 486, 465) — A, B.
5. **Probabilités : succession d'épreuves, sommes de variables** (501, 612, 505, 615, 507, 509, 613, 506, 617,
   518, 521, 525, 532) — A, B ; deux lots.
6. **Espace : calculs** (549, 555, 556, 347, 344, 355, 356, 625, 357, 358, 368, 566, 568) — A ; deux lots.
7. **Logique, dénombrement, suites : restes** (302, 303, 310, 569, 386, 387) — A.
8. **Lot « à savoir »** des points « = » selon Q2.
9. **Espace sur figure** (B\*) selon Q5.

## 5. Questions à David

_Posées le 2026-10-29. Recommandations de Claude validées par David le 2026-10-29 (« je te suis ») : D1 = Q1 … D7 = Q7, chacune avec sa recommandation._

- **Q1 — Brouillons d'abord ?** Comme en 1re spé (D1) : les 184 brouillons passent avant tout lot neuf, un lot
  par thème, dans l'ordre du § 4. Recommandé : oui, premier thème = suites.
- **Q2 — Points « = »** : même règle qu'en 1re spé (D2) ? Un modèle « à savoir » pour les faits à connaître
  (n!, propriétés, primitives de référence…), aucun modèle pour les doublons de savoir-faire, notés « couverts
  par » leur voisin. Recommandé : oui.
- **Q3 — Tags et niveaux** (une migration, après les lots 0 concernés) : a80a780f → 586 (caractérisation par f″ ;
  ou le scinder en 410 / 411 / 585 / 586) ; ef3c495c → 316 ; 07ebdcbe → 614 ; 4ff9d049 → 508 ; 7a0b795c → 609 ;
  dd0ee69a : 481 → 608 ; 624bf511 → 466 ; efb12f4b → 466 ; 5e702745 → 476 ; f1963ef2 → 447 ; 9f14d672,
  81ff485d → 387 ; 7d3632bb → 516 ; 8b599a53, fece187e, afd9b3ff : niveau `T_SPE` à la place de `1_SPE` (avec la
  session `questions-1spe`, D3) ; 1cfc575d : niveau `2` → `T_SPE` ? (à lire : point de seconde aussi ?).
  Recommandé : oui, après lecture de chaque modèle au lot 0 de son thème.
- **Q4 — Points P** (69) : hors chantier, comme en 1re spé (D4) ; mais les modèles d'approfondissement **déjà
  écrits** (322, 323, 325, 360, 375, 376 : 8 modèles) sont vérifiés et publiés avec leur thème. Recommandé : oui.
- **Q5 — Figures de l'espace** (334-339, 336, 551-553 : 9 points) : attendre le chantier `solides`
  (perspective cavalière, décidé le 2026-10-29 après `fractions-a-colorier`), ou dessiner un cube à la main en
  ` ```figure ` (sommets placés en coordonnées 2D) dès maintenant ? Recommandé : attendre `solides`, lot en fin
  d'ordre ; 334 (tracer un vecteur) y devient un geste.
- **Q6 — TSPE-626** (exponentielle : transformer une écriture) n'a pas de borne : je l'écris dans `tspe.json` /
  `tspe.md` (même borne que 444, côté exponentielle) ? Recommandé : oui, en même temps que le premier lot qui la
  touche.
- **Q7 — Chevauchement avec maths complémentaires** : 80 brouillons (81 modèles) portent aussi `T_COMP`. Publier au lot 0
  les rend visibles aux deux niveaux ; je vérifie aussi contre les bornes `tcomp.json` (plus étroites). Recommandé :
  oui, les deux bornes à chaque tirage.

## 6. Lot 0-suites : vérification des brouillons

_2026-10-29. 17 brouillons de niveau `T_SPE` tagués d'un point des suites (304, 378, 379, 380, 383, 384, 385, 432,
577, 578, 579) ou des suites arithmético-géométriques (9f14d672, 81ff485d : TCOMP seul, D3 → 387). Instantané
`scripts/questions/tspe-0-suites/` (`export-question-templates.ts`, prod), `question:specs --apercu 3` puis une copie
par variation (64 variations, 2 tirages lus chacune), réponses des 25 cases « choix » recoupées avec leur option ;
sorties dans le scratchpad de la session._

**Mécanique** : 17 / 17 verts, 3 650 tirages réussis, 0 avertissement.

**Bornes** : rien hors bornes. TSPE : limites des fonctions de 1re seulement (lts-5) ; qⁿ pour q réel quelconque (383,
ea9d2de8 avec q ⩽ −1) ; définitions par les intervalles (378-380). TCOMP (D7, plus étroites) : raisons positives
pour 1ebd1c86, 708f8a08 (0 < q < 1), 81ff485d et 9f14d672 (a ∈ {0,1 … 0,9 ; 1/2 … ; 2 ; 3} ⩾ 0). 57063ada (Héron) :
seul f(ℓ) = ℓ est demandé, dans 432 (l'étude de la convergence, 571, n'est pas demandée).

**Constats** :

- **C1 (corrigé)** : 2bf6edc7 v3 (« majorée par M, que conclure ? ») donnait pour contre-exemples uₙ = (−1)ⁿ et
  uₙ = −n, **faux** quand M < 1 (M tiré dans ±2..9 : une fois sur deux). Remplacés par uₙ = (M − 1) + (−1)ⁿ et
  uₙ = M − n ; 12 / 12 specs vertes, tirages relus (M = −9, −4, 6).
- Écartés : « −9/9 » non simplifié dans une étape de c611f92b v3 et v4 (étape intermédiaire, réponse juste) ;
  `0.5`, `1.05` écrits à l'anglaise dans la sortie de l'outil seulement (rendu à la française).

**Page à cocher** : https://claude.ai/artifact/CRPu9Wj8MaomQe8nS6v7Jy (17 fiches, 64 exemples), collection `verdicts`
vide à la publication.

**Publication bloquée (simulation `publier-lot`)** : 7063979e et 98ba277c occupent le même niveau (2) de la même
catégorie. Relevé sur les **184 brouillons** (MCP, 2026-10-29) : **14 collisions** de ce type, dans 13 catégories
(13 entre brouillons de terminale, 1 avec un modèle publié de 1re spé : 7f13ca89 au niveau 3 de Dérivation /
Variations). Proposition : **une seule migration de niveaux** pour tout le niveau, avant la première publication
(niveau visé = niveau libre de la catégorie, sans toucher aux modèles publiés) — Q8 :

| Modèle   | Catégorie (sous-domaine)                  | Niveau |
| -------- | ----------------------------------------- | ------ |
| 7063979e | Limites de suites / Comparaison           | 2 → 1  |
| d3ae0f61 | Continuité / TVI                          | 2 → 3  |
| 7f13ca89 | Dérivation / Variations (1re spé publiée) | 3 → 5  |
| cac2d6ed | Fonctions trigonométriques / Dérivées     | 3 → 4  |
| 9c7fb7cf | Fonctions trigonométriques / Équations    | 2 → 5  |
| 5072030d | Fonctions trigonométriques / Parité       | 1 → 3  |
| 7df468d6 | Fonctions trigonométriques / Parité       | 2 → 4  |
| 37ce7759 | Convexité / Lecture graphique             | 2 → 1  |
| eae25eba | Espace / Projeté orthogonal               | 3 → 2  |
| d0930e8c | Primitives des fonctions de référence     | 1 → 2  |
| 3aca54e9 | Dénombrement / Combinaisons               | 2 → 1  |
| ed01a843 | Dénombrement / Principes                  | 1 → 2  |
| f796ffc0 | Dénombrement / Reconnaître le modèle      | 2 → 1  |
| a95a9c0d | Loi binomiale / Calcul de probabilités    | 2 → 1  |

Le fichier `tspe-0-suites/7063979e.json` porte déjà le niveau 1.
