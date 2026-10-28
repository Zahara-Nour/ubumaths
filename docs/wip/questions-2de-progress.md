# Chantier « questions-2de » — couvrir la seconde en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` → `["2"].points` (décisions l2-1 à l2-10
> dans `2de.md`). En base, la seconde est le niveau `2`.

## Reprendre ici

_Mis à jour le 2026-10-28, après #1906 (PR de migration du lot 2 bis A ouverte)._

- **État** : lots 1 et 2 publiés ; lot 2 bis A « lecture graphique » (8 modèles) mergé (#1906), créé en prod
  en brouillon par David le 2026-10-28 ; migration nœud + tag écrite (test rouge sans elle, 9/9 vert avec).
- **Prochaine action** : merger la PR de migration, `db:migrate` depuis le dépôt principal, vérifier en prod ;
  page à cocher du lot A ; puis lot B (inverse, √x, x³ : 2-342, 465, 343, 468, 344, 471).
- **En attente de David** : sort de la sonde `scripts/tmp-sonde-courbes.ts` + `tmp-montre.ts` (non suivis
  dans le worktree : en faire un vrai script, ou les effacer).
- **Pièges en cours** : test « cas rare » lent en CI (relancer) ; étiquettes C_f / C_g parfois serrées près
  d'une intersection (moteur du bloc).
- **Worktree / branche** : `../ubumaths-wt-questions-2de` · `feat/questions-2de-lecture-a-tags`.

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
- Migration `20261028170000_questions_2de_lecture_a_rangement_tags.sql` (gabarit du lot 2) et son test
  d’intégration : rouge sans la migration, 9/9 vert avec ; `security-auditor` : aucun finding bloquant.
