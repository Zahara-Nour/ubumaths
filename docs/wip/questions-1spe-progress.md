# Chantier « questions-1spe » — couvrir la première spécialité en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points` (décisions l1s-1 à l1s-6
> dans `1spe.md`). En base, le niveau est `1_SPE`. Chantiers par thème déjà faits (septembre-octobre 2026) :
> `suites-1spe`, `second-degre-1spe`, `derivation-1spe`, `exponentielle-1spe`, `trigo-1spe`,
> `produit-scalaire-1spe`, `geometrie-reperee-1spe`, `probas-cond-1spe`, `variables-aleatoires-1spe`,
> `logique-1spe`, `automatismes-1spe` (journaux dans `docs/wip/`).

## Reprendre ici

_Mis à jour le 2026-10-27, lot 0-dérivation corrigé, page à cocher publiée._

- **État** : lots 0-suites (42) et 0-second-degré (14) publiés. Lot 0-dérivation (15 brouillons, § 8) : 4 corrigés retouchés (D13), page à cocher https://claude.ai/artifact/LmDNo6NwUSemJ3GLwoucK8, PR ouverte.
- **Prochaine action** : merger la PR ; David lance la simulation puis `create-questions --dir scripts/questions/1spe-0-derivation --publier --mettre-a-jour` (4 contenus différents attendus) ; relecture de la page ; `publier-lot --publier` par David ; relire statuts et contenus en base. Puis variations et courbes, exponentielle, trigo, produit scalaire, géométrie repérée, probabilités, variables aléatoires, logique ; ensuite la migration des tags D3.
- **En attente de David** : écritures en prod (`!`) et relecture de la page.
- **Pièges en cours** : `publier-lot` = tout le dossier ou rien ; un instantané porte l'id de chaque modèle ; `create-questions` et `publier-lot`, même en simulation, refusés par le classifieur → David les lance (`!`) ; worktree neuf → `pnpm exec svelte-kit sync` avant les scripts (`$lib`) ; `question:specs` n'a pas d'option de variation : copier le fichier une variation par fichier dans le scratchpad pour les voir toutes.
- **Worktree / branche** : `../ubumaths-wt-questions-1spe`, `chore/questions-1spe`.

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

_Posées le 2026-10-27. Recommandations de Claude validées par David le 2026-10-27 (« je valide »)._

- **D1 — Brouillons d'abord.** Les 172 brouillons passent avant tout lot neuf, un lot par thème : tirages réels
  contre les bornes, corrections, page à cocher, publication. Premier thème : suites.
- **D2 — Points « = ».** Un modèle « à savoir » pour les faits à connaître : 264, 391, 392, 290, 404, 310, 412,
  313, 311, 415, 316, 329, 336, 350 (un lot de texte). Aucun modèle pour les doublons de savoir-faire : 211, 368,
  371, 373, 220, 389, 417, 328, 421 — notés « couverts par » leur voisin (371 → 224, 373 → 225, 211 → 223,
  368 → 377, 220 → 231, 389 → 272, 417 → 327, 328 → 331, 421 → 340).
- **D3 — Tags.** 174e202b, dc4b8d08 → 1SPE-307 ; eae2ff6a → 1SPE-386 ; 318ea542 → 1SPE-283 ; 93f9ecdf sans tag ;
  f1440b52 : 1SPE-274 → 1SPE-396 ; 8b599a53, fece187e, afd9b3ff : retirer `1_SPE` des niveaux ; les 6 tagués d'un
  point de seconde : ajouter `2`, garder `1_SPE` — **fait par questions-2de (#1866, en prod, grades relus le 2026-10-27)** (accord entre sessions, 2026-10-27 :
  `grades = ['2', '1_SPE']`, car le cahier de texte filtre `grades` par égalité exacte au niveau de la classe ;
  contenu de 8b59ca4b et 8c31675a corrigé là-bas aussi). f8ccc8b6 : à lire.
- **D4 — Points P** hors chantier (5a89b292 couvre déjà le résultat de 308 / 411).
- **D5 — Outils C.** « Tracer une droite / une tangente » (433, 271) : un chantier commun avec la seconde
  (2-316, 2-445). « Placer un point sur le cercle » (306) : à verser dans la phase 0 des aiguilles de
  `reponses-a-placer` (§ 6.1, même geste : un angle sur un cercle).
- **D6 — QCM** : case choix, en brouillon jusqu'au `deploy:prod` de `figure-et-choix` ; seuls 403, 296, 407 en
  ont besoin, placés en fin d'ordre.
- **D7 — Ordre** : brouillons par thème → migration des tags (D3) → dérivation → variations et courbes → suites
  (modélisation, algorithmes) → probabilités et variables aléatoires → lot « à savoir » (D2) → restes → lots en
  attente de la case choix ou d'un outil neuf.

## 6. Lot 0-suites : vérification des brouillons (CLOS : 42 publiés le 2026-10-27, #1865, #1867)

_2026-10-27, versé par #1865. 43 brouillons tagués d'un point des suites (`pnpm question:specs --template <id> --apercu 4`,
sorties dans le scratchpad de la session)._

**Mécanique** : 43 / 43 specs vertes, 6 100 tirages réussis. La ligne « Schéma : Unrecognized keys created_at,
updated_at, created_by » vient de l'outil (il valide la ligne de base entière), pas des modèles.

**Faux constat écarté** : les décimaux s'écrivent `0.1`, `1.08` dans la sortie de l'outil, mais l'affichage les
met à la française (`MathInline` / `MathBlock`, `content-locale.ts`).

**Constats** :

- **C1 — montants** : `$500$ €` au lieu de `$500~\unit{€}$` (notation-unites) : 103cf8d9, 70e682f9, 27d77564,
  f3100c29.
- **C2 — formules hors BO dans le corrigé** : 44b32cad (somme arithmétique : « nombre de termes × (premier +
  dernier) / 2 ») et b72fae4a (somme géométrique : « premier terme × (1 − q^N) / (1 − q) »). Bornes 226 / 227 :
  la somme se ramène à 1 + 2 + … + n, 1 + q + … + qⁿ ; ces formules ne sont pas écrites au BO. À trancher (Q8).
- **C3 — récurrence dépendant de n** : 0495289a (`u_{n+1} = 3u_n + 3n`) ; borne 377 : seul uₙ₊₁ = f(uₙ) est écrit.
  À trancher (Q9).
- **C4 — corrigé maladroit** : f36ce3ff, tirage `f(x) = 4/(x+1)` avec u₂ = 4 : « 4/5 = 4 × 1/5 = 4/5 » puis
  « Diviser par une fraction, c'est multiplier par son inverse » alors qu'on ne divise pas par une fraction.
- Rien d'autre vu sur les tirages lus (un ou deux par modèle ; la page à cocher montrera une instance par
  variation).

**Outil** : `page-a-cocher.ts` refuse le dossier `scripts/questions/suites-1spe/` (37 fichiers) : fichiers plus
d'accord avec la base (titres scindés depuis : « Reconnaître une suite arithmétique ou géométrique… » → deux
modèles) et familles d'un même titre à plusieurs niveaux (« Calculer un terme d'une suite géométrique » × 4). Il
faut que la page (et `publier-lot.ts`) sache partir **des modèles en base** (liste d'id), pour tous les brouillons
déjà créés (Q10).

**Décisions (David, 2026-10-27, « je suis tes recos »)** :

- **D8 (C2)** : garder les deux formules, mais ramenées dans le corrigé à 1 + 2 + … + n et 1 + q + … + qⁿ (une
  ligne de calcul qui fait le lien).
- **D9 (C3)** : 0495289a garde son point ; la variation `u_{n+1} = 3u_n + 3n` est retirée.
- **Q11 (C3, après lecture du fichier)** : les **deux** variations de 0495289a dépendent de n (`u_{n+1} = u_n + bn + c`
  et `u_{n+1} = b·u_n + cn`) : D9 viderait le modèle. À trancher : le garder tel quel, ou le laisser en brouillon.
- **D11 (Q11, David, 2026-10-27, « ok »)** : 0495289a reste en brouillon (hors borne 377, à passer en terminale
  plus tard) ; son fichier est sorti du lot vers `scripts/questions/1spe-0-suites-attente/` (#1867).
- **D10 (outil)** : `page-a-cocher.ts` et `publier-lot.ts` apprennent à partir d'une liste d'id en base (PR
  d'outil, avant les corrections C1-C4).

## 7. Lot 0-second-degré : vérification des brouillons (CLOS : 14 publiés le 2026-10-27, #1875)

_2026-10-27. 14 brouillons tagués d'un point du second degré (243, 245, 246, 248, 249, 250, 253, 383, 386),
`pnpm question:specs --file <f> --apercu 3`, sorties dans le scratchpad de la session._

**Mécanique** : 14 / 14 verts, 205 specs, 2 700 tirages réussis. Trois QCM d'ancien format (32993a13, 568c7bee,
80489c90), publiés tels quels comme les 17 des suites (le lot 4 de `figure-et-choix` les migre).

**Constats** :

- **C1** : a9aece33 (forme canonique) corrigeait par α = −b/(2a), β = P(α) ; borne 246 : complétion du carré (la
  formule α = −b/(2a) n'est pas écrite, borne 247). Coefficients conformes à l1s-2.
- **C2** : fractions redondantes ou à deux signes moins : 88a4432e (« 9/2 = 9/2 »), 0dee4515 (« −1/−3 »),
  f6219e5a (« 24/1 », « 1 × 4 » quand a = 1, « 1 × x₂ » quand la racine donnée vaut 1).
- **C3** : c2e70ba1, phrase « … n'est pas un carré parfait : √Δ = … n'est pas un entier : on le garde … ».
- **C4** : 9e1d084e pouvait tirer « x² > 0 » (h = 0, k = 0).

**D12 (David, 2026-10-27, « go » sur les recos)** :

- C1 : corrigé par complétion du carré (a = 1 : x² + bx = (x + b/2)² − b²/4 ; a ≠ 1 : a en facteur des deux premiers
  termes) ; variation 2 : `a != 1` (la variation 1 couvre a = 1), coefficient −1 écrit « − » ; description mise à jour.
- C2 : la fraction substituée s'écrit avec un dénominateur positif quand les deux termes sont négatifs, et l'égalité
  finale n'apparaît que si elle simplifie (`gcd`) ; a = 1 et racine 1 : étape directe.
- C3 : « Δ n'est pas un carré parfait : on garde √Δ = √153 = 3√17 sous forme de radical simplifié. »
- C4 : `h != 0` sur les variations 7 et 8.

`create-questions` (simulation) : 14 en base, exactement 6 « contenu différent ». Page à cocher :
https://claude.ai/artifact/PkSiv8xPDNCrSvM432Zq9n (568c7bee et 9e1d084e : bloc `variation` non dessiné par la page,
à jouer dans l'aperçu).

**Relecture (David, 2026-10-27, « je valide tout »)** : les 14 fiches validées par message (aucun verdict en base).

**Publication (2026-10-27)** : `create-questions --publier --mettre-a-jour` puis `publier-lot --publier` lancés par David ; 14 / 14 `published`, les 6 corrections relues en base.

## 8. Lot 0-dérivation : vérification des brouillons

_2026-10-27. 15 brouillons tagués d'un point de la dérivation (260, 261, 265, 270, 272, 274, 394, 395), instantané
`scripts/questions/1spe-0-derivation/`, `question:specs --apercu 3` puis un aperçu par variation (36), sorties dans
le scratchpad de la session. Les 3 modèles déjà publiés (74d77343, a86442c1, ff36ebdf) restent hors lot. Les points
« Variations et courbes » (280-288, 399-403) feront leur propre lot._

**Mécanique** : 15 / 15 verts, 1 900 tirages réussis. **Bornes** : rien au-delà de la liste du BO (xⁿ, √x, 1/x,
eˣ ; somme, produit, inverse, quotient ; aucune composée, l1s-1) ; taux de variation sur le second degré (260).

**Constats** :

- **C1** : 05387201, équation réduite écrite « y = 9 − 2x » quand f′(a) < 0.
- **C2** : 1666b8e9, « 1 × 2x », « 1 × 3x² » quand un coefficient vaut ±1 (variations 1 et 2).
- **C3** : 8997f7c6 (kx√x), « car x/√x = √x. Donc … » seul après le calcul.
- **C4** : f1440b52 (quotient de deux affines), numérateur non développé avant le résultat.
- Écartés : décimaux « −1.5 » de l'outil (affichés à la française) ; 15d3aaa0, variation 2 = variation 1 avec a = 2
  (seule à porter la courbe) ; ed8444bb tagué 261 (270 irait aussi), laissé.

**D13 (David, 2026-10-27, « go » sur les recos)** :

- C1 : `y = {{eval:fpa*x}}{{eval:fa-fpa*a;+}}` (p = 0 donne « y = x », vérifié par un tirage forcé).
- C2 : `{{if:a==1|…|{{if:a==-1|-…|{{a}}\times…}}}}` pour a (variations 1 et 2) et b (variation 2).
- C3 : « Comme x/√x = √x : » avant la seconde ligne de calcul.
- C4 : ligne « En développant le numérateur : … », puis « Les termes en x s'annulent » avant le résultat.

Specs des 4 modèles vertes après correction (86 specs, 550 tirages). Page à cocher :
https://claude.ai/artifact/LmDNo6NwUSemJ3GLwoucK8 (aucune alerte).
