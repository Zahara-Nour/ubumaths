# Chantier « questions-tspe » — couvrir la terminale spécialité en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points` (décisions lts-1 à lts-9
> dans `tspe.md`). En base, le niveau est `T_SPE`. Chantiers par thème déjà faits (septembre-octobre 2026),
> fichiers dans `scripts/questions/` : `suites-terminale`, `fonctions-terminale`,
> `convexite-integration-terminale`, `primitives-ed-terminale`, `trigo-terminale`, `denombrement-terminale`,
> `geometrie-espace-terminale`, `probas-stats-terminale`. Chantier jumeau : `questions-1spe` (même situation,
> décisions D1-D11 reprises ici comme propositions).

## Reprendre ici

_Mis à jour le 2026-11-01, après #2121 et la relecture du lot 0-géométrie dans l'espace (§ 12)._

- **État** : lots 0-suites, 0-limites et fonctions, 0-intégration, 0-primitives, 0-trigo, 0-dénombrement
  **publiés** (133 modèles). Lot 0-géométrie dans l'espace : 28 brouillons vérifiés, 6 retouches (C1-C6) dans les
  fichiers, page à cocher publiée, PR des fichiers #2121 mergée.
- **Prochaine action** : lot validé par David (C6 comprise) ; David lance depuis le dépôt principal
  `create-questions --publier --mettre-a-jour` et `publier-lot` (simulation, puis `--publier`) ; je relis en base ; ensuite lot 0-probabilités. Plus tard : migration Q3 (tags +
  échange de niveaux D-D1 : 07ebdcbe 1, 4dcbae71 2, 970dab52 3, ef3c495c 4).
- **En attente de David** : les trois commandes de publication du lot (§ 12).
- **Pièges en cours** : le **niveau est dans la clé** de `create-questions` : changer `level` dans un fichier = doublon
  créé ; index unique de niveau par catégorie sur les **publiés** seulement. `create-questions` et `publier-lot`, même
  en simulation → David ; simulation `publier-lot` AVANT tout ; worktree neuf : `pnpm exec svelte-kit sync`, et
  `pnpm exec tsx --env-file=../ubumaths/.env …` (pas de `.env` dans le worktree) ; l'aperçu mélange les options d'une
  case choix : recouper avec la SOURCE ; `!=` dans une formule s'affiche ≠, `i` seul devient l'unité imaginaire.
- **Worktree / branche** : aucun (retiré après #2121) ; prochain lot : nouveau worktree depuis `origin/main`.

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

**Horodatage** : #2002 mergée ; `db:migrate` refusé (`DbPushMissingRemoteError`) : `20261030120000` (1re spé, produit scalaire) déjà jouée en prod, ma migration se retrouvait avant. Renommée en `20261030120100` (max + 1 min), sans `--include-all` (#2004). `db:migrate` le 2026-10-30 : 14 niveaux relus en prod, `updated_at` préservés, trigger `update_question_templates_updated_at` actif. Simulations : `create-questions` → 1 à mettre à jour (2bf6edc7), 16 identiques ; `publier-lot` → 17 brouillons passent le contrôle.

**Relecture (David, page à cocher, 2026-10-30)** : 17 « ok » sur 17, aucun commentaire (lu en base).

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

**D8 (David, 2026-10-30, « je valide » sur les recommandations)** : accès — personne ne gagne ni ne perd d'accès ;
une seule migration pour les 14, avant toute publication ; niveaux du tableau ci-dessus. Migration
`20261030120100_questions_tspe_niveaux.sql` (patron du CE1 lot 3), test
`tests/integration/questions-tspe-niveaux.test.ts` : 7/7 vert, **rouge** sans l'`update` des niveaux (« lot
incohérent : niveaux 0/14 ») et sans le fichier. Les autres thèmes s'exporteront de la base après la migration
(niveaux à jour). `security-auditor` (2026-10-30) : aucun finding bloquant (14 id, niveaux et rollback recoupés
avec la prod ; note : après `db:migrate`, vérifier que le trigger `update_question_templates_updated_at` est actif).

## 7. Lot 0-limites et fonctions : vérification des brouillons

_2026-10-30. Les brouillons de niveau `T_SPE` tagués d'un point des rubriques « Limites des fonctions » (hors 577-579,
déjà au lot des suites), « Compléments sur la dérivation » hors convexité, « Continuité » et « Fonction logarithme » :
24 modèles, plus f1963ef2 (seuil par le logarithme, TCOMP-239 seul, D3 → 447) et 8b599a53 (« Dériver g(ax + b) »,
TSPE-408, niveau `1_SPE`). La **convexité** (37ce7759, e3e19d28, 225c8682, 08f9ad7b, c4775a3a, 98f9d4b2, e814175b,
21840f6c, a80a780f sans tag) part au lot « convexité et intégration ». Instantané `scripts/questions/tspe-0-limites/`
(prod), une copie par variation (82 variations, 2 tirages lus chacune), réponses des 5 cases « choix » recoupées avec
leur option._

**Mécanique** : 26 / 26 verts, 0 avertissement.

**Bornes** : rien hors bornes TSPE. TCOMP (D7) : dérivées par f(ax + b), eᵘ, ln u, u² seulement (723779c8,
50feeefd : produit, quotient, (ln x)², eᵘ, ln u, u²) ; continuité intuitive (10393ff9) ; TVI en cas strictement
monotone (2491dd75) ; ln(√a) = ½ ln a (ffd5c051 v3) se déduit de l'équation fonctionnelle (√a × √a = a), voir C6.

**Constats (tous corrigés dans les fichiers, specs vertes, tirages relus)** :

- **C1** 806c10f4 v2 : « tendent vers -\infty » hors formule (LaTeX brut) → `$…$`.
- **C2** b97dabe1 v0, v1 : coefficient 1 écrit (« 1 − 1·x⁴/eˣ », « f(x) = 1·x³/eˣ ») → `{{if:k==1||{{k}}}}`.
- **C3** 10393ff9 v0, v1, 74b103a8 v0, 9ad36217 v0 : la réponse colorée (`\textcolor{…}{\text{…}}`) hors formule,
  donc en LaTeX brut → `$…$`.
- **C4** ffd5c051 v4 : « un quotient de logarithmes n'est pas ln(16 − 2) » → « n'est pas le logarithme du
  quotient : ln 16 / ln 2 ≠ ln(16/2) ».
- **C5** f52b93c4 v3 : « sin(1x²) » (énoncé, attendue, correction) quand a = 1 → `{{if:a==1||{{a}}}}`.
- **C6** ffd5c051 v3 : correction par √2 = 2^{1/2} (exposant rationnel, hors programme TSPE et TCOMP) → « 2 = √2 × √2,
  donc ln 2 = 2 ln √2 ».
- **Niveau** : 8b599a53 passe de `1_SPE` à `T_SPE` dans son fichier (D3 de `questions-1spe`, Q3 ici) : `--mettre-a-jour`
  écrit les niveaux (grades).
- Écartés : « 4/(6x) » non simplifié dans une étape de 7844be9a v3 (étape intermédiaire) ; −12(−6x + 1) non développé
  (50feeefd v3, forme acceptée).

**Tags restants (migration Q3, plus tard)** : f1963ef2 → TSPE-447 ; 806c10f4 et 04ec9518 restent sur 415 (401 / 581
« à doubler d'un modèle ou retaguer », § 3.7).

**Simulations** : refusées au mode auto (« Modify Shared Resources ») → David.

**Page à cocher** : https://claude.ai/artifact/2D9SVXyUhRM7W7YxjNuEMA (26 fiches), collection `verdicts` vide à la
publication ; 2491dd75 : bloc ```variation non dessiné (le jouer dans l'aperçu).

## 8. Lot 0-intégration (convexité et calcul intégral) : vérification des brouillons

_2026-11-01. Les 9 brouillons de convexité écartés du § 7 (37ce7759, e3e19d28, 225c8682, 98f9d4b2, 08f9ad7b,
c4775a3a, e814175b, 21840f6c, a80a780f sans tag) et les 14 de la rubrique « Calcul intégral » : b52c53d8, fc2ea212,
822d0318, 95ee8348, 5e702745 (TCOMP-272 seul), a32e6d38, 164edf6b, 6ed907d7, 3b396d9c, 76843d15, dd0ee69a, 7a0b795c
(TCOMP-269 seul), f26151ff, 298e2335. Instantané `scripts/questions/tspe-0-integration/` (prod), une copie par
variation (61 variations, 2 tirages lus chacune, plus des tirages ciblés pour les branches de signe), choix corrects
recoupés avec leur option (première du fichier) et les branches `{{if:s>0|…}}` lues dans les fichiers._

**Mécanique** : 23 / 23 verts, 0 avertissement.

**Bornes** : rien hors bornes TSPE. TCOMP (D7) : primitives 2uu′, u′/u et eᵘu′ permises (TCOMP-276, 277, 279) ;
intégration par parties (fc2ea212) en `T_SPE` seul ; a32e6d38 (signe quelconque) : TCOMP-271 dit « présentation
seulement », le modèle reste une lecture d'aires de triangles, gardé.

**Constats (corrigés dans les fichiers, specs vertes, tirages relus)** :

- **C1** b52c53d8 v3 (m = 1) : toute la ligne « ln 2 − ln 1 = ln 2 » en couleur → seul « ln 2 » en couleur.
- **C2** 822d0318 v2 : « 0.5 ; 1.5 » écrits en dur à l'anglaise → `0{,}5`, `1{,}5`.
- **C3** 21840f6c v1 : « Pour ces quatre informations (sens de variation, abscisses et valeurs des extremums) » (trois
  dans la liste) → « Il faut **tout** vérifier (sens de variation, abscisses et valeurs des extremums) ».

**Niveaux** : aucune collision dans les 11 catégories du lot (relevé MCP, 2026-11-01).

**Pour la migration Q3** : 5e702745 intègre (t − 3)e^(−t²) ou t² − 3, de signe quelconque, alors que la borne de
TSPE-476 dit « continue positive » → TSPE-479 (signe quelconque) plutôt que 476 ? À trancher avec la migration.
a80a780f : ses 5 variations couvrent 586 (v0, v4 : f″), 585 (v1 : f′ croissante), 411 (v2 : tangentes ; 410 pour les sécantes), 412 (v3) ; 7a0b795c → 609 ; dd0ee69a : 481 → 608.

**Page à cocher** : https://claude.ai/artifact/CnJQhSYtdKHkJ3Yak7qSZH (23 fiches), collection `verdicts` vide à la
publication ; alertes : a80a780f sans point, 21840f6c bloc ```variation non dessiné (le jouer dans l'aperçu). Les
3 retouches ne sont pas encore en base : la page montre déjà les fichiers corrigés.

**Relecture (David, 2026-11-01)** : « je valide toute la relecture » (validation en bloc, aucun « À revoir »).
**Publication** : PR #2055 mergée (CI : deux jobs relancés, échecs sans lien — test `vercel-maintenance` sorti en
141, installation de Playwright coupée à 15 min) ; David a lancé `create-questions --publier --mettre-a-jour` et
`publier-lot --publier`. Relu en base : 23 / 23 `published`, les 3 retouches présentes.

## 9. Lot 0-primitives (primitives et équations différentielles) : vérification des brouillons

_2026-11-01. Les 18 brouillons du thème « Primitives et équations différentielles » (relevé MCP par tag et par
nœud, aucun brouillon non tagué sur ces nœuds) : primitives 3dbc5a7b (TSPE-602), fe25be0a, d0930e8c, 23402520
(467), 264b9c11, e332140f, 0cbbbe91, 5439aae4, 194a7c10, 11eac96b, 2d480f3d, f01270c2 (468) ; équations
différentielles 968f4295 (464), 32bb4b83 (469), 2a1413ff (607), e02fb162 (470), efb12f4b (TCOMP-250 seul),
624bf511 (TCOMP-249 seul). Instantané `scripts/questions/tspe-0-primitives/` (prod), une copie par variation
(59 variations, 2 tirages lus chacune), plages et `conditions` lues dans les fichiers pour les cas limites des
cases choix, tirages forcés sur les branches corrigées._

**Mécanique** : 18 / 18 verts, 0 avertissement.

**Bornes** : rien hors bornes TSPE. TCOMP (D7) : uⁿu′ (e332140f) et sin / cos (23402520, 264b9c11) sont en
`T_SPE` seul ; d0930e8c (1/x sur ]0 ; +∞[, 1/x² sur ]−∞ ; 0[) tient dans TCOMP-251 ; u′/u avec u > 0 sur
l'intervalle (11eac96b, 194a7c10), TCOMP-351 tenue.

**Cases choix** : efb12f4b v0 garde `k != a` (sans elle, deux bonnes réponses) ; v1 : la constante fausse b = −am
ne peut égaler ±m (|a| ≥ 2) ; 624bf511 v1 garde `y0 != m` (sans elle, f constante et aucune option juste).

**Constats (corrigés dans les fichiers, specs vertes, tirages forcés relus)** :

- **C1** 968f4295 v3 (f(1) = ±1) : « C = 1e⁵ », « f(x) = 1e⁵e^(−5x) » → « C = e⁵ », « f(x) = e⁵e^(−5x) » (et « −e⁵ »).
- **C2** efb12f4b v2 (k = 0) : « (la constante 0 disparaît en dérivant) » sous une primitive sans constante →
  phrase retirée quand k = 0.
- **C3** e02fb162 v0 (q = 0) : « h(0) = C = 4, donc C = 4 » → « h(0) = C = 4 ».

**Vus, laissés** : les titres « … vérifiant une condition » couvrent aussi des variations sans condition
(d0930e8c, fe25be0a, 23402520, 968f4295, 2a1413ff) — le titre est la clé de `create-questions`, on n'y touche pas.

**Niveaux** : aucune collision dans les 18 catégories du lot (relevé MCP, 2026-11-01).

**Pour la migration Q3** : 624bf511 et efb12f4b → 466 (D3, inchangé) ; rien de nouveau.

**Page à cocher** : https://claude.ai/artifact/9mQPicqp2fSD5i32CrwaMp (18 fiches), collection `verdicts` vide à la
publication. Les 3 retouches ne sont pas encore en base : la page montre déjà les fichiers corrigés.

**Relecture** : David valide les 18 fiches en bloc (2026-11-01, sans passer par la page : `verdicts` restée vide).

**Publication** (2026-11-01, #2084 mergée) : David a lancé `create-questions --publier --mettre-a-jour` (3 mis à jour : 968f4295, e02fb162, efb12f4b ; 15 identiques) puis `publier-lot` (simulation : 18 passent) et `--publier`. Relu en base (MCP) : 18 / 18 `published`, les 3 retouches présentes, anciens textes absents.

## 10. Lot 0-trigo (fonctions sinus et cosinus) : vérification des brouillons

_2026-11-01. 23 brouillons (relevé MCP par point et par domaine « Fonctions trigonométriques ») : 21 de niveau `T_SPE`
— 77b5e06d (600), 0a2d3681 (454), 7026a36a, cac2d6ed (459), 99c772c0, 4314e62e, 42f091c1, 32696595 (457), 7d552757,
9c7fb7cf, 463f483e, fccd570b (458), 7eec7032, 4c4d43dc (597), 8afc09bc, 7df468d6 (598), 68db64b0, 7b4b149a, f96d3e43
(599), 18855802 (456), 5072030d (601) — et fece187e, afd9b3ff (457, niveau `1_SPE`, laissés ici par D22 de
`questions-1spe`). 174e202b et dc4b8d08 restent hors lot (D17 de `questions-1spe`, sans point). Aucun en `T_COMP`.
Instantané `scripts/questions/tspe-0-trigo/` (prod), une copie par variation (80 variations, 2 tirages lus chacune),
puis 133 copies forcées sur chaque valeur de la première variable (π/6 … 5π/6, a et k aux bornes, signes) ;
cases choix recoupées avec l'ordre de la source (l'aperçu mélange les options) ; sorties dans le scratchpad._

**Mécanique** : 23 / 23 verts, 4 150 tirages réussis, 0 avertissement.

**Bornes** : équations sur ℝ, ]−π ; π] ou [0 ; 2π[ (lts-2 libre), inéquations sur [−π ; π] seulement (lts-2), les
quatre sens (lts-4), valeurs remarquables (lts-3), cos et sin (lts-1). Les titres « sur un tour » (463f483e, fccd570b,
fece187e, afd9b3ff) couvrent des énoncés sur [−π ; π] ou ]−π ; π] : titre = clé, laissé. Deux questions :

- **Q-T1** : 42f091c1 (3 variations) résout cos(2x) = a et sin(2x) = a (]−π ; π] et [0 ; 2π[) ; le BO dit « équation
  du type cos(x) = a ». Recommandé : garder (on pose X = 2x, la méthode reste celle de cos X = a).
- **Q-T2** : 7df468d6 (période de cos(ax + b), sin(πx)…) et 5072030d (périodes π, 2π/3, 4π, 2 lues sur la courbe)
  vont au-delà de « périodicité (2π) » (598) et de sa traduction graphique (601). Recommandé : garder (application
  directe de la 2π-périodicité, tirages bornés à a ≤ 6).

**Constats (corrigés dans les fichiers, specs vertes)** :

- **C1** 4c4d43dc v2 et v4 : « f est \textcolor{…}{\text{impaire}} » écrit hors des `$…$` (rendu brut) → mis entre
  `$…$` ; seuls cas des 23 fichiers (recherche de toute commande LaTeX hors formule).
- **Niveau** : fece187e et afd9b3ff passent de `1_SPE` à `T_SPE` dans leur fichier (Q3, D22 de `questions-1spe`) :
  `--mettre-a-jour` écrit les niveaux.

**Vus, laissés** : `\frac{ 11\pi}{ 12 }` (espaces, sans effet) ; 68db64b0, 7b4b149a, f96d3e43 rangés sur la notion
« Fonctions trigonométriques », comme leur point TSPE-599 ; fenêtre des courbes adaptée à a et b
(`y: ±(|a| + |b| + 1)`) ; `angles: 3pi/2` lu par le bloc `trig`.

**Niveaux** : aucune collision dans les 9 catégories du domaine (relevé MCP, 2026-11-01 ; les 6 publiés sont des
sous-domaines de 1re).

**Page à cocher** : https://claude.ai/artifact/H1UCsA6bvtH2LM65P7mYjw (23 fiches, 12 alertes « bloc trig non dessiné »,
voulu), collection `verdicts` vide à la publication. Les retouches ne sont pas encore en base : la page montre déjà les
fichiers corrigés.

**Relecture** : David valide les 23 fiches en bloc (2026-11-01, « je valide toute la relecture », sans passer par la
page : `verdicts` restée vide). Q-T1 et Q-T2 : les modèles concernés (42f091c1, 7df468d6, 5072030d) sont validés tels
quels, donc gardés.

**D-T1 (David, 2026-11-01, « je suis tes recos pour les questions »)** : Q-T1 gardé (cos(2x) = a, 42f091c1) ; Q-T2
gardé (périodes autres que 2π, 7df468d6 et 5072030d).

**PR** : #2095 mergée le 2026-11-01 (CI rouge d'abord sur une collision d'horodatage de `main`, réglée par #2093).

**Publication** (2026-11-01, #2095 mergée) : `create-questions --publier --mettre-a-jour` (3 mis à jour : 4c4d43dc,
afd9b3ff et fece187e passés en `T_SPE` ; 20 identiques), `publier-lot` (simulation : 23 passent) puis `--publier`
(David). Relu en base (MCP) : 23 / 23 `published`, C1 présente, ancien texte absent.

## 11. Lot 0-dénombrement : vérification des brouillons

_2026-11-01. 26 brouillons (relevé MCP : domaine « Dénombrement » et « Ensembles » de niveau `T_SPE`, plus tout modèle
tagué d'un point du dénombrement) : 89d49fae (305), ed01a843, a26e6e50 (306), 67b349ab (307), dfb727cd (308),
0965c56c, e76a43eb (309), dd23bf2d (311), 3aca54e9 (312), 7d9d9b81 (313), 4dcbae71 (314), 970dab52 (315),
f796ffc0, b500b44e (318), 4a1deda8, 0feeabaf (319), 2bae040c (320), 8a6e41cc (322, approfondissement), 96be181c
(323), a69dfde7 (325), c0b45c61 (542), 6a9a3d5b (543), 74604a26 (545), 0bde6091 (546), et ef3c495c (TCOMP-296 seul,
Q3 → 316), 07ebdcbe (TCOMP-288 seul, Q3 → 614). Quatre en `T_COMP` aussi (rangés « Loi binomiale / Coefficients
binomiaux ») : 4dcbae71, 970dab52, ef3c495c, 07ebdcbe. Instantané `scripts/questions/tspe-0-denombrement/` (prod), une copie par variation (62 variations, 2 tirages lus
chacune), tirages forcés sur les branches corrigées (k = 1, k = m, petites plages) ; sorties dans le scratchpad._

**Mécanique** : 25 / 26 verts à l'export ; 26 / 26 après C1, 0 avertissement.

**Bornes** : rien hors bornes TSPE. TCOMP (D7) : aucune formule factorielle dans les quatre modèles partagés (288,
296 : « pas de n!/(k!(n − k)!) ») ; chemins, triangle de Pascal, symétrie seulement. 89d49fae v2 et v3 (cœur ou
figure, pique ou as) : ensembles non disjoints, mais la correction découpe en ensembles disjoints, conforme à 305.
8a6e41cc (combinaisons avec répétitions) : approfondissement (322), gardé (D4).

**Cases choix** : f796ffc0, la bonne option est la première de la source dans les 4 variations (`case: 0`).

**Constats (corrigés dans les fichiers, specs vertes, tirages forcés relus)** :

- **C1** ed01a843 v2 : spec « 26²×10³ » rouge (attendu `products` + `form`, le correcteur ne rend plus que `form`) ;
  verdict `bad_form` inchangé pour l'élève → spec ramenée à `form`. Sans elle, la publication serait refusée.
- **C2** 7d9d9b81 v1 : « avec $3!=6$ » s'affichait « 3 ≠ 6 » (`!=` lu comme ≠) → `$3!\,=6$`.
- **C3** a69dfde7 v1 : « $i<j<k$ » s'affichait avec i en unité imaginaire → `$(\mathit{i}\,;j\,;k)$ avec
$\mathit{i}<j<k$`.
- **C4** 67b349ab v1 : « 4⁴ (et non 4⁴) » quand k = m → parenthèse seulement si k ≠ m.
- **C5** 07ebdcbe : « une position des 1 succès » → « un chemin est repéré par les numéros de ses épreuves
  réussies, pris parmi les n ».
- **C6** 8a6e41cc v0 : « Ni ordre, mais répétition permise » → « Pas d'ordre, mais répétition permise ».
- **C7** dd23bf2d : « des 4 livres : il y en a n! » (n jamais nommé) → « des 4 livres ; n objets ont n!
  permutations ».
- **C8** a26e6e50 : « A = {1 ; 2 ; … ; 3} », « B = {0 ; 1 ; … ; 2} » aux petites valeurs → plages m 4..9 (au lieu de
  3..9), k 3..6 (au lieu de 2..6).
- **C9** 6a9a3d5b (543, lien parties ↔ chemins) : la correction ne faisait pas le lien → « chaque chemin est un
  n-uplet de {P, F}, c'est-à-dire une partie de {1, …, n} : les numéros des lancers qui donnent Pile ».

**Vus, laissés** : e76a43eb (arrangements) et dd23bf2d (permutations) rangés en sous-domaine « Coefficients
binomiaux » au lieu d'« Arrangements et permutations » : le sous-domaine est dans la clé de `create-questions`, on
n'y touche pas ici. a26e6e50 : m = k + 1 donne Card(A) = Card(B), piège du 0 conservé. f796ffc0 v3 : option
« 5!/1! » possible (distracteur juste).

**Niveaux** : aucune collision dans les 10 catégories du lot (relevé MCP, 2026-11-01 ; « Ensembles / Cardinal et
produit cartésien » partagée avec deux brouillons de 2de, niveaux 1 et 2).

**Q-D1** : « Loi binomiale / Coefficients binomiaux » range Pascal (ef3c495c) au niveau 1, avant la
définition par les chemins (07ebdcbe, 2), la symétrie (970dab52, 3) et les cas k = 0, 1, n (4dcbae71, 4). Ordre
proposé : chemins 1, cas particuliers 2, symétrie 3, Pascal 4. Recommandé : oui, par `--mettre-a-jour` avec le lot.

**Pour la migration Q3** : ef3c495c → 316, 07ebdcbe → 614 (D3, inchangé) ; 4dcbae71 pourrait aussi porter 288
(déjà là) ; rien de nouveau.

**Page à cocher** : https://claude.ai/artifact/4t7Q3PGfNDJwymHikGujKh (26 fiches, aucune alerte), collection `verdicts`
vide à la publication. Les 9 retouches ne sont pas encore en base : la page montre déjà les fichiers corrigés.

**PR** : #2110.

**Relecture** : David valide les 26 fiches en bloc (2026-11-01, « je valide tout le lot du dénombrement », sans passer
par la page : `verdicts` restée vide).

**D-D1 (David, 2026-11-01, « je te suis »)** : nouvel ordre de « Loi binomiale / Coefficients binomiaux » retenu
(07ebdcbe 1, 4dcbae71 2, 970dab52 3, ef3c495c 4). Mais la voie proposée (`--mettre-a-jour`) est impossible : le niveau
est dans la clé de `create-questions` (`scripts/create-questions.ts:105`), un niveau changé dans un fichier créerait un
doublon ; une fois publiés, l'échange circulaire bute sur l'index unique `idx_question_templates_unique_category`
(niveaux provisoires nécessaires). Voie à choisir par David : **A** (recommandée) publier dans l'ordre actuel et faire
l'échange dans la migration Q3 ; **B** niveaux changés dans l'admin sur les brouillons, fichiers mis d'accord, puis
`--mettre-a-jour`.

**PR** : #2110 mergée le 2026-11-01 (CI verte).

**Publication** (2026-11-01, voie A, David) : `create-questions --publier --mettre-a-jour` (0 créé, 9 mis à jour :
les C1-C9, 17 identiques), `publier-lot` (simulation : 26 passent) puis `--publier` (26 / 26). Relu en base (MCP) :
26 / 26 `published` ; C2, C3, C5, C6, C7, C9 présentes en base (anciens textes absents) ; C1, C4, C8 (spec, condition,
plages) portées par le « mis à jour » du script.

## 12. Lot 0-géométrie dans l'espace : vérification des brouillons

_2026-11-01. 28 brouillons (relevé MCP : tout modèle tagué d'un point TSPE 326-377, 549-568 ou 625, et tout modèle
`T_SPE` des domaines de l'espace), tous de niveau `T_SPE`, aucun en `T_COMP`, tous rangés sur un nœud ; aucun modèle à
retaguer (Q3) : d6938108 (332), ac94a453 (333), affceacd, 40ddef82 (550), 68b13d33 (371), 1277a5b6 (345), 119b9148
(557), 62e446cb (346), 7c8bd127 (558), 294206b9 (352), 536db399 (353), ca36b9c4 (354), 23644a9c (563), c22cea08 (559),
eae25eba (370), 95f04c3e (369), 31b49cdf (562), 34b03dee (360, approfondissement), bf13ac32, 646b4cd3 (376,
approfondissement), 35697e01 (364), d192da3e (367), 33be404b (366), 0003deae (365), 91c7b083 (565), 2b240d8c (375,
approfondissement), 0808e518 (372), 3bace561 (567). Instantané `scripts/questions/tspe-0-geometrie-espace/` (prod),
une copie par variation (59 variations, 2 tirages lus chacune), puis les branches des cases choix forcées une à une
(`sel` 0-2, `o` 0-1 : 3bace561 v0 et v1, 536db399, 23644a9c, 40ddef82, 68b13d33, 200 tirages chacune) ; cases choix
recoupées avec l'ordre de la source ; sorties dans le scratchpad._

**Mécanique** : 28 / 28 verts, 5 900 tirages réussis, 0 avertissement (avant et après les retouches).

**Bornes** : repère orthonormé partout où il faut (364-370) ; systèmes à deux inconnues au plus, résolus par
substitution (lts-6) ; positions relatives de deux plans décidées sans chercher la droite d'intersection (lts-7) ;
vecteur normal à (ABC) **déterminé** seulement dans 2b240d8c, rangé en approfondissement 375 (lts-8), comme sa v1
(vecteur directeur de l'intersection de deux plans) : gardés (D4), avec 34b03dee (360), bf13ac32 et 646b4cd3 (376).

**Constats (corrigés dans les fichiers, specs vertes, tirages relus)** :

- **C1** 7c8bd127 (polarisation) : ‖u‖, ‖v‖, ‖u + v‖ tirés sans lien (2..8, 2..8, 2..12) → normes impossibles
  (‖u‖ = ‖v‖ = 2, ‖u + v‖ = 12) → conditions `|a − b| ⩽ c ⩽ a + b` (200 tirages relus : 0 impossible).
- **C2** 62e446cb (distance AB) : A = B possible (six coordonnées tirées seules) → condition A ≠ B.
- **C3** 40ddef82 (trois points alignés ?) : quand ils le sont, la correction ne vérifiait que l'ordonnée
  (« Or 2×(−2) = −4 = −4 ») → elle vérifie l'ordonnée et la cote.
- **C4** 3bace561 v0 : « 3×1+(8)=0 » → `{{d;+}}` (« 3×1+8=0 »).
- **C5** 3bace561 v1 (plans sécants) : « −3×1−1×7=−10≠0 » sans dire ce qu'on calcule → précédé de
  « x_n y_n′ − y_n x_n′ = », comme 23644a9c.
- **C6** 34b03dee v1 (sphère ∩ plan) : δ calculé par la formule |ax₀ + by₀ + cz₀ + d| / ‖n‖, que le programme ne donne
  pas (562 : « distance d'un point à un plan par la projection orthogonale »), et H, M jamais définis → correction
  réécrite par la projection : H = Ω + t·n, 9t + 3δ = 0, δ = |t|·‖n‖ ; puis Pythagore dans ΩHM, rectangle en H, M point
  du cercle. **À valider par David** (relecture).

**Vus, laissés** : « √14 = √14 » quand la racine ne se simplifie pas (119b9148, 62e446cb : aucun moyen simple de tester
le facteur carré dans le gabarit) ; « 0 + (−2)×2 » quand la coordonnée de départ est nulle (33be404b, 0808e518) ;
0808e518 v0 ne montre pas la substitution (« Soit 3t + 9 = 0 ») ; d192da3e v1 (plan médiateur, point 358 classé A au
§ 3.4) est une variation du 367 : le lot 6 pourra noter 358 « couvert par » ; niveaux qui commencent à 2 ou 3 dans
plusieurs sous-domaines (Angles, Orthogonalité, Sphère…), sans effet sur la publication.

**Niveaux** : aucune collision dans les 17 catégories du lot (relevé MCP, 2026-11-01 : les 28 brouillons sont les seuls
modèles des trois domaines).

**Page à cocher** : https://claude.ai/artifact/Q9aWgUEffiZJ6696ytMRA3 (28 fiches, aucune alerte), collection `verdicts`
vide à la publication. Les 6 retouches ne sont pas encore en base : la page montre déjà les fichiers corrigés.

**PR** : #2121 mergée le 2026-11-01 (CI verte).

**Relecture** : David valide les 28 fiches en bloc (2026-11-01, « je valide le lot »), C6 comprise.
