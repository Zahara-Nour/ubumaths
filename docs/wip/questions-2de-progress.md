# Chantier « questions-2de » — couvrir la seconde en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` → `["2"].points` (décisions l2-1 à l2-10
> dans `2de.md`). En base, la seconde est le niveau `2`.

## Reprendre ici

_Mis à jour le 2026-11-01, migration nœud + tag du lot 5 écrite (§ 34)._

- **État** : lots 1 à 4 publiés ; lot 5 (16 modèles) en prod en BROUILLON ; migration
  `20261101160100_questions_2de_droites_rangement_tags` + test d'intégration (rouge sans, 10/10 avec) en PR.
- **Prochaine action** : merge de la PR, puis `db:migrate` depuis la branche mergée (4 conditions), vérif MCP ;
  puis page à cocher (`page-a-cocher.ts` sur les 16, deux dossiers réunis).
- **En attente de David** : rien.
- **Pièges en cours** : horodatage de migration = max + 1 min de `origin/main` ET des worktrees ;
  `migration list --linked` avant `db:migrate` ; `page-a-cocher.ts` ne prend qu'un `--dir`.
- **Worktree / branche** : `../ubumaths-wt-questions-2de`, `feat/questions-2de-rangement-droites`.

## 1. Relevé (prod, 2026-10-27)

- **292 points** de seconde ; **36** ont au moins un modèle, **256** aucun.
- **51 modèles** `'2' = any(grades)` : 31 publiés, 20 brouillons ; tous rangés sur un nœud, tous tagués.
- **6 modèles de 1re spé** (brouillons sauf 8b59ca4b) tagués d'un point de seconde : 5b20321f (2-204),
  db8b5dc8 (2-205), f98164b1 (2-212), 8c31675a (2-244), 8b59ca4b (2-378), 5062197a (2-403).
- 5 modèles portent des points de **plusieurs programmes** — conforme à l'ADR 0020 (« un point par
  programme ») : 1cfc575d (2-399 + TSPE-616 + TCOMP-302), 77d6fedc (2-390 + TCOMP-302), f3e68e4b et 4016b05c
  (2-396 + TCOMP-302), 9d7c4d98 (2-398 + TCOMP-302). Leur niveau reste `['2']` seul (Q7).

Points couverts (nombre de modèles) : 2-403, 404, 405, 406, 204, 205 (2), 207, 210 (2), 408 (2), 212, 410,
214, 411, 491, 244, 245 (5), 420, 261 (2), 262 (7), 271 (2), 328 (2), 339, 458, 347, 474, 350, 366 (2),
367 (2), 377 (2), 378 (2), 379, 390, 488, 396 (2), 398, 399.

## 2. L'existant contre les bornes

Vérifié le 2026-10-27 (lecture seule) : `question:specs` des 57 modèles, 30 tirages par variation, tout
vert ; deux tirages lus par variation (énoncé, réponse, corrigé). Images des fonctions affines : une seule
regardée sur 30. Aucune passe antérieure pour le lycée (celle de l'arbre des notions s'arrêtait au collège).

### 2.1 OK

Ensembles 0598a535, 9724dc3d, 5676627b, 0a1ff14f ; « et / ou » 219c9470, 6c3ee9e6, 1e9a534f, 55341e85 ;
implication 5426cead, bed58c24, e05203b0 ; racines 0d2edda7, 498d6d3e, b1e27739, f57c0a5a ; valeur absolue
d6a810f4, 62b99aa7 ; calcul littéral 33eb676e, 34e569e7, d1648508 ; affines 09f0c9ec, ae0ad163, 75fe996a ;
évolutions c4372fd8, 1c443c35, 2562438e, e05bb79b (peut tirer une baisse de 100 %), 36abc642, bbd511cb ;
probabilités 1cfc575d, 9d7c4d98, 4016b05c, f3e68e4b, 77d6fedc, cf548ea1.

### 2.2 À reprendre

- **Niveau 1_SPE → 2** : 8b59ca4b, f98164b1, 8c31675a, db8b5dc8, 5062197a, 5b20321f (tagués d'un point de 2de).
- **8b59ca4b** : le corrigé cite « suite géométrique de raison … » (1re).
- **8c31675a** variation 1 (intervalles accolés) : réponse attendue `[0;1[∪[1;5]`, le corrigé dit `[0;5]`.
- **939153b6** (2-420, distance) : même titre que 62b99aa7, corrigé purement algébrique au lieu de la distance.
- **68db64b0, f96d3e43** (lire une image, un extremum) : courbes de sinus / cosinus, abscisses π/2, π — le
  sinus n'est en 2de que dans le triangle rectangle. Refaire avec des abscisses entières.
- **4cc21ccd, c7cdca01** (« signe d'une expression » sachant x > 0 / x < 0) tagués 2-328 (signe d'une
  fonction affine) : ce n'est pas ce point ; aucun point de 2de ne le décrit mieux (Q7).
- **a26e6e50** (Card(A × B)), **db8b5dc8** (couple dans A × B) : borne 2-205 déduite, « notion rencontrée »,
  sans notation A × B (Q7).

### 2.3 Doublons

- Développer (a+b)² : 85f6e96e et 288c2bf0 ((a+bx)², (a+x)²) ; (a−b)² : 1338da34 et 6909bfde → une fiche à
  plusieurs variations chacun.
- « Calculer la valeur d'une valeur absolue » ×4 : 226e5b3b = d540f96e à fusionner ; 6ece66a6 (expressions)
  et d03e49c0 (√a − b) à retitrer.
- « Trouver le coefficient multiplicateur » : d98aa53a (diminution) et e12e58cb (augmentation) → fusion
  possible.

Détail par modèle : `scratchpad/verif-2de.md` de la session (non versé ; ce paragraphe en est le résumé).

## 3. Points sans modèle, classés

Classes : **A** texte / formule seuls · **B** outil existant · **C** outil neuf · **D** non évaluable dans
les questions · **P** point-compétence, -démonstration ou approfondissement « en aucun cas obligatoire »
(BO p.4) : à trancher (Q2).

### 3.1 Vocabulaire ensembliste et logique (13 sans modèle ; 407 rangé en 3.4)

- **A** : 201 (appartenance), 202 (ensemble vide), 203 (symboles), 206 (notation du complémentaire), 208
  (proposition ?), 209 (variables dans une proposition), 211 (négation), 213 (implication), 409
  (équivalence), 215 et 412 (« pour tout », « il existe » en mots).
- **P** : 216 (disjonction des cas), 217 (absurde) — points-compétences.

### 3.2 Algorithmique et programmation (22 sans modèle)

- **A** (programme Python montré en bloc de code, « que vaut `x` à la fin ? », « quel type ? ») : 218, 219,
  220, 221, 222, 413, 223, 229, 416, 228, 232, 233, 417.
- **D** dans les questions, couverts par les **exercices Python** (Pyodide) : 224, 414, 415, 225, 226, 227,
  231, 234, 230 (écrire, programmer). Une case « compléter la ligne manquante » reste possible (Q3).

### 3.3 Automatismes (5 sans modèle)

- **A** : 489 (calcul littéral multiplicatif), 490 (le tout par une partie), 402 (interpréter un quartile).
- **B** : 492 (antécédents sur une courbe, ` ```courbe `), 401 (périmètre d'un polygone, ` ```figure `).

### 3.4 Nombres réels et arithmétique (27 + 407)

- **A** : 235, 236, 418, 419, 237 (multiples, diviseurs, parité), 238 (fraction irréductible), 243, 407
  (notation des intervalles), 246 (|x − a| ⩽ r → intervalle), 247, 421, 248, 422, 252 (appartient à un
  intervalle ?), 253 (encadrement), 254 (arrondi, chiffres significatifs).
- **B** : 249 (lire une abscisse, ` ```line `) ; 250 (placer un réel : `placer:` de `reponses-a-placer`,
  **pas encore en prod**) ; 251 (représenter un intervalle : case choix de droites à `segments:`).
- **P** : 239, 240, 255, 256 (démonstrations) ; 241, 242, 257, 258, 259 (approfondissements).

### 3.5 Algèbre (34 sans modèle)

- **A** : 260, 270 (puissances), 423 (√a² = |a|), 272 (écritures fractionnaires), 263, 424 (inégalités),
  264, 425, 276, 427, 277, 428 (comparer par différence, par rapport), 265, 266, 279, 429, 430, 280, 431,
  432 (premier degré), 267 (produit nul), 269 (quotient = k), 281 (x² = a), 273, 274 (exprimer une variable),
  275 (choisir la forme), 278 (modéliser par une inéquation).
- **B** : 268, 426 (signe d'un produit, d'un quotient : ` ```variation ` en tableau de signes ; forme de la
  réponse en Q4).
- **P** : 282 (démonstration) ; 283, 284, 285, 286 (approfondissements).

### 3.6 Vecteurs et géométrie (32 sans modèle)

- **A** : 433 (vecteur nul), 290 (colinéarité), 292 (base orthonormée), 434, 294 (coordonnées de AB), 293
  (norme), 295, 435 (déterminant), 296 (milieu, vectoriel), 300, 436 (coordonnées d'une somme, de k·u),
  301 (distance), 302 (milieu), 303, 437 (alignement, parallélisme).
- **B** (` ```figure ` en repère, vecteurs dessinés ; réponse en case ou case choix) : 287 (égalité de
  vecteurs), 288 (représentants), 289 (k·u), 291 (combinaison de deux vecteurs), 299 (lire les coordonnées).
- **C** : 297 (représenter la somme), 298 (représenter un vecteur) — geste « tracer un vecteur » (Q5).
- **P** : 493, 494 (compétences) ; 304, 438 (démonstrations) ; 305, 306, 307, 308, 309, 310
  (approfondissements, dont démonstrations).

### 3.7 Droites du plan (21 sans modèle)

- **A** : 311, 312, 439, 313, 314, 440, 441 (équations, pente), 442, 443, 317, 318, 319.
- **B** (` ```courbe ` avec une droite tracée) : 315 (pente lue), 444 (vecteur directeur lu).
- **C** : 316, 445 (tracer une droite : placer deux points dans un repère — le `placer:` est en 1D seulement ;
  Q5).
- **P** : 320 (démonstration) ; 321, 322, 323, 324 (approfondissements).

### 3.8 Fonctions : représentation et équations (44 sans modèle)

- **A** : 325, 326 (ensemble de définition), 327, 331, 447 (point sur la courbe ?), 329 (signe des fonctions
  de référence), 455, 457 (affine), 460 (|x| < k), 461, 463 (x² = k, x² < k), 464, 466 (1/x), 467, 469 (√x),
  470, 472 (x³), 336, 448 (f(x) = k au choix de la méthode).
- **B** (` ```courbe `) : 333, 334, 335 (courbes de référence, case choix de courbes), 338, 453 (f = g, f < g
  graphiquement), 456, 340, 459, 341, 462, 342, 465, 343, 468, 344, 471 (résolutions graphiques).
- **B** (` ```variation `) : 330, 446 (tableau de signes d'un produit, d'un quotient), 337, 449, 450, 451
  (résoudre par un tableau de signes) — forme en Q4.
- **D** : 452, 454 (« à l'aide d'un outil numérique ») — hors appli, ou case avec calculatrice permise (Q6).
- **P** : 495 (compétence).

### 3.9 Variations et extrémums (21 sans modèle)

- **A** : 348, 357 (variations d'une affine selon m), 475, 476 (signe de |x|, x²), 355 (variations de x²),
  356 (comparer f(a) et f(b) numériquement).
- **B** : 345, 473, 346, 349, 352, 354, 477 (` ```courbe ` et ` ```variation `).
- **D** : 351 (logiciel, calculatrice ou Python pour décrire les variations).
- **P** : 353 (compétence) ; 358, 359, 360 (démonstrations) ; 361, 362, 363 (approfondissements).

### 3.10 Information chiffrée, statistique descriptive (19 sans modèle)

- **A** : 364, 376 (pourcentage de pourcentage), 365, 368, 478 (évolutions), 375 (effectifs, proportions),
  369 (linéarité de la moyenne), 370 (écart type, petite série), 371, 479 (ajout ou retrait d'une valeur),
  380, 481 (moyenne de séries en classes), 381, 382, 483.
- **B** : 372 (` ```histogramme `), 480, 482 (` ```frequences-cumulees `), 484 (comparer deux représentations).

### 3.11 Croisement de deux variables qualitatives (9 sans modèle)

- **B** (` ```tableau-croise `, à trous pour compléter) : 383, 384, 485, 385, 486, 386, 487.
- **P** : 387, 388 (approfondissements, fichiers d'individus).

### 3.12 Probabilités (8 sans modèle)

- **A** : 389 (loi des grands nombres, case choix), 395 (traduire en notations), 400 (P_A(B) ou P_B(A) ?).
- **B** : 391, 397 (` ```probtree `), 393 (arbre à trous `?`), 394 (` ```tableau-croise ` à trous).
- **B ou D** : 392 (simulation : ` ```simulation ` montre une série ; la programmer relève des exercices Python).

### Bilan

| Classe | Points | Suite                                                   |
| ------ | -----: | ------------------------------------------------------- |
| A      |    140 | lots de texte                                           |
| B      |     59 | lots avec ` ```courbe `, `line`, `variation`, `figure`… |
| C      |      4 | tracer un vecteur (297, 298), une droite (316, 445)     |
| D      |     12 | exercices Python, outil numérique                       |
| P      |     41 | à trancher (Q2)                                         |

## 4. Lots proposés (ordre)

1. **Corrections de l'existant** (§ 2).
2. **Équations et inéquations du premier degré** (265, 266, 279, 429, 430, 280, 431, 432, 267, 281) — A.
   2 bis. **Lecture graphique** (492, 338, 453, 456, 340, 459, 341, 462, 342, 465, 343, 468, 344, 471) — B `courbe`
   (Q1, David 2026-10-27).
3. **Puissances, racines, fractions** (260, 270, 423, 272, 238) — A.
4. **Vecteurs en coordonnées** (434, 294, 293, 300, 436, 301, 302, 295, 435, 303, 437) — A.
5. **Droites** (311 à 319 en A, 315, 444 en B).
6. **Fonctions de référence, résolutions** (A puis B `courbe`).
7. **Signes et variations** (B `variation`, `courbe`).
8. **Statistiques, évolutions, tableaux croisés, probabilités** (A et B).
9. **Nombres réels, arithmétique, intervalles** (A, B `line`).
10. **Ensembles et logique** (A).
11. **Algorithmique : lire un programme** (A).
12. Outils C, s'ils sont décidés (Q5).

## 5. Questions à David

Posées le 2026-10-27. **Décisions de David (2026-10-27) : mes recommandations, toutes validées** — sauf
Q8, corrigée après coup (voir sa ligne).

- **Q1 — Ordre des lots** : celui du § 4 (corrections d'abord, puis équations, puissances, vecteurs…) ?
  → **Ordre du § 4, la lecture graphique avancée juste après les équations (2 bis).** Les corrections d'abord : elles touchent des modèles publiés.
- **Q2 — Points P** (41 : démonstrations, compétences, approfondissements) : sans modèle, ou modèles plus
  tard (démonstration à reconstituer en case choix, approfondissement en niveau élevé) ?
  → **Aucun modèle pour l'instant** ; ces 41 points sont « sans modèle, voulu ». On y reviendra une fois le reste couvert (case choix en prod).
- **Q3 — Algorithmique** : « lire un programme » en questions (bloc de code Python + case) ; « écrire,
  programmer » laissés aux exercices Python, ou aussi « compléter la ligne manquante » en case ?
  → **Lire en questions ; écrire aux exercices Python** ; « compléter la ligne manquante » seulement pour l'affectation et la condition.
- **Q4 — Tableaux de signes** (268, 426, 330, 446, 337, 449-451) : case choix entre tableaux, cases sous le
  tableau, ou outil neuf « tableau de signes à compléter » (classe C) ?
  → **Cases sous le tableau** (signe sur chaque intervalle, valeur qui annule). L'outil « tableau de signes à compléter » (2de → Tle) = futur chantier, sans bloquer la 2de.
- **Q5 — Outils C** : tracer un vecteur (297, 298) et une droite dans un repère (316, 445), dans la suite de
  `reponses-a-placer` (placer en 2D) — à lancer, ou ces 4 points en case choix de figures ?
  → **Case choix entre figures pour l'instant** ; le geste « placer en 2D » plus tard, après `reponses-a-placer`.
- **Q6 — « À l'aide d'un outil numérique »** (452, 454, 351) : hors appli, ou case avec calculatrice permise ?
  → **Hors appli** : 452, 454, 351 restent sans modèle.
- **Q7 — Existant** : (a) Card(A × B) et la notation A × B dans 2-205 ? (b) 4cc21ccd / c7cdca01 : garder
  2-328 ou retirer le tag ? (c) niveau des modèles tagués 2de + terminale : `['2']` seul ou les deux ?
  → (a) db8b5dc8 garde 2-205 ; **a26e6e50 quitte la 2de** (dénombrement, TSPE-306). (b) **Tag 2-328 retiré** de 4cc21ccd et c7cdca01. (c) **`['2']` seul** ; vérifier avant d'y toucher que rien ne filtre par niveau là où on attend le tag.
- **Q8 — Doublons** : fusionner en variations (un modèle archivé) ou seulement retitrer ?
  → Validée : fusionner les quasi-identiques, retitrer les autres. ⚠️ **Corrigé après coup** : aucune paire n'est un vrai doublon — chaque paire est une **marche de niveaux** ((a+x)² niv. 5 / (a+bx)² niv. 7 ; (a−x)² 6 / (a−bx)² 8 ; |entier| 4 / |fraction, √, décimal| 5 ; augmentation 3 / diminution 4). Fusionner effacerait la progression → je propose de **seulement retitrer** (question reposée, phase 0 du lot 1).

## 6. Lot 1 « corrections » : phase 0 (proposée le 2026-10-27, à valider)

Gabarit : lot 0 du CE1 (`couvrir-un-niveau.md` § 7) — une PR **contenu** (script de lot → migration générée,
pour les modèles publiés ; `--mettre-a-jour` lancé par David pour les brouillons), une PR **rangement**
(niveaux, tags, nœuds, à la main). Aucune donnée d'élève sur les modèles touchés (relevé MCP : 0 tentative,
0 carte, 0 évaluation, 0 journal).

**Contenu**

| Modèle                                    | Statut    | Changement                                                                                                                            |
| ----------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 8b59ca4b                                  | publié    | corrigé : retirer « terme d'une suite géométrique de raison … »                                                                       |
| 8c31675a                                  | brouillon | variation 1 : intervalles accolés → réponse `[a ; d]`                                                                                 |
| 939153b6                                  | publié    | titre « Résoudre \|x − a\| = b avec la distance » ; corrigé : « les nombres à distance b de a : a − b et a + b »                      |
| 85f6e96e / 288c2bf0                       | publiés   | titres « Développer (a + x)² » / « Développer (a + bx)² » ; consigne « Développe et réduis : » unifiée                                |
| 1338da34 / 6909bfde                       | publiés   | « Développer (a − x)² » / « Développer (a − bx)² » ; même consigne                                                                    |
| 226e5b3b / 6ece66a6 / d03e49c0 / d540f96e | publiés   | « Valeur absolue d'un entier » / « … d'une somme, d'un produit » / « … de √a − b » / « … d'une fraction, d'une racine, d'un décimal » |
| e12e58cb / d98aa53a                       | publiés   | « Coefficient multiplicateur d'une augmentation » / « … d'une diminution »                                                            |

**Rangement**

- Niveau 1_SPE → 2 : 8b59ca4b (publié), f98164b1, 8c31675a, db8b5dc8, 5062197a, 5b20321f (brouillons).
- a26e6e50 (brouillon) : niveau T_SPE, tag 2-205 → TSPE-306, nœud de TSPE-306.
- 4cc21ccd, c7cdca01 (publiés) : tag 2-328 retiré ; nœud et statut gardés.
- 68db64b0, f96d3e43 (brouillons, courbes de sinus / cosinus) : **proposé** — niveau T_SPE, tag TSPE-599
  (courbes de sinus et cosinus), au lieu de les réécrire ; deux modèles neufs de 2de (2-491, 2-350) au lot 2 bis.

**Question d'accès** : qui pourra lire quoi qu'il ne pouvait pas lire avant ? **Personne** : aucune policy ne
change, aucun brouillon n'est publié. En miroir, personne ne perd l'accès à un modèle publié (rien n'est
archivé). Effets visibles : un prof qui filtre « seconde » voit 8b59ca4b (il ne le voyait qu'en 1re spé) ;
2-328 n'a plus de modèle.

**Décisions de David (2026-10-27)** : § 6 validé, avec mes deux corrections — **titres partagés gardés**
(c'est la convention de la base : 124 titres partagés par 480 modèles, la marche se lit au sous-titre ;
seuls les 4 « Développer » n'avaient pas de sous-titre) et **68db64b0 / f96d3e43 vers la terminale spé**
(TSPE-599). Niveaux des 6 modèles de 1re spé : **[2, 1_SPE]**, convenu avec la session `questions-1spe`
(leur D3) : le cahier de texte filtre les modèles au niveau exact de la classe
(`.contains('grades', [classData.grade])`), avec [2] seul la 1re spé les perdrait. La session 1re spé ne
touche pas ces 6 modèles, ni a26e6e50, 68db64b0, f96d3e43.

## 7. Lot 1, PR « corrections » (contenu + rangement, 2026-10-27)

Une seule PR, deux migrations (comme la 6e) ; branche `feat/questions-2de-corrections`.

- Instantané `questions-2de/etat-prod-2026-10-27/` (`questions-2de/releve-prod.ts`, lecture seule, points
  de 2 et T_SPE : la requête plafonne à 1 000 lignes) : md5 des 22 modèles = MCP ; 0 donnée d'élève.
- **Contenu** : `questions-2de/lot-corrections-2de.py` → `20261027192000_questions_2de_contenu` + fixture ;
  7 modèles (8b59ca4b, 8c31675a, 939153b6, 85f6e96e, 1338da34, 288c2bf0, 6909bfde). Vérifiés par
  `questions-2de/verifier-contenu.ts` (`checkTemplate` sur les lignes générées) : specs toutes vertes,
  1 500 tirages sans échec. 8c31675a : la réunion en deux morceaux de deux intervalles accolés est jugée
  `unoptimal_form` (`intervalForm`), spec ajoutée. Test `questions-2de-contenu.test.ts` vert (12) ; rouge
  sans la migration (garde du rollback : 0 modèle sur 7 au contenu posé).
- **Rangement** : `questions-2de/lot-rangement-2de.py` (générateur de la 6e, plus les tags **gardés**) →
  `20261027192100_questions_2de_rangement_tags` + fixture ; 11 modèles, 9 niveaux, 3 déplacements, 3 tags
  posés, 5 retirés, 6 gardés. Test `questions-2de-rangement-tags.test.ts` vert (21) ; rouge sans la
  migration (garde du rollback : 2 modèles sur 11).
- Revues : `security-auditor` sans finding bloquant (gardes TOUT ou RIEN, rollback avec tags gardés, md5
  prod = « avant » 7/7, 11 modèles conformes en prod ; mineurs : le rollback du contenu laisse avancer
  `updated_at`, comme la 6e). `code-reviewer` (opus) sans finding bloquant ; mineur corrigé : « avec un
  coefficient » faux une fois sur 7 (coefficient tiré = 1) → sous-titre « La lettre multipliée par un
  entier ». DoD : `check:incremental` 0 erreur, cliquet tenu, lint rapide vert.
- #1866 mergée le 2026-10-27 (Lint relancé une fois : ESLint annulé au délai de 20 min, pas une erreur) ;
  `db:migrate` joué depuis le dépôt principal ; MCP : 7 md5 = « après », niveaux / nœuds / tags du lot, statuts
  inchangés, 2-328 sans modèle.

## 8. Lot 2 « équations et inéquations du premier degré » : décisions (David, 2026-10-27)

Relevé MCP : aucun modèle sur les 10 points ; le collège (5e, 4e) répond « x = … », aucune inéquation ni
produit nul en base. Phase 0 validée telle que proposée (mes 4 recommandations).

- **Réponse** : une case `S = ?`, `answerKind: 'intervalles'` (comme 8c31675a, 9e1d084e) : `{3}`, `∅`, `ℝ`,
  intervalles ; borne non simplifiée = ½ ; « 3 » sans accolades ou « x ⩾ 2 » = faux. Niveau `['2']`,
  brouillons.
- **Équations** — Calcul littéral › Equations › « Ensemble des solutions » : 1 · 2-430 a + x = b (entiers ;
  décimaux) · 2 · 2-429 ax = b (solution entière ; fraction ; a fractionnaire) · 3 · 2-265 ax + b = 0
  (entière ; fraction) · 4 · 2-279 ax + b = cx + d (entière ; fraction ; a = c → ∅ ou ℝ) · 5 · 2-267 produit
  nul ((x − p)(x − q) ; (ax + b)(cx + d), fractions) · 6 · 2-281 x² = a (carré parfait ; sans facteur carré ;
  a = 0 ou a < 0 ; a simplifiable, √12 = ½).
- **Inéquations** — Calcul littéral › Inéquations › « Premier degré », les quatre sens tirés (l2-3) :
  1 · 2-432 a + x ⩾ b (entiers ; décimaux) · 2 · 2-431 ax ⩾ b (a > 0 ; a < 0) · 3 · 2-266 ax + b > 0
  (a > 0 ; a < 0) · 4 · 2-280 ax + b ⩾ cx + d (a − c > 0 ; a − c < 0 ; a = c → ∅ ou ℝ).
- 2-269 (quotient) hors lot. **Question d'accès** : personne (brouillons neufs, aucune policy).

## 9. Lot 2, PR des fichiers (2026-10-27)

- Script `questions-2de/lot-equations-2de.py` → `scripts/questions/2de-equations/` (10 modèles, 25 variations,
  83 specs) ; `create-questions` en simulation : tout vert.
- **Écart trouvé** : la case intervalles jugeait `{−√12 ; √12}` juste. David a choisi le correctif (option 1) :
  **#1877** mergée (racine simplifiable = ½ en borne, en ensemble fini, en ensemble de complexes ;
  `code-reviewer` opus : 0 faux positif sur 59 réponses justes sondées). Limites notées dans
  `convention-equivalence.md` : `\sqrt1` juste, `\mathbb{R}\setminus\{\sqrt{12}\}` non contrôlé.
- Relecture des tirages : corrigés retouchés (inverse de 1/q écrit q ; crochet expliqué selon le sens tiré).
- Base locale : 10 brouillons créés ; aperçu admin joué (x² = 9 : `{-3;3}` juste ; −4x ⩽ 19 : faux, corrigé
  « le sens change », S = [−19/4 ; +∞[).
- #1881 mergée le 2026-10-27 (CI verte du premier coup), worktree retiré.

## 10. Lot 2, migration nœud + tag (2026-10-27)

- David a lancé `create-questions --publier` : 10 brouillons en prod, niveau `2`, sans nœud ni tag (MCP).
- Nœud = celui du point : 2-430, 2-429 → Algèbre › Équations : premier degré ; 2-265 → … › ax + b = c ;
  2-279 → … › ax + b = cx + d ; 2-267 → Algèbre › Équations : produit et quotient › produit nul ; 2-281 →
  … › x² = a ; 2-432, 2-431, 2-280 → Algèbre › Inéquations : premier degré ; 2-266 → … › ax + b < c.
- Migration `20261027213000_questions_2de_equations_rangement_tags` (gabarit CP-C) + test d'intégration :
  9/9 vert, 5/9 rouge avec une migration vide ; `security-auditor` : aucun finding. PR #1882.
- #1882 mergée le 2026-10-27 (CI : garde de doc → commit `Doc-inchangée:`, test « cas rare » lent) ;
  `db:migrate` joué ; MCP : 10 modèles sur le nœud de leur point, 1 tag chacun, `updated_at` inchangé,
  brouillons. Page à cocher (aucune alerte sur les 10 fiches) :
  https://claude.ai/artifact/T8Emcjbfc7wPj4qnUd5ebk — rendu à 390 px non vérifié (fenêtre Chrome
  non redimensionnable).
- David : « tu n'as pas mis en forme le latex » → #1887 (gabarit de la page à cocher) : libellé du point,
  bornes et réponses des specs en KaTeX ; blocs `$$…$$` en mode bloc (`align` refusé en ligne) ; ℝ en
  Unicode (MathML de Chrome sans `double-struck`). Page republiée, verdicts gardés.
- Relecture : 10 OK sur 10 (verdicts comptés le 2026-10-28) ; `publier-lot.ts` en simulation : 10 brouillons
  passent ; #1877 vérifié sur `production` (v0.52.0).
- **Publié** par David le 2026-10-28 (`publier-lot.ts --publier`, 10/10) ; MCP : 10 `published`, rangés, tagués.

## 11. Lot 2 bis « lecture graphique » : relevé et phase 0 (proposée le 2026-10-28, à valider)

**Relevé MCP (prod, 2026-10-28)** : aucun modèle sur les 14 points. Aucun modèle de lecture graphique au
collège ni en 2de ; patron en 1re/Tle : 68db64b0 « Lire une image sur une courbe » (T_SPE, case + ` ```courbe `,
corrigé avec `points:` sur la courbe). Catégories prises en Fonctions : « Fonctions affines » (Apprivoiser
1-7, Equations 1-2, Variations-Signe 1-3), « Valeur absolue » (Apprivoiser 1-8, Equations 1-2) ; rien
d'autre.

Nœuds des points : 2-492 → Généralités › images et antécédents ; 2-338, 2-453 → Généralités › équations et
inéquations f(x) = k ; 2-456 → Fonctions affines › équations ; 2-340, 2-459 → Fonction valeur absolue ›
équations et inéquations ; 2-341/462 carré, 2-342/465 inverse, 2-343/468 racine carrée, 2-344/471 cube →
nœud « x… = k, x… < k » de chaque fonction.

Bornes : courbe fournie par l'énoncé (l2-2, vaut aussi pour √x et x³) ; |x| = k, |x| < k seulement (l2-1) ;
les quatre sens (l2-3) ; 2-338/453 graphiquement seulement.

**Phase 0 proposée** — un modèle par point (14), niveau `['2']`, brouillons :

- **Réponse** : une case `S = ?`, `answerKind: 'intervalles'` (comme le lot 2), réunion `∪` comprise ;
  2-492 : « les antécédents de k sont… » en ensemble `{−2 ; 1}`.
- **Lisibilité** : solutions sur des nœuds de la grille (entiers ; demis pour 1/x avec grille 0,5).
  x² = k : k ∈ {1, 4, 9} ; √x = k : k ∈ {1, 2, 3} ; x³ = k : k ∈ {−8, −1, 1, 8} ; 1/x = k : k ∈ {±½, ±1,
  ±2} ; |x| = k : k ∈ {1…4}. Une variation « aucune solution » par équation (k < 0 pour x², |x|, √x ;
  k = 0 pour 1/x) et k = 0 pour x², |x| ({0}).
- **Généralités** (2-492, 2-338, 2-453) : courbes sur [a ; b] fermé, construites pour tomber sur la grille
  (f = g + c(x − p)(x − q) avec g affine ; antécédents : f = k + c(x − p)(x − q)(x − r)) ; bornes du
  domaine fermées.
- **Corrigé** : même courbe + droite y = k (ou la seconde courbe) en pointillé, points d'intersection
  nommés ; pour une inéquation, la partie de la courbe solution repassée en couleur (`sur [..]`).
- **Erreurs typiques en specs** : crochet du mauvais côté, x lu sur l'axe des y, oubli de la solution
  négative (x² = 4), √x < 2 → ]−∞ ; 4[ au lieu de [0 ; 4[, 0 inclus pour 1/x, « 3 » sans accolades.
- **Catégories** (Fonctions › domaine › « Lecture graphique ») : Généralités 1 · 492, 2 · 338, 3 · 453 ;
  Fonctions affines 1 · 456 ; Valeur absolue 1 · 340, 2 · 459 ; Fonction carré, Fonction inverse,
  Fonction racine carrée, Fonction cube : 1 · équation, 2 · inéquation.
- **Découpage** : deux PR de 8 et 6 modèles (A : généralités, affine, |x|, carré ; B : inverse, racine,
  cube), chacune avec sa migration nœud + tag.
- **Question d'accès** : personne (brouillons neufs, aucune policy).

**Décisions de David (2026-10-28)** : phase 0 validée avec mes trois recommandations — réponse en ensemble
pour 2-492 ; deux PR (A : 8 modèles, B : 6) ; **pas** de variation « aucune solution » pour 1/x = 0
(lecture d'asymptote, à la limite du programme) : le cas ∅ reste pour x², |x|, √x.

## 12. Lot 2 bis A, PR des fichiers (2026-10-28)

- Script `questions-2de/lot-lecture-a-2de.py` → `scripts/questions/2de-lecture-a/` (8 modèles, 14 variations,
  57 specs) ; `create-questions` en simulation : tout vert.
- Sonde des blocs ` ```courbe ` tirés (3 200 tirages, énoncé et corrigé) : deux défauts corrigés avant la
  PR (nom `h` répété dans le corrigé « entre les points » ; fenêtre en fraction d²/4 → `floor` / `ceil`).
- Base locale : 8 brouillons ; aperçu joué (f(x) < g(x) : `]−4 ; −1[` juste, corrigé avec la partie verte et
  les disques vides en A et B ; affine décroissante dessinée).
- #1906 mergée le 2026-10-28 (CI : test « cas rare » relancé, puis verte).

## 13. Lot 2 bis A, migration nœud + tag (2026-10-28)

- Brouillons créés en prod par David le 2026-10-28 : 08c059b8 (2-462), 17809937 (2-492), 406fd9a8 (2-338),
  7efd2e76 (2-453), 9c4f6b4f (2-341), a55ad3b4 (2-456), b807cc6c (2-340), cbf00ce7 (2-459) ; relevé MCP :
  brouillons, niveau 2de, sans nœud ni tag ; les 8 points sans aucun tag.
- Migration `20261028183000_questions_2de_lecture_a_rangement_tags.sql` (gabarit du lot 2) et son test
  d’intégration : rouge sans la migration, 9/9 vert avec ; `security-auditor` : aucun finding bloquant.
- Horodatage `20261028170000` pris entre-temps par le CE1 → migration renommée `20261028183000`.
- #1912 mergée le 2026-10-28. `db:migrate` refusé par la CLI (prod en avance : `20261028193700`, `200000`) ;
  `--include-all` refusé par le classifieur du mode auto → lancé par David.
- `db push --include-all` lancé par David ; MCP : migration inscrite, 8 modèles sur le nœud de leur point,
  1 tag chacun (le bon), `updated_at` inchangé, brouillons. Page à cocher (aucune alerte sur les 8 fiches) :
  https://claude.ai/artifact/XapqZRQbt9Zz1bqUuDf2Mn — rendu vu à ~600 px (largeur mini de la fenêtre
  Chrome), courbes et KaTeX dessinés, pas de défilement horizontal.

## 14. Lot 2 bis A, solutions sur l'axe des x (2026-10-28)

- Relecture de la page (verdicts comptés) : 2 OK (01 antécédents, 02 f = g), 6 « À revoir », même remarque :
  « faire apparaître les solutions / l'intervalle solution sur l'axe des x ? ».
- Décision de David : **trait + points** (recommandation) pour **tout le lot** : inéquation → ensemble des
  solutions repassé en vert sur l'axe (`t(x) = 0 sur [a ; b]   vert`, disques selon les crochets ; ℝ → axe
  entier) ; équation → points `A'`, `B'`… sur l'axe (omis quand le point de la courbe y est déjà, via
  `{{if:k==0| |…}}` ; `S'` pour le sommet, `O` pour x² = 0) ; pas de verticale (le bloc n'a pas de segment).
- Variables `e`, `w` (ordonnées des intersections de f = g) ajoutées aux variations 02 et 03, et à leurs specs.
- Sonde : 2 400 tirages, 4 800 blocs, 0 problème ; base locale mise à jour ; page à cocher régénérée et
  republiée (version 2), rendu vu (f ⩽ g : [−4 ; 0] vert sur l'axe) ; simulation prod : 8 à mettre à jour.
- Instantané d'avant : les fichiers de #1906 (les brouillons en sont issus, aucune donnée d'élève).
- #1926 mergée le 2026-10-28 (CI verte du premier coup).

## 15. Lot 2 bis A publié (2026-10-28)

- David a lancé `create-questions --mettre-a-jour --publier` (8 mis à jour, 14 h 11) : en prod, les 8
  corrigés contiennent « sur l'axe des abscisses », trait vert dans les 4 inéquations seulement.
- Relecture : 8/8 OK sur la page à cocher. `publier-lot.ts` simulé vert, puis lancé par David :
  8/8 `published`, revérifié par MCP.
- Sonde : `tmp-sonde-courbes.ts` + `tmp-montre.ts` fusionnés en `scripts/questions/sonde-courbes.ts`
  (`--dir … [--tirages N]`, `--montre <fichier> [graine]`) ; essayée sur le lot A : 0 problème.

## 16. Lot 2 bis B, PR des fichiers (2026-10-28)

- Script `questions-2de/lot-lecture-b-2de.py` → `scripts/questions/2de-lecture-b/` (6 modèles, 9 variations,
  46 specs) ; `create-questions` en simulation : tout vert.
- 1/x : grille 0,5, on tire la solution `r`, k = 1/r ; k sort en `\dfrac{1}{2}`, illisible pour le bloc
  ` ```courbe ` → dans le bloc, `1/(r)` (droite et point A), description sans la valeur de k. 0 jamais
  solution (crochet ouvert, rappel dans le corrigé) ; la courbe repassée en vert n'a pas de disque en 0,
  l'axe en a un ouvert.
- √x : k < 0 et sens > ou ⩾ → `[0 ; +∞[` (erreur typique ℝ en spec) ; borne hors fenêtre = 20 (fenêtre
  jusqu'à 10).
- Sonde : 2 400 tirages, 4 800 blocs, 0 problème. Base locale : 6 brouillons créés.
- #1945 mergée le 2026-10-28 (CI verte du premier coup). Aperçu local : 1/x = 2, `{0,5}` juste (MathLive envoie
  `\lbrace0,5\rbrace`), corrigé « 0,5 » ; 1/x > 2, `]0 ; 0,5[` juste, partie verte et axe vus.

## 17. Message pour un ensemble écrit sans accolades (2026-10-28)

- David a répondu « 1 » à 1/x = 2 : faux (voulu), mais message « Réponse illisible : écris un intervalle
  comme ]2 ; 5] », qui égare. Accord de David pour un correctif à part, après le lot B (revue
  `code-reviewer` Opus : correction des réponses).
- Phase 0 proposée : attendu = ensemble fini de nombres, réponse = nombres sans accolades → faux, message
  « Un ensemble de solutions s'écrit entre accolades : {1}. » (ses valeurs) ; attendu intervalle, ∅ ou ℝ →
  message inchangé ; « x = 2 » hors champ sauf avis contraire. Validée par David le 2026-10-29, « x = 2 » compris ; réponse infinie exclue (revue Opus). Mergé dans #1951.

## 18. Lot 2 bis B, migration nœud + tag (2026-10-29)

- Brouillons créés en prod par David le 2026-10-29 : 60207cfd (2-342), 2d4c0b35 (2-465), 1ac09759 (2-343),
  a371b402 (2-468), 98892db9 (2-344), 52e58bd6 (2-471) ; relevé MCP : brouillons, 2de, sans nœud ni tag.
- Migration `20261029183000_questions_2de_lecture_b_rangement_tags.sql` (dérivée du lot A) et son test :
  5/9 rouges sans la migration, 9/9 verts avec ; `security-auditor` : aucun finding bloquant. PR #1946.
- #1946 mergée le 2026-10-29 (premier passage rouge : `Doc-inchangée:` mise dans la PR au lieu d'un commit).
  `db:migrate` le 2026-10-29 ; MCP : 6 modèles sur le nœud de leur point, 1 tag chacun (le bon),
  `updated_at` inchangé, brouillons. Page à cocher (aucune alerte) :
  https://claude.ai/artifact/Pg2wcdRUGdQpjQs3FdjJsb

## 19. Lot 3 « puissances, racines, fractions » : relevé et phase 0 (proposée le 2026-10-29)

**Relevé MCP (prod, 2026-10-29)** : 2-270, 2-272, 2-423, 2-238 sans modèle. **2-260 n'est plus vide** :
`questions-4` y a rattaché le 2026-10-28 a1ae1558, 2158a2fc, 17f3dfcd ((aᵐ)ⁿ et (10ᵐ)ⁿ, exposants 2 à 9,
« puissance de puissance »). La 3e couvre déjà produit et quotient de puissances d'un même nombre, exposants
relatifs, lettres comprises (bb9cff7b, 18761148), la définition de a⁻ⁿ (15368b02) et la simplification de
fractions (acbd2280, 90dca27a, c9d6c5db). Manquent en 2de, d'après l2-6 : (ab)ⁿ, (a/b)ⁿ et l'enchaînement
des règles.

Nœuds des points : 2-260 et 2-270 → notion « Puissances : calculs » (sous-notions : produit, quotient,
puissance de puissance) ; 2-423 → Racines carrées : calculs › propriétés ; 2-272 → Algèbre › Calcul
littéral › expressions fractionnaires ; 2-238 → Fractions : sens et écritures › simplification.

**Phase 0 proposée** : 8 modèles, niveau `['2']`, brouillons, une PR de fichiers puis une migration
nœud + tag.

1. **2-260 · Puissance d'un produit** : (2x)³ ; (−3x)² ; (2x²)³ = 8x⁶. Coefficient 2 à 5, exposants 2 à 4.
2. **2-260 · Puissance d'un quotient** : (x/3)² ; (2/x)³ ; (2/3)⁻² = 9/4 (exposant négatif → inverse).
3. **2-260 · Enchaîner les règles** (une seule puissance, réponse `x^?`) : (x²)³ × x⁻⁴ ; x⁵ × x³ / x⁻² ;
   (a⁻²)³ / a⁻⁴. Exposants relatifs entre −5 et 5, résultat ≠ 0 et ≠ 1.
4. **2-270 · Calcul numérique** : 2⁵ × 2⁻² / 2 (entier) ; (2³ × 3²)/(2⁵ × 3) → fraction irréductible ;
   (3 × 10⁴ × 4 × 10⁻²)/(6 × 10⁵) → notation scientifique.
5. **2-270 · Calcul littéral** : (2x³)² × 3x⁻¹ = 12x⁵ ; 6x⁴y / (2xy³) = 3x³/y² (x³y⁻² accepté).
6. **2-423 · √a² = |a|** : √((−5)²) ; √((1 − √2)²) = √2 − 1 (aussi 3 − π, √3 − 2) ; √((x − 2)²) sachant
   x < 2 → 2 − x, puis x > 2 → x − 2.
7. **2-272 · Écritures fractionnaires** (réponse : une seule fraction réduite) : numérique (a/b + c/d) ÷ e/f ;
   littéral à dénominateurs monômes : a/x + b/(2x), (2/x) ÷ (4/x²) = x/2, 1 + 1/x = (x + 1)/x.
8. **2-238 · Forme irréductible** : numérateur et dénominateur jusqu'à ~ 500, produits de 2, 3, 5, 7
   (84/126 = 2/3) ; corrigé par décomposition en facteurs premiers (lien multiples et diviseurs) ; une
   variation où la fraction est donnée en produits de puissances (2³ × 3² / (2² × 3³)).

- **Corrigé** : chaque règle nommée et colorée, comme bb9cff7b ; 2-423 dit le signe de a avant de conclure.
- **Erreurs typiques en specs** : (2x)³ = 2x³ ; (x/3)² = x²/3 ; x⁻³ × x⁵ = x⁻¹⁵ ; √((1 − √2)²) = 1 − √2 ;
  1/x + 2/x = 3/(2x) ; fraction non réduite.
- **Question d'accès** : personne (brouillons neufs, aucune policy).

**Questions à David** :

- **L3-a — Nœud de (ab)ⁿ, (a/b)ⁿ et de l'enchaînement** : aucune sous-notion ne leur va. → Je recommande
  la **notion « Puissances : calculs »** elle-même (le point y est rangé, aucun nœud neuf). Autre choix :
  une sous-notion « puissance d'un produit, d'un quotient ».
- **L3-b — 2-423 littéral** : √((x − 2)²) sachant x < 2 reste-t-il dans la borne « √a² = |a|, a réel » ?
  → Je recommande **oui**, en variation la plus difficile.
- **L3-c — 2-272 littéral** : dénominateurs monômes seulement (x, 2x, x²), ou aussi x + 1 (1/x − 1/(x + 1)) ?
  → Je recommande **monômes seulement**. Les dénominateurs affines reviendront avec le quotient = k
  (2-269, hors lot).

**Décisions de David (2026-10-29)** : phase 0 validée avec mes trois recommandations — L3-a notion
« Puissances : calculs » ; L3-b oui ; L3-c monômes seulement.

## 20. Lot 3, PR des fichiers (2026-10-29)

- Script `questions-2de/lot-puissances-2de.py` → `scripts/questions/2de-puissances/` (8 modèles, 23 variations,
  68 specs) ; `create-questions` en simulation : tout vert.
- Catégories (niveaux relevés en prod) : Puissances › Calculer › « Puissance d'un produit » 1, « Puissance
  d'un quotient » 1, « Mixer tout ça » 2 et 3 ; Calcul littéral › Calculs › « Avec des puissances » 3 ;
  Racines carrées › Manipuler › « Propriétés » 2 ; Calcul littéral › Transformation › « Écritures
  fractionnaires » 1 ; Fractions › Apprivoiser › « Simplification » 7.
- **Écart à la phase 0** (modèle 5) : 3x³y⁻² devait être accepté pour 6x⁴y/(2xy³). Le jugement exact le
  refuse (forme), et un motif `requiredForm` refusait aussi 3x³/y². La consigne demande donc « un quotient,
  sans exposant négatif » : 3x³y⁻² = forme refusée, 6x³/(2y²) = à améliorer.
- Relecture des tirages : « 1z/2 » corrigé (numérateur réduit à 1, modèle 7).
- Base locale : 8 brouillons créés ; aperçu admin joué ((2t³)² : 4t⁶ juste, correction lisible ;
  8 × 10⁷ × 9 × 10⁻⁴ : réponse fausse refusée, attendu 7,2 × 10⁴ affiché avec la virgule).

## 21. Lot 3, migration nœud + tag (2026-10-29)

- 8 brouillons créés en prod par David (`create-questions --publier`) : 04b1cc7f, 73514cdb, 634b55b8,
  fab2680b, 777c5d31, 37ef27bc, 33d8874a, b0c57a57 ; vérifiés : brouillons, sans nœud ni tag.
- Migration + test d'intégration (rouge sans : 5 échecs ; vert avec : 10/10, trigger `updated_at` réactivé
  vérifié sur l'idée du `security-auditor`, sans finding bloquant). #1982 mergée.
- `db:migrate` refusé : `…002000` antérieure à `…003000` et `…004700` jouées entre-temps par d'autres
  sessions. Renommée `20261030004900` (#1989 ; `…004800` pris par un worktree). Puis `migration list
--linked` : `20261030002300` (questions-3) aussi non jouée → `--include-all` nécessaire ; session
  questions-3 prévenue, rien poussé de mon côté.
- Jouée le 2026-10-29 par l'`--include-all` de questions-3 (avec `20261030002300`). MCP : les 8 en brouillon,
  2-260 et 2-270 sur la notion « Puissances : calculs », 2-423 sur « propriétés » (Racines carrées : calculs),
  2-272 sur « expressions fractionnaires », 2-238 sur « simplification » ; un tag chacun, le bon.
- Page à cocher (aucune alerte) : https://claude.ai/artifact/6CcVZNPqLQg1M8t3AjWZuk

## 22. Lot 3 publié (2026-10-29)

- Page à cocher : 8/8 OK, sans commentaire. Modèle 5 (consigne « quotient, sans exposant négatif ») marqué OK :
  écart du § 20 tenu pour accepté.
- `publier-lot.ts` en simulation puis lancé par David avec `--publier` : 8/8 publiés, relus au MCP.
- Serveur 5177 arrêté, worktree `ubumaths-wt-questions-2de` et sa branche retirés.

## 23. Lot 4 « vecteurs en coordonnées » : relevé et phase 0 (proposée le 2026-10-29)

**Relevé MCP (prod, 2026-10-29)** : les 11 points (2-434, 294, 293, 300, 436, 301, 302, 295, 435, 303, 437) sont toujours sans modèle, et leurs nœuds sont vides, tous niveaux confondus. Nœuds : 2-434, 294,
300, 436 → Géométrie › Vecteurs › coordonnées ; 2-293 → › norme ; 2-295, 435, 303, 437 → › colinéarité ;
2-301, 302 → Géométrie › Géométrie repérée › milieu et distance. Aucun modèle du plan en coordonnées, à
aucun niveau (seulement l'espace en Tle spé, en brouillon : `geometrie-espace-terminale/A-01`, `A-02`, qui
servent de patron).

**Outils (classe A, tous en prod)** : la case `answerKind: "vecteur"` (plan ou espace, en ligne `(3;-2)`
ou en colonne, jugée sur les coordonnées ; mode `colineaire` possible) ; la case choix (` ```choix `,
v0.56.0, déjà utilisée en 3e). Bornes : BO p. 9, base orthonormée pour la norme et le déterminant ;
milieu calculé quelle que soit la méthode (l2-8).

**Phase 0 proposée** : 11 modèles, un par point, niveau `['2']`, brouillons. Catégorie neuve :
Géométrie › Vecteurs du plan › Coordonnées / Norme et distance / Milieu / Colinéarité. Coordonnées
entières de −9 à 9 aux premières variations, puis fractions et décimaux (« produit par un nombre réel »).
Vecteurs écrits en colonne dans l'énoncé et le corrigé, comme en Tle.

1. **2-434 · Coordonnées d'un vecteur** : u⃗ = 3i⃗ − 2j⃗ → (3 ; −2) ; u⃗ = 4j⃗ → (0 ; 4) ; réciproque
   u⃗(−1 ; 4) → u⃗ = ?i⃗ + ?j⃗ (deux cases) ; u⃗ = −½i⃗ + 3j⃗.
2. **2-294 · Coordonnées de AB⃗** : A, B donnés → AB⃗ ; puis A et AB⃗ donnés → B ; puis coordonnées
   fractionnaires.
3. **2-300 · Coordonnées d'une somme** : u⃗ + v⃗ ; u⃗ − v⃗ ; AB⃗ + BC⃗ à partir de trois points (Chasles
   ou calcul, les deux mènent au même) ; combinaison 2u⃗ − 3v⃗ en dernière variation (L4-c).
4. **2-436 · Produit par un réel** : 3u⃗, −2u⃗ ; ½u⃗, −⅔u⃗ (réponse fractionnaire) ; trouver k tel que
   v⃗ = k u⃗ (k entier ou fraction).
5. **2-293 · Norme** : u⃗(3 ; 4) → 5 ; u⃗(2 ; −3) → √13 ; u⃗(2 ; 6) → 2√10 (L4-b) ; coordonnées
   fractionnaires (u⃗(⅓ ; ¼) → 5/12).
6. **2-301 · Distance AB** : points entiers → entier ou √n ; puis « AB = AC ? » en case choix (triangle
   isocèle en A, oui/non), corrigé par les deux distances.
7. **2-302 · Milieu** : I milieu de [AB] (coordonnées demi-entières) ; réciproque A et I → B ;
   centre d'un parallélogramme ABCD donné par A et C.
8. **2-295 · Déterminant** : det(u⃗, v⃗) entier ; puis avec une coordonnée fractionnaire ; puis
   det(AB⃗, AC⃗) à partir de trois points.
9. **2-435 · Critère de colinéarité** : « u⃗ et v⃗ colinéaires ? » en case choix (oui/non), corrigé par le
   déterminant ; trouver m pour que u⃗(m ; 3) et v⃗(4 ; 6) soient colinéaires (case).
10. **2-303 · Alignement** : « A, B, C alignés ? » en case choix ; C(x ; 5) aligné avec A et B → x.
11. **2-437 · Parallélisme** : « (AB) et (CD) parallèles ? » en case choix ; D(m ; …) pour (AB) ∥ (CD) → m.

- **Corrigé** : formule écrite puis appliquée, résultat coloré ; déterminant écrit xy′ − x′y avec les
  parenthèses des négatifs ; oui/non toujours justifié par le calcul.
- **Erreurs typiques en specs** : A − B au lieu de B − A ; norme sans racine (x² + y²) ; √(x + y)² ;
  milieu = différence / 2 ; xy′ + x′y ; déterminant nul lu « non colinéaires » ; k inversé (1/k).
- Les « oui/non » sont devinables à 50 % : chaque modèle à case choix a aussi une variation à calcul
  (trouver m, x), pour que le point ne se réussisse pas au hasard.
- **Question d'accès** : personne (brouillons neufs, aucune policy).

**Questions à David** :

- **L4-a — Deux lots** : 11 modèles dépassent la taille d'un lot (3 à 10). → Je recommande **4 A**
  « coordonnées, norme, distance, milieu » (434, 294, 300, 436, 293, 301, 302 : 7 modèles) puis **4 B**
  « colinéarité » (295, 435, 303, 437 : 4 modèles).
- **L4-b — Norme non simplifiée** : u⃗(2 ; 6) → √40 ou 2√10 ? → Je recommande **2√10 attendu, √40 « à
  améliorer »** (juste, mais à simplifier, l2-7) : motif `requiredForm` avec forme `acceptable`, comme
  au lot 3 (§ 20) ; à vérifier sur les tirages, sinon √40 juste.
- **L4-c — 2u⃗ − 3v⃗** : point 2-300 (somme) ou 2-436 (produit) ? Un modèle ne porte qu'un point. → Je
  recommande **2-300**, en dernière variation (la somme est le geste final).
- **L4-d — Case choix oui/non** pour colinéaires / alignés / parallèles / isocèle ? → Je recommande **oui**,
  doublée d'une variation à calcul dans chaque modèle (ci-dessus).

**Décisions de David (2026-10-29)** : phase 0 validée avec mes quatre recommandations — L4-a lots 4 A
puis 4 B ; L4-b 2√10 attendu, √40 « à améliorer » ; L4-c 2u⃗ − 3v⃗ sur 2-300 ; L4-d case choix oui/non
doublée d'une variation à calcul.

## 24. Lot 4 A, PR des fichiers (2026-10-30)

- Script `questions-2de/lot-vecteurs-a-2de.py` → `scripts/questions/2de-vecteurs-a/` (7 modèles, 24 variations,
  61 specs). Catégorie neuve Géométrie › Vecteurs du plan › Coordonnées (niveaux 1 à 4), Norme et distance
  (1, 2), Milieu (1).
- L4-b tenu sans motif : √40 pour 2√10 tombe seul en « à améliorer » (contrainte `reducedRadicals`).
- **Bug trouvé** : dans une case `vecteur`, chaque coordonnée était rejugée sans l'option `acceptDecimal`
  du modèle : (−2 ; 0,5) pour (−2 ; ½) refusé pour sa forme. Correctif à part, #1997 (même transmission que
  les matrices ; revue `code-reviewer` Opus sans finding bloquant). Le lot en dépend : **ses brouillons
  attendent le `deploy:prod` qui livre #1997** avant la page à cocher.
- Relecture des tirages : « −1 j⃗ » (coefficients ±1 retirés), k attendu « 3/1 » (entier si d = 1),
  conclusions colorées hors formule (en gras), B jusqu'à 21 (borné à 12).
- #1997 mergé. Base locale : 7 brouillons ; aperçu joué (A(3,5 ; −3), B(−3 ; 5,5) : virgules affichées,
  (−6,5 ; 8,5) « Juste »).
- **Lot 4 B** (§ 23, 4 modèles : 2-295, 435, 303, 437) : `questions-2de/lot-vecteurs-b-2de.py` →
  `scripts/questions/2de-vecteurs-b/` (9 variations, 26 specs), aucune case vecteur donc indépendant de #1997 ;
  base locale jouée (m faux refusé) ; PR à part #1999, mergée.

- #2008 (fichiers du lot 4 A) mergé le 2026-10-30 ; worktree retiré.

## 25. Lots 4 A et 4 B, brouillons en prod (2026-10-30)

- 11 brouillons créés par David (`create-questions --publier`), relevés au MCP : `draft`, `['2']`, sans nœud
  ni tag. Nœud = celui du point (§ 23) : Géométrie › Vecteurs › coordonnées / norme / colinéarité ;
  Géométrie › Géométrie repérée › milieu et distance.

| id                                   | modèle                                 | point |
| ------------------------------------ | -------------------------------------- | ----- |
| 583398f7-dc30-4f9d-bf81-7ae39e6a0d91 | Coordonnées d'un vecteur dans une base | 2-434 |
| 5a97d95a-8d28-40d6-a64c-79dbad34bc63 | Coordonnées du vecteur AB              | 2-294 |
| b9f06686-9c65-4fe6-bb38-aa787fea30a1 | Coordonnées d'une somme de vecteurs    | 2-300 |
| f26e24b9-abe3-45ca-84ee-dfeea372a5ef | Produit d'un vecteur par un réel       | 2-436 |
| cf08f061-198f-4432-a312-f903ca7cd5bf | Norme d'un vecteur                     | 2-293 |
| 576e8aed-3ea2-4bdd-8584-89d247fd3f03 | Distance entre deux points             | 2-301 |
| 59f818c4-e3e0-460c-8635-857236c61b13 | Coordonnées du milieu d'un segment     | 2-302 |
| 930711ec-0bb7-4cf0-bd78-c06140bc41c3 | Déterminant de deux vecteurs           | 2-295 |
| 84227334-c406-4d8f-a25a-ca0024599ae3 | Critère de colinéarité                 | 2-435 |
| 6514d084-b34e-4277-9e13-c1e3e65e0b78 | Trois points alignés ?                 | 2-303 |
| f53ad892-dba0-49b4-badb-0a3b6add8973 | Deux droites parallèles ?              | 2-437 |

- Migration à écrire sur le gabarit `20261030004900_questions_2de_puissances_rangement_tags.sql` et son test
  `tests/integration/questions-2de-puissances-rangement-tags.test.ts` (8 → 11 modèles, sous-notions
  « coordonnées », « norme », « colinéarité » sous Vecteurs, « milieu et distance » sous Géométrie repérée).

## 26. Lot 4, migration nœud + tag (2026-10-30)

- Migration `20261030160100_questions_2de_vecteurs_rangement_tags` + test d'intégration (rouge sans : 5 échecs ;
  vert avec : 10/10), `security-auditor` sans finding. #2014 mergée (rebase sur `origin/main` puis merge de la
  branche distante : le commit du journal y était déjà poussé).
- `db:migrate` : en file avec 150030 (1spe), 150100 (CM1), 160000 (questions-4) ; joué par David d'un seul
  `db push`. MCP : les 11 en brouillon, chacun sur la sous-notion de son point, un tag chacun, le bon ;
  `updated_at` préservé.
- `deploy:prod` v0.58.0 (2026-10-30, demandé par David) : #1997 en prod ; build Vercel prêt.

## 27. Lot 4, page à cocher (2026-10-30)

- `page-a-cocher.ts` sur les 11 fichiers des deux dossiers réunis (copie dans le scratchpad : le script ne
  prend qu'un `--dir`) : les 11 ids du § 25 retrouvés, `draft`, aucune alerte. Page (capacité `db`,
  collection `verdicts` vide au départ) : https://claude.ai/artifact/6WwvVGdVFZG1RUj8iWFbwo
- Publication : `publier-lot.ts` une fois par dossier (`2de-vecteurs-a`, puis `2de-vecteurs-b`).

## 28. Lot 4 A, vecteurs en deux trous (2026-10-31)

- Relecture de David (01 et 02, « À revoir ») : demander les coordonnées d'un vecteur avec deux trous,
  comme pour un point. La case `answerKind: "vecteur"` (choix de la phase 0, pas une décision de David)
  faisait écrire la colonne ou le couple. Passés en deux trous dans la colonne,
  $\vec{u}\begin{pmatrix}?\\?\end{pmatrix}$ : modèles 01 à 04 (11 cases), consigne réduite à « Donne
  ses coordonnées. », specs en deux réponses (spec « En colonne » retirée, sans objet).
- `create-questions` en simulation : 4 modèles « contenu différent », specs vertes. Base locale mise à jour ;
  aperçu joué (01, u⃗ = −7j⃗ : deux cases dans la colonne, (0 ; −7) « Juste »).
- #2048 mergée (shard client 1/2 relancé : navigateur de test fermé, sans lien). David a lancé
  `create-questions --publier --mettre-a-jour` : 4 mis à jour ; relecture : 7 « déjà en base » identiques,
  MCP : brouillons, nœud « coordonnées » et tag gardés. Page à cocher régénérée (même lien, version 2),
  verdicts de 01 et 02 supprimés.

## 29. Lot 4 publié (2026-11-01)

- Page à cocher : 11/11 OK, sans commentaire (01 à 04 relus dans leur version à deux trous).
- `publier-lot.ts` simulé vert sur `2de-vecteurs-a` (7) et `2de-vecteurs-b` (4), puis lancé par David avec
  `--publier` : MCP, les 11 `published`.
- Worktree `ubumaths-wt-questions-2de` retiré.

## 30. Lot 5 « Droites » : relevé et phase 0 (proposée le 2026-11-01, à valider)

**Relevé MCP (prod, 2026-11-01)** : 16 points de « Droites du plan ». 15 sans modèle (311, 312, 439, 313, 314,
440, 441, 315, 442, 443, 444, 316, 445, 317, 319) ; 2-318 a un modèle (336451af, f et g affines, « parallèles ? »
en case choix, sans variation à calcul) ; 2-320 = P (démonstration, Q2). Nœuds : Géométrie › Géométrie repérée ›
vecteur directeur (311, 315, 442, 443, 444) / équations de droites (312, 439, 314, 440, 441, 316, 445) /
intersection de deux droites (318, 319) ; 2-313 → Fonctions › Fonctions affines › coefficient directeur et
ordonnée à l'origine ; 2-317 → Géométrie › Vecteurs › colinéarité.

**Voisins en prod** : 2-303 « Trois points alignés ? » et 2-437 « Deux droites parallèles ? » (lot 4 B, par le
déterminant) ; 09f0c9ec « Déterminer le coefficient directeur » (2de, images PNG, tagué 2-347) ; 3e : lecture
du coefficient directeur sur un ` ```courbe ` (0d0e88f5, b9771108 : patron de 2-315).

**Outils (tous en prod)** : case `answerKind: "equation"` (droite jugée sur ses points : y = 2x + 1 et
4x − 2y + 2 = 0 tous deux justes ; `requiredForm` `reduite` / `cartesienne` possible ; patron
`geometrie-reperee-1spe/A-02`) ; ` ```courbe ` (droites, points, grille) ; case choix, dessins de ` ```courbe `
dans les choix (patron `fonctions-terminale/C-06`) ; case `vecteur` en mode `colineaire` (une seule case :
tout vecteur colinéaire juste). **Classe** : tout en A ou B ; 2-316 et 2-445 (tracer) en case choix entre
courbes (Q5).

**Phase 0 proposée** : 16 modèles neufs, un par point, niveau `['2']`, brouillons. Catégorie neuve
Géométrie › Droites du plan › Pente et vecteur directeur / Équations de droites / Positions relatives.
Coordonnées entières de −9 à 9 d'abord, puis pentes fractionnaires.

Lot 5 A « pente et vecteur directeur » (6) :

1. **2-313 · Pente par deux points** : A, B → m = (y_B − y_A)/(x_B − x_A) ; entière, puis fractionnaire ;
   puis « la droite (AB) a-t-elle une pente ? » quand x_A = x_B (case choix, corrigé : parallèle à l'axe des
   ordonnées).
2. **2-315 · Pente lue sur un graphique** : ` ```courbe ` d'une droite, pente entière puis fractionnaire
   (deux points à coordonnées entières marqués), négative ; corrigé : deux points, déplacements.
3. **2-442 · Pente lue sur une équation** : y = mx + p (m ≠ coefficient de tête : y = 3 − 2x) ; puis
   cartésienne ax + by + c = 0 → −a/b.
4. **2-311 · Vecteur directeur (connaissance)** : A, B donnés, « lesquels sont des vecteurs directeurs de
   (AB) ? » (case choix, `plusieurs: oui` : AB⃗, BA⃗, 2AB⃗, et des leurres (x_B + x_A ; …), (Δy ; Δx)).
5. **2-443 · Vecteur directeur lu sur une équation** : cartésienne → (−b ; a) ; réduite → (1 ; m).
6. **2-444 · Vecteur directeur lu sur un graphique** : ` ```courbe `, deux points de la droite.

Lot 5 B « équations, tracés, positions relatives » (10) :

7. **2-439 · Équation réduite** : « le point A est-il sur d : y = 2x − 1 ? » (case choix + calcul de
   l'ordonnée du point d'abscisse donnée) ; réduite d'une cartésienne (2x + y − 3 = 0 → y = −2x + 3),
   `requiredForm: reduite` ; droite verticale x = c.
8. **2-312 · Équation cartésienne** : « M appartient-il à d : 2x − 3y + 6 = 0 ? » ; écrire une cartésienne
   d'une réduite, `requiredForm: cartesienne`.
9. **2-441 · Point et pente** → équation (case `equation`, forme libre).
10. **2-314 · Deux points** → équation (forme libre) ; variation x_A = x_B → x = c.
11. **2-440 · Point et vecteur directeur** → équation (forme libre), corrigé par det(AM⃗, u⃗) = 0.
12. **2-316 · Tracer depuis l'équation réduite** : case choix entre 4 ` ```courbe ` (bonne, pente au signe
    changé, p et m échangés, p au signe changé).
13. **2-445 · Tracer depuis l'équation cartésienne** : même forme, b ≠ 0 (le bloc ne trace pas de verticale).
14. **2-317 · Alignement par une équation** : équation de (AB) écrite, C dessus ou non (case choix) ; puis
    ordonnée de C pour qu'il soit sur (AB). Le corrigé passe par l'équation, pour se distinguer de 2-303.
15. **2-318 · Parallèles ou sécantes** (2e modèle) : droites par équations cartésiennes ou réduite + cartésienne
    (case choix) ; puis m pour que d : mx + 2y − 1 = 0 soit parallèle à d′.
16. **2-319 · Point d'intersection** : deux réduites → (x ; y) en deux trous ; entier puis fractionnaire ;
    une droite verticale x = c.

- **Corrigé** : formule écrite puis appliquée, résultat coloré ; oui/non justifié par le calcul ; chaque
  modèle à case choix oui/non a une variation à calcul (L4-d).
- **Erreurs typiques en specs** : Δx/Δy au lieu de Δy/Δx ; y_B − y_A sur x_A − x_B ; pente a/b au lieu de
  −a/b ; vecteur (b ; a) ou (a ; −b) au lieu de (−b ; a) ; p de signe faux ; point d'intersection donné par
  x seul ; équation passant par un seul des deux points.
- **Question d'accès** : personne (brouillons neufs, aucune policy).

**Questions à David** :

- **L5-a — Un vecteur directeur n'est pas unique** (2-443, 2-444). Deux trous dans la colonne (§ 28) ne
  savent juger qu'une réponse ; tout vecteur colinéaire est juste. → Je recommande la **case `vecteur` en mode
  `colineaire`** (une case, (2 ; 6) et (1 ; 3) justes), le seul jugement qui accepte toutes les bonnes
  réponses ; autre voie : deux trous avec l'abscisse imposée (u⃗(1 ; ?)), juste mais qui souffle la méthode.
- **L5-b — Forme de l'équation** (2-314, 440, 441) : → Je recommande **forme libre** (réduite ou cartésienne,
  le BO ne fixe pas la forme), la forme imposée seulement dans 2-439 et 2-312 où elle est l'objet du point.
- **L5-c — Deux lots** : 5 A (6 modèles), puis 5 B (10) ? → Je recommande **oui**.
- **L5-d — 09f0c9ec** (lecture de pente sur image, tagué 2-347 « m taux d'accroissement ») : le laisser tel
  quel ? → Je recommande **oui** : il lit une fonction affine (branche Fonctions), le nouveau 2-315 lit une
  droite.

**Décisions de David (2026-11-01)** : phase 0 validée avec mes quatre recommandations — L5-a case `vecteur`
en mode `colineaire` (2-443, 2-444) ; L5-b forme libre (2-314, 440, 441), forme imposée en 2-439 et 2-312 ;
L5-c lots 5 A (6) puis 5 B (10) ; L5-d 09f0c9ec laissé tel quel.

## 31. Lot 5 A, PR des fichiers (2026-11-01)

- Script `questions-2de/lot-droites-a-2de.py` → `scripts/questions/2de-droites-a/` (6 modèles, 14 variations,
  43 specs). Catégorie neuve Géométrie › Droites du plan › Pente et vecteur directeur (niveaux 1 à 6, libres
  en prod). `cleanCoefficients` pour les équations tirées.
- `create-questions` en simulation : tout vert ; `sonde-courbes` : 0 problème (902 blocs sur 300 tirages).
- Relecture des tirages : « m = 5/1 » (01) et « y = 3/−4 x » (03) corrigés en valeurs calculées.
- Base locale : 6 brouillons ; aperçu joué : 02 (−1/2 lu sur la droite, « Juste »), 05 (y = 5x + 1, réponse
  (−2 ; −10) colinéaire « Juste »), 04 (choix mélangés, les trois vecteurs directeurs « coché, juste »).

## 32. Lot 5 B, PR des fichiers (2026-11-01)

- Script `questions-2de/lot-droites-b-2de.py` → `scripts/questions/2de-droites-b/` (10 modèles, 27 variations,
  77 specs). Catégories neuves Géométrie › Droites du plan › Équations de droites (01 à 07, niveaux 1 à 7 :
  2-439, 312, 441, 314, 440, 316, 445) et › Positions relatives (08 à 10, niveaux 1 à 3 : 2-317, 318, 319).
  Cases `equation` posées case par case (`answerKind` dans la case, pas en `blankDefaults` : les modèles
  mêlent choix et calcul) ; `requiredForm` réduite (01) et cartésienne (02) seulement.
- `question-specs` : 77/77, tirages tous réussis ; `sonde-courbes` : 0 problème ; `create-questions` en
  simulation contre la prod : « 10 à créer ».
- Relecture des tirages (`apercu-fichiers.ts`, nouveau : aperçu par variation des fichiers d'un lot) :
  `y=1x-2` dans `\textcolor` (le nettoyage ne passe pas la couleur) → coefficients par `{{if:…}}` ;
  `15--3` et `-4\times(-8)--4` → `{{k;()}}` ; `\iffx` → espace, étape `1x = …` sautée si m1 − m2 = 1 ;
  `y+0` → coordonnées non nulles.
- MCP (prod) : aucun modèle du lot 5 A en base, le `--publier` de David reste à faire.
- Base locale : 10 brouillons ; aperçu joué : 06 (y = −2x + 4, quatre droites dessinées, A « coché, juste ») ;
  01 v3 (12x − 3y − 18 = 0 : `y=6+4x` « Juste », `4x-y+6=0` « Faux » avec le message de forme réduite) ;
  10 v3 (x = −4 et y = −4x − 2 : I(−4 ; 14) en deux cases « Juste »).

## 33. Lot 5, brouillons en prod (2026-11-01)

David a lancé `create-questions --publier` sur `2de-droites-a` puis `2de-droites-b` : 16 créés. MCP : 16
`draft`, niveau `['2']`, niveaux 1 à 6 / 1 à 7 / 1 à 3 dans leurs trois catégories.

| Fichier                                 | Point | id                                   |
| --------------------------------------- | ----- | ------------------------------------ |
| A-01 pente par deux points              | 2-313 | 7d6cf480-b062-4e45-a593-2e85fbeb28b3 |
| A-02 pente lue sur un graphique         | 2-315 | f381c646-80fa-4cd2-86c0-0c3d9ad934be |
| A-03 pente lue sur une équation         | 2-442 | 49df6491-f424-4560-8fba-a9c302449e3d |
| A-04 vecteurs directeurs                | 2-311 | 7d605742-cf00-4282-b56c-c99aee16ad14 |
| A-05 vecteur directeur sur une équation | 2-443 | 36c21f21-fee5-4d2e-a191-364b42039cd1 |
| A-06 vecteur directeur sur un graphique | 2-444 | 2540ca82-26ca-443e-a5f7-5f87a49629e3 |
| B-01 équation réduite                   | 2-439 | 7f308eb4-40f9-408e-9c71-012464d0f79d |
| B-02 équation cartésienne               | 2-312 | 7c0f1c1a-e415-499c-97ac-cb6060f99105 |
| B-03 point et pente                     | 2-441 | e6552232-b549-4966-8863-1cba6f945fcc |
| B-04 deux points                        | 2-314 | 6e074f0e-0c3a-41b8-b70a-82cb402494b3 |
| B-05 point et vecteur directeur         | 2-440 | d8a958ba-c6f2-4e6b-b4c9-ee7b370cc03e |
| B-06 tracer, équation réduite           | 2-316 | 8d4bd94d-73f7-4589-8b3f-67c84edcf778 |
| B-07 tracer, équation cartésienne       | 2-445 | 2cfae58d-7fdb-45f7-8ea1-777a4a307b5a |
| B-08 alignement par une équation        | 2-317 | 7a3b209d-05b1-400d-98ba-e57d85639d05 |
| B-09 parallèles ou sécantes             | 2-318 | c23f5a94-269d-4f2d-915a-ca234cec67a6 |
| B-10 point d'intersection               | 2-319 | 718b7183-415b-4a86-bbf1-70a3c1eb0c6c |

## 34. Lot 5, migration nœud + tag (2026-11-01)

- Relevé MCP avant le SQL : les 16 en `draft`, sans nœud, sans tag ; chaque point sur le nœud du § 30.
  Question d'accès : tranchée en phase 0 (§ 30, personne).
- Migration `20261101160100_questions_2de_droites_rangement_tags` et
  `tests/integration/questions-2de-droites-rangement-tags.test.ts`, générés depuis ceux du lot 4 (seul le lot
  change). Rouge sans la migration (fichier vidé : 3 échecs, 5 sautés) ; vert avec : 10/10.
