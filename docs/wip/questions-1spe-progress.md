# Chantier « questions-1spe » — couvrir la première spécialité en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points` (décisions l1s-1 à l1s-6
> dans `1spe.md`). En base, le niveau est `1_SPE`. Chantiers par thème déjà faits (septembre-octobre 2026) :
> `suites-1spe`, `second-degre-1spe`, `derivation-1spe`, `exponentielle-1spe`, `trigo-1spe`,
> `produit-scalaire-1spe`, `geometrie-reperee-1spe`, `probas-cond-1spe`, `variables-aleatoires-1spe`,
> `logique-1spe`, `automatismes-1spe` (journaux dans `docs/wip/`).

## Reprendre ici

_Mis à jour le 2026-10-27, relevé fait._

- **État** : relevé (§ 1), premier regard sur l'existant (§ 2) et classement des 146 points sans modèle (§ 3) écrits.
- **Prochaine action** : réponses de David aux questions du § 5, puis vérification complète de l'existant (§ 2) ou phase 0 du premier lot, selon Q1.
- **En attente de David** : § 5 (Q1 à Q7).
- **Pièges en cours** : 172 brouillons déjà en base (Q1) ; QCM en réécriture (case « choix », `figure-et-choix`, pas en prod) ; droite à placer (`reponses-a-placer`) mergée, pas en prod ; un modèle porte au plus un point **par programme** (ADR 0020), les tags 1SPE + 1TECHNO + 1GEN sont donc permis.
- **Worktree / branche** : aucun.

## 1. Relevé (prod, 2026-10-27)

- **237 points** de 1re spé ; **91** ont au moins un modèle, **146** aucun.
- **207 modèles** `'1_SPE' = any(grades)` : **35 publiés, 172 brouillons** ; tous rangés sur un nœud.
- **Aucun modèle ne porte deux points de 1re spé** ; 51 portent aussi un point de 1TECHNO ou 1GEN (permis).
- **6 modèles sans tag** : 174e202b et dc4b8d08 (angles associés : simplifier), eae2ff6a (racines d'un
  polynôme, publié), 318ea542 (étude de fonction : par quoi commencer, publié), 93f9ecdf (reconnaître un type
  de raisonnement), f8ccc8b6 (vrai ou faux sur le second degré, publié).
- **6 modèles de niveau 1re spé tagués d'un point de seconde** : 5b20321f (2-204), db8b5dc8 (2-205),
  f98164b1 (2-212), 8c31675a (2-244), 8b59ca4b (2-378, publié), 5062197a (2-403).
- **Modèles tagués de terminale** (hors 1re, voulu) : 8b599a53 « Dériver g(ax + b) » (TSPE-408, l1s-1 :
  pas de composée en 1re) ; fece187e, afd9b3ff « Résoudre cos x = a / sin x = a » (TSPE-457 : pas d'équation
  trigonométrique en 1re). Leur niveau `1_SPE` est à revoir (Q3).

Points couverts (nombre de modèles) : 201, 202, 366, 204, 212, 213 (7), 215, 216 (8), 218, 219 (3), 221 (4),
223, 377 (4), 224 (6), 225 (6), 226, 227, 228, 229, 230 (2), 379 (3), 231 (2), 236, 237 (3), 243 (3), 244 (2),
245, 383 (2), 246 (2), 247, 384, 248 (2), 386 (4), 249 (2), 250, 253 (3), 254, 260, 261, 393, 265 (4), 394, 395,
266, 270, 272 (4), 274 (3), 281 (4), 283 (3), 401 (2), 287, 402, 289, 291, 292 (2), 405 (5), 406, 293, 294 (4),
295, 297, 409, 304 (2), 305, 410, 307, 312, 317 (2), 318 (2), 319 (2), 320 (2), 321 (6), 327, 330 (4), 331 (2),
332 (2), 418, 333, 419, 338, 340 (5), 341, 424, 348 (3), 349, 351, 353 (3), 355, 356 (3), 357 (3), 358 (2).

## 2. L'existant contre les bornes

_Premier regard (titres, tags) ; la vérification par tirages réels (`pnpm question:specs --apercu 5`) reste à
faire sur les 207 modèles (Q1)._

- Tags proposés pour les 6 sans tag : 174e202b, dc4b8d08 → 1SPE-307 (angles associés) ; eae2ff6a → 1SPE-386 ;
  318ea542 → 1SPE-283 ; 93f9ecdf → aucun point (1SPE-205 est un point-compétence) ou 1SPE-205 (Q3) ;
  f8ccc8b6 → à lire (vrai ou faux mêlant plusieurs points ?).
- Titres en double à départager par le niveau seulement (voulu : une famille, des niveaux) : « Calculer un
  terme » (5), « Calculer un terme d'une suite arithmétique » (4), etc. Rien à corriger a priori.
- Deux titres finissent par un point (87140df3 « Déterminer la forme canonique. », eae2ff6a) : coquille.

## 3. Points sans modèle, classés

Classes : **A** texte / formule seuls · **B** outil existant · **C** outil neuf · **D** non évaluable dans
les questions · **P** démonstration, point-compétence ou approfondissement « en aucun cas obligatoire »
(BO p.3) · **=** point de **contenu** dont une **capacité** voisine a déjà des modèles (même savoir, deux
lignes du BO) : à trancher (Q2).

### 3.1 Logique et algorithmique (8)

- **A** : 203 (quantifications implicites) ; 206, 367, 207, 208, 209, 210 (listes : programme Python
  montré, « que contient `L` à la fin ? »).
- **P** : 205 (contraposée, point-compétence).

### 3.2 Automatismes (3)

- **A** : 434 (coefficient directeur par deux points).
- **B** : 432 (signe d'une fonction lu sur ` ```courbe `).
- **C** : 433 (tracer une droite par un point et sa pente) — même geste que 2-316 / 2-445 (seconde, Q5 du
  journal `questions-2de`).

### 3.3 Suites (35)

- **=** : 211 (explicite, ≈ 223), 368 (récurrence, ≈ 377), 371 (≈ 224), 373 (≈ 225), 220 (limite intuitive,
  ≈ 231).
- **A** : 214, 217 (évolutions à accroissements constants, à taux constant), 372 (lien avec les fonctions
  affines), 374 (uₙ = e^{an}, lien avec l'exponentielle), 375 (énoncé → expression), 369, 378 (suite donnée par
  un algorithme, Python ou langage naturel).
- **B** : 370, 222, 376 (motifs géométriques, nombres figurés : ` ```figure ` ou ` ```collection `).
- **P** : 435 (compétence) ; 232, 233, 234, 235 (démonstrations) ; 380, 238, 239, 240, 241, 381, 242
  (approfondissements).

### 3.4 Second degré (11)

- **A** : 385 (factorisation éventuelle selon Δ), 252 (polynômes s'annulant en deux réels donnés).
- **B** : 382, 251 (signe d'une forme factorisée : ` ```variation ` en tableau de signes, réponse en case ou
  tableau à trous).
- **P** : 255 (démonstration) ; 256, 387, 257, 258 (approfondissements).

### 3.5 Dérivation (25)

- **=** : 389 (équation de la tangente, ≈ 272), 264, 391, 392 (dérivées de x², x³, 1/x, ≈ 266 et 265).
- **A** : 259, 268 (taux de variation), 397 (pente d'une sécante), 262, 390, 273 (approximation affine),
  263 (dérivable, fonction dérivée : vocabulaire), 396 (quotient — f1440b52 « Dériver un quotient » est tagué
  274, à retaguer ? Q3), 267 (|x| en 0, par le taux), 269 (nombre dérivé en contexte).
- **B** : 388 (sécantes sur ` ```courbe `).
- **C** : 271 (tracer la tangente connaissant f′(a)) — même geste que 433.
- **P** : 275, 276, 277, 398, 278 (démonstrations) ; 279 (approfondissement).

### 3.6 Variations et courbes (10)

- **A** : 280 (parité algébrique), 400 (fonctions constantes ⟺ f′ = 0), 282 (extrémum ⟹ f′(a) = 0, tangente
  horizontale), 285 (inégalité par les variations), 286 (position relative par le signe de f − g).
- **B** : 399 (parité lue sur ` ```courbe `), 403 (allure selon le signe de a : case choix de courbes).
- **P** : 284 (optimisation, compétence — un problème guidé reste possible en A), 288 (Newton).

### 3.7 Exponentielle (9)

- **=** : 290, 404 (propriétés algébriques, ≈ 294).
- **B** : 296, 407 (représenter t ↦ e^{−kt}, e^{kt} : case choix de courbes).
- **P** : 298, 299, 300, 301, 302.

### 3.8 Trigonométrie (6)

- **A** : 408 (longueur d'arc).
- **B** : 303 (cercle trigonométrique, ` ```trig `).
- **C** : 306 (placer un point sur le cercle) — geste « placer » sur ` ```trig `, absent (le `placer:` de
  `reponses-a-placer` est sur la droite graduée).
- **P** : 308, 411 (démonstrations), 309 (Archimède).

### 3.9 Produit scalaire (17)

- **=** : 310, 412, 313 (trois définitions du produit scalaire, ≈ 321), 311, 415 (orthogonalité, ≈ 318),
  316 (Al-Kashi, ≈ 319 / 320).
- **A** : 413 (symétrie), 414 (norme en base orthonormée), 314 (coordonnées par produits scalaires), 315,
  416 (développement de ‖u ± v‖²).
- **P** : 436 (compétence) ; 322, 323 (démonstrations) ; 324, 325, 326 (approfondissements).

### 3.10 Géométrie repérée (7)

- **=** : 417 (≈ 327), 328 (≈ 331), 329 (≈ 332).
- **P** : 437 (compétence) ; 334, 335, 420 (approfondissements).

### 3.11 Probabilités (15)

- **=** : 336 (≈ 341 / 424), 421 (≈ 340).
- **A** : 337 (partition de l'univers), 339, 426 (Bernoulli répétée, n ⩽ 4).
- **B** : 422, 342, 343 (arbre : ` ```probtree ` à trous), 423, 425 (tableau à double entrée à trous).
- **P** : 344, 427, 345, 346.

### 3.12 Variables aléatoires (19)

- **=** : 350 (≈ 357).
- **A** : 347 (X comme fonction de l'univers), 352 (König-Huygens), 428, 429, 430 (notations, langue ↔
  symboles), 354 (définir X et ses valeurs), 363 (lire une fonction Python de moyenne).
- **B ou D** : 364 (` ```simulation ` montre des moyennes d'échantillons ; la simulation elle-même relève des
  exercices Python).
- **D** : 362, 365 (simuler avec Python ou un tableur : exercices Python).
- **P** : 359, 431, 360, 361.

### Bilan

| Classe | Points | Suite                                                                              |
| ------ | -----: | ---------------------------------------------------------------------------------- |
| A      |     48 | lots de texte                                                                      |
| B      |     17 | lots avec ` ```courbe `, `variation`, `probtree`, `trig`…                          |
| C      |      3 | tracer une droite (433), une tangente (271), placer sur le cercle (306) : 2 gestes |
| D      |      3 | exercices Python (362, 365), 364 en partie                                         |
| =      |     23 | contenu doublé d'une capacité déjà couverte (Q2)                                   |
| P      |     52 | démonstrations, compétences, approfondissements (Q4)                               |

_(364 compté en D ; total 146.)_

## 4. Lots proposés (ordre)

0. **Les 172 brouillons** (Q1) : vérification contre les bornes, page à cocher, publication — par thème.
1. **Corrections et tags de l'existant** (§ 2, Q3).
2. **Dérivation : taux, sécantes, approximation** (259, 268, 397, 388, 262, 390, 273, 263, 269, 267, 396) — A, B.
3. **Variations et courbes** (280, 399, 400, 282, 285, 286, 403) — A, B.
4. **Suites : modélisation et algorithmes** (214, 217, 372, 374, 375, 369, 378) — A ; motifs (370, 222, 376) — B.
5. **Produit scalaire : formules** (413, 414, 314, 315, 416) — A.
6. **Probabilités : partition, Bernoulli, arbres et tableaux** (337, 339, 426, 422, 342, 343, 423, 425) — A, B.
7. **Variables aléatoires : notations et registres** (347, 352, 428, 429, 430, 354, 363) — A.
8. **Second degré, exponentielle, trigonométrie : restes** (385, 252, 382, 251, 296, 407, 408, 303) — A, B.
9. **Logique et listes Python** (203, 206, 367, 207, 208, 209, 210) — A.
10. **Points « = »** selon Q2.
11. Outils C, s'ils sont décidés (Q5).

## 5. Questions à David

_Posées le 2026-10-27 ; réponses consignées ici._
