# Chantier « questions-1spe » — couvrir la première spécialité en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points` (décisions l1s-1 à l1s-6
> dans `1spe.md`). En base, le niveau est `1_SPE`. Chantiers par thème déjà faits (septembre-octobre 2026) :
> `suites-1spe`, `second-degre-1spe`, `derivation-1spe`, `exponentielle-1spe`, `trigo-1spe`,
> `produit-scalaire-1spe`, `geometrie-reperee-1spe`, `probas-cond-1spe`, `variables-aleatoires-1spe`,
> `logique-1spe`, `automatismes-1spe` (journaux dans `docs/wip/`).

## Reprendre ici

_Mis à jour le 2026-10-30, après #1998 et la publication du lot 0-produit scalaire._

- **État** : lots 0-suites (42), 0-second-degré (14), 0-dérivation (15), 0-variations (8), 0-exponentielle (17, § 10), 0-trigo (6, § 11) et 0-produit scalaire (15, § 12) publiés ; 174e202b et dc4b8d08 restent en brouillon (l1s-3).
- **Prochaine action** : lot géométrie repérée (nouveau worktree), probabilités, variables aléatoires, logique, puis la migration des tags D3 (sans 174e202b ni dc4b8d08).
- **En attente de David** : rien.
- **Pièges en cours** : `publier-lot` = `scripts/questions/publier-lot.ts`, tout le dossier ou rien ; `create-questions` et `publier-lot` → David ; la page ne dessine ni `variation`, ni `choix`, ni `trig` ; `question:specs` prend `--file` (pas `pnpm -s`), une copie par variation pour l'aperçu ; worktree neuf → `pnpm exec svelte-kit sync` ; index vide vérifié avant tout commit sur `main` ; CI : test lent ou job navigateur instable → lire le log avant de relancer.
- **Worktree / branche** : aucun (retiré après #1998) ; prochain lot : `git worktree add -b feat/questions-1spe-geometrie-reperee ../ubumaths-wt-questions-1spe origin/main`.

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

## 8. Lot 0-dérivation : vérification des brouillons (mergé #1879, publié le 2026-10-28)

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

**Outil (#1885)** : la page rendait le LaTeX brut (gabarit pensé pour le CP) ; formules du lycée rendues par
KaTeX (MathML), page republiée (version 3).

**Publication (2026-10-28)** : `create-questions --publier --mettre-a-jour` (4 mis à jour, 11 déjà en base) ; page
relue par David, 15 verdicts « ok » sans commentaire ; `publier-lot --publier` : 15/15 publiés, statuts relus en
base (MCP). Lot clos.

## 9. Lot 0-variations : vérification des brouillons (CLOS : 8 publiés le 2026-10-28, #1890)

_2026-10-28. 8 brouillons tagués d'un point « Variations et courbes » (281, 283, 287, 401), instantané
`scripts/questions/1spe-0-variations/`, `question:specs --apercu 3` puis un aperçu par variation (29), sorties dans
le scratchpad de la session. Les 3 modèles déjà publiés (1acb6d47, bb554c62, 03b3d9b3) restent hors lot._

**Mécanique** : 8 / 8 verts, 126 specs, 1 450 tirages réussis. Trois QCM d'ancien format (17f64f63, 782bf7f8,
c7b5130d), publiés tels quels comme ceux des lots précédents.

**Bornes** : rien au-delà du BO (polynômes de degré 2 et 3, (ax + b)eˣ, (ax + b)e⁻ˣ, c·e^{kx} ; produit, aucune
composée hors e^{kx}).

**Constats** :

- **C1** : 0113c53d (point 287, « en lien avec la dérivation ») corrige par la formule du sommet α = −b/(2a) et donne
  β = f(α) sans calcul : la dérivée n'apparaît pas.
- **C2** : fraction écrite deux fois quand elle est déjà irréductible : « α = 1/2 = 1/2 » (0113c53d, variations 3
  et 4), « x = −3/2 = −3/2 » (9a04eb9f, variation 3).
- **C3** : 2b382069, variation 3 (f′(x) = ax² − c, sans terme en x) : racines écrites « (0 − 20)/4 ».
- **C4** : a86fc757, variation 2 : u(x) = 7 − x, mais « f(6) = (−6 + 7)e⁶ » (ordre inversé).

**D14 (David, 2026-10-28, « go » sur les recos)** :

- C1 : corrigé par la dérivée : f′(x) = 2ax + b, f′(x) = 0 ⟺ x = α, signe de f′ par le coefficient de x, ligne
  `sign: f'(x)` dans le tableau, β = f(α) calculé (substitution ; fractions au dénominateur 4 quand α = ±b/2) ;
  description mise à jour.
- C2 : 9a04eb9f, `{{if:gcd(b,a)!=1|…=|}}` ; 0113c53d, x = α écrit directement quand la fraction est irréductible.
- C3 : f′(x) = a(x² − q²) = a(x + q)(x − q), sans Δ (a = 1 : sans facteur).
- C4 : `(a − x₀)` quand a > 0, `(−x₀ + a)` quand a < 0 (ordre de l'énoncé).

Specs des 4 modèles vertes après correction (62 specs, 650 tirages) ; h < 0 et a < 0 vérifiés par tirages forcés.

PR #1890 mergée (CI verte). Page à cocher : https://claude.ai/artifact/8StybG87C7kCZKdxyni5hX (7 fiches sur 8 avec le bloc
`variation` non dessiné, à jouer dans l'aperçu).

**Relecture (David, 2026-10-28, « je valide tout pour les variations »)** : les 8 fiches validées par message (aucun verdict en base).

**Publication (2026-10-28)** : `create-questions --publier --mettre-a-jour` (4 mis à jour, 4 déjà en base) puis
`publier-lot --publier` lancés par David ; 8 / 8 `published`, les 4 corrections relues en base (MCP). Lot clos.

## 10. Lot 0-exponentielle : vérification des brouillons (CLOS : 17 publiés le 2026-10-29, #1916, #1934)

_2026-10-28. 17 brouillons tagués d'un point de l'exponentielle (289, 291, 292, 293, 294, 295, 297, 405, 406), instantané
`scripts/questions/1spe-0-exponentielle/`, `question:specs --apercu 3` puis un aperçu par variation (46), sorties dans le
scratchpad de la session. Aucun modèle publié sur ces points._

**Mécanique** : 17 / 17 verts, 225 specs, 2 600 tirages réussis. Quatre QCM d'ancien format (09432575, ac3e6395, 68166a11,
f40e8a4a), publiés tels quels comme ceux des lots précédents.

**Bornes** : rien au-delà du BO. Pas de logarithme : les équations sont du type eᵘ = eᵛ, e^{ax+b} = 1, ou sans solution
(eᵘ = k ⩽ 0). Propriétés : produit, quotient, inverse, puissance entière (l1s-5). Dérivée de e^{ax+b} ramenée à e^{ax} × e^b
(227f2c9c), donc dans la liste du BO (l1s-1).

**Constats** :

- **C1** : fraction de la solution à deux signes moins ou écrite deux fois : « x = −1/−4 = 1/4 », « x = −9/2 = −9/2 »
  (9a4592bf variation 2, e572933c, 6fe11613 variation 2, 7179a3b5 variations 1 et 2).
- **C2** : e¹ au lieu de e : énoncés « e⁻⁷ × e¹ », « e¹/e⁶ » (e6b429b4 variation 1, 6137a555 variations 1 et 3), corrigé
  « e¹ est une constante » (227f2c9c variations 1 et 2).
- Écartés : décimaux « 0.2 », « ≈ 27.07 » de l'outil (affichés à la française) ; f40e8a4a tagué 406, alors que ses variations
  e^{−x} et e^{2x} relèvent aussi de 407 (un modèle, un point : laissé) ; « e⁻³ + (−4) » (e6b429b4), lisible.

**D15 (David, 2026-10-28, « go » sur les recos)** :

- C1 : `x = {{if:gcd(N,D)!=1|N/D =|}}` résultat, la fraction écrite avec un dénominateur positif ; irréductible → résultat
  direct (9a4592bf, e572933c, 6fe11613, 7179a3b5).
- C2 : `{{if:V==1|e|e^{ {{V}} }}}` partout où l'exposant tiré peut valoir 1, énoncés et corrigés : 227f2c9c, 6137a555,
  e6b429b4, et aussi 6a5e58da, 6fe11613, a4272b10, f40e8a4a (même défaut, trouvé au relevé des exposants). bd45ed7f
  variation 3 : `p != 1` plutôt que « (e)⁻³ », qui ne demande plus rien.

Specs des 17 modèles vertes après correction (225 specs, 2 600 tirages) ; 25 tirages forcés relus (dénominateur négatif,
fraction simplifiable ou non, exposant 1).

**Instantané rafraîchi (2026-10-28)** : les 4 QCM (09432575, ac3e6395, 68166a11, f40e8a4a) ont été migrés en case choix en
prod à 08 h 35 UTC (lot 4 de `figure-et-choix`), après l'instantané : ré-exportés, C2 refait sur f40e8a4a. Sans cela,
`--mettre-a-jour` aurait remis l'ancien format. Écart à la base relu champ par champ : seules les corrections voulues.

**Relecture (David, page à cocher)** : 245b4eb1 variation 2, « il faut un QCM, pas une case où il faut entrer le mot
décroissante » → case choix (croissante / décroissante / constante, `melanger: non`), 3 specs.

**Relecture (David, page à cocher, 2026-10-28)** : 13 « ok », e572933c sans verdict, 3 « à revoir » ; propositions en
attente de go :

- f40e8a4a : consigne « La fonction $f$ s'écrit avec une exponentielle. Que semble être l'expression de $f(x)$ ? » (6
  variations).
- e6b429b4 : variation 3 (e^{ax+b} × e^{cx+d}) « peu d'intérêt » → retirée avec ses specs.
- ca8f40c2 : « le lien, c'est que le quotient de 2 nombres distants de 1 est constant » → variation 1 réécrite : f(x) = e^{ax},
  calculer f(x+1)/f(x) = e^a pour tout réel x ; conclusion : (e^{an}) géométrique de raison e^a. Variation 2 inchangée.

**D16 (David, 2026-10-28, « go » sur les 3 propositions)** :

- f40e8a4a : consigne des 6 variations « La fonction $f$ s'écrit avec une exponentielle. Que semble être l'expression de
  $f(x)$ ? ».
- e6b429b4 : variation 3 (index 2, e^{ax+b} × e^{cx+d}) retirée avec ses 4 specs (17 → 13).
- ca8f40c2 : variation 1 (index 0) réécrite : f(x) = e^{ax}, calculer f(x+1)/f(x) ; corrigé en 3 étapes (f(x+1) = e^{ax} × e^a,
  quotient constant e^a, donc u_n = e^{an} géométrique de raison e^a). Specs : « e^{2n} » devient « e^{2x} » (f(x) au lieu du
  quotient), ajout « quotient non simplifié » → `bad_form` (`form`). 15/15 vertes, 100 tirages.

Export frais de la prod (2026-10-28) comparé à l'instantané : écarts limités aux corrections C1, C2 et 245b4eb1 pas encore
publiées ; aucun `updated_at` postérieur aux migrations de 08 h 35 UTC, déjà prises dans l'instantané.

e572933c : « ok » (David, 2026-10-28, sur reco : rien à corriger, C1 déjà appliqué). Corrections mergées (#1934) ; 17/17
validés.

## 11. Lot 0-trigo : vérification des brouillons

_2026-10-29. 8 brouillons : les 6 tagués d'un point de la trigonométrie (aad6c700, f7194c9d → 304 ; ee4e2ac6 → 305 ;
679a2e3e → 307 ; 4b3c1d88 → 409 ; 5a89b292 → 410) et les 2 sans tag que D3 range en 307 (174e202b, dc4b8d08). fece187e et
afd9b3ff (TSPE-457) restent hors du lot (D3 : `1_SPE` à retirer). Instantané `scripts/questions/1spe-0-trigo/`,
`question:specs --apercu 3` puis un aperçu par variation (48), tirages forcés sur ee4e2ac6 (60 par variation) et
174e202b v12 ; sorties dans le scratchpad de la session. Aucun modèle publié sur ces points._

**Mécanique** : 8 / 8 verts, 247 specs, 2 400 tirages réussis.

**Bornes** : réels lus ou ramenés dans ]−π ; π] parmi les valeurs remarquables et leurs associés (±x, π ± x, à 2kπ près),
conformes à l1s-3 ; conversions degrés ↔ radians, y compris hors valeurs remarquables (π/12, π/5, π/9…), permises par 409. Deux écarts :

- **Q-T1** : 174e202b (13 variations : cos(−x), sin(π − x), cos(π/2 + x), cos(x − 6π)…) et dc4b8d08 (5 variations :
  « A = cos(π − x) + 3 cos(x + 2π) ») demandent une **simplification littérale**, que l1s-3 exclut en 1re spé (« valeurs
  numériques seulement, pas de simplification littérale (cos(π − x) + sin(π + x)) »). D3 (tag 1SPE-307) les rangeait
  d'après leur titre.
- **Q-T2** : ee4e2ac6 (cos x connaissant sin x) repose sur cos² x + sin² x = 1, que le BO de 1re spé n'écrit pas ; c'est
  Pythagore dans le cercle de rayon 1 (lien avec le triangle rectangle, 305).

**Constats** :

- **C1** : « on fait 1 tour(s) complet(s) » (174e202b v12, v13) : accord à faire (`{{if:k==1|…|…}}`), si le modèle reste.
- **C2** : ee4e2ac6 v7 : « √(8/9) = (√4 × √2)/3 » saute √8/3 ; écrire « √(8/9) = √8/3 = (2√2)/3 ». Variation à un seul
  tirage (sin x = 1/3), laissée telle.
- Écartés : `\frac{\pi}{ 6 }` (espaces, sans effet au rendu) ; titre de 4b3c1d88 « Convertir des degrés en radians »
  alors que v2 va des radians aux degrés (changer le titre change la clé de `publier-lot`) ; 5a89b292 à une valeur par
  variation (voulu : une variation par angle remarquable).

**Q-T3** : la page à cocher ne dessine pas les blocs ` ```trig ` (montrés par leur source) ; ils portent l'énoncé
d'aad6c700 (le point M à lire) et les corrigés de 6 modèles.

**D17 (David, 2026-10-29, « je te suis » sur les recommandations de Q-T1, Q-T2, Q-T3 et C2)** :

- Q-T1 : l1s-3 prévaut. 174e202b et dc4b8d08 sortent du lot (rangés dans `scripts/questions/1spe-0-trigo-attente/`),
  restent en brouillon ; le tag 1SPE-307 de D3 est annulé pour eux (aucun point de terminale ne leur va exactement :
  TSPE-597 et 598 ne couvrent que −x et 2π). C1 sans objet.
- Q-T2 : ee4e2ac6 gardé (cos² x + sin² x = 1 : Pythagore dans le cercle de rayon 1, point 305).
- Q-T3 : la page montre les blocs `trig` par leur source ; aad6c700 à relire dans l'aperçu de l'admin.
- C2 : ee4e2ac6 v7, « √(8/9) = √8/3 = (√4 × √2)/3 = (2√2)/3 » ; 27/27 specs vertes, tirage relu.

**Page à cocher** : https://claude.ai/artifact/NASe9bJes7g6kceK3wMjaF (6 fiches, 30 exemples, 4 alertes « bloc trig non
dessiné »), collection `verdicts` vide à la publication.

**Rendu KaTeX de la page** : `\,^\circ` (4b3c1d88 v2) restait brut, la sortie MathML de KaTeX refusant un exposant posé
sur une espace ; le gabarit `scripts/questions/page-a-cocher.html` ajoute `{}` avant le `^` (468 formules rendues, 0
brute), page republiée à la même adresse.

**Relecture (David, page à cocher, 2026-10-29)** : 6 « ok » sur 6, aucun commentaire.

**Publication (2026-10-29)** : #1969 mergée ; `create-questions --publier --mettre-a-jour` (ee4e2ac6 mis à jour, 5 identiques)
puis `publier-lot --publier` lancés par David : 6/6 `published`, corrigé v7 relu en base.

## 12. Lot 0-produit scalaire : vérification des brouillons

_2026-10-29. 15 brouillons tagués d'un point du produit scalaire (312, 317, 318, 319, 320, 321), un point chacun ; instantané
`scripts/questions/1spe-0-produit-scalaire/`, `question:specs --apercu 3` puis un aperçu par variation (55), sorties dans le
scratchpad de la session. Aucun modèle publié sur ces points._

**Mécanique** : 15 / 15 verts, 2 550 tirages réussis.

**Bornes** : rien au-delà du BO 1re spé (p. 9). Quatre méthodes de calcul (projection, coordonnées, normes et angle, normes
seules), bilinéarité, ‖u ± v‖², Al-Kashi (longueur, angle), orthogonalité, MA·MB par le milieu. Angles lus parmi les valeurs
remarquables, à 2kπ près (4π/3 : l1s-3) ; arccos à la calculatrice pour les angles non remarquables.

**Constats** :

- **C1** : réponse attendue écrite `\frac{N}{2}` sans réduction : l'élève voit « 76/2 », « 8/2 », « 12/4 » quand les réponses
  sont montrées, alors que le corrigé écrit 38, 4, 3. d787d8c0 (4 variations), b73923a1 v2 (et son corrigé : « BA·BC = 4/2 »)
  et v4 ; fe407c88 v4 (« −3/2 » écrit `\frac{-3}{2}`, impair, cosmétique).
- **C2** : fraction à dénominateur négatif : « m = 8/−3 = −8/3 » (2bfbf2fc v2), même défaut que C1 du lot 0-exponentielle.
- **C3** : « −1² + 2² » (b73923a1 v4, IA·ID dans le carré) : se lit (−1)², alors que c'est −IB².
- Écartés : décimaux « 5.1 », « 37.3 » de l'outil (affichés à la française) ; 044a3ae3 v1-v2 (MA·MB = 0) cite le cercle de
  diamètre [AB] sans passer par le milieu, et reste sous 317 (le résultat est celui de la démonstration 323, point P) ; « AB = √17 »
  sans détail à côté de « AC = √(9 + 25) » (bf5dadf6 v2) ; CH donnée sans servir (9c7f7ef0, voulu : « CH n'intervient pas »).

**Recommandations** :

- C1 : réponse attendue = l'expression du corrigé (`{{eval:N/2}}`, `{{eval:a*a/2}}`, `{{eval:3*a*a/4}}`…), qui rend l'entier ou
  la fraction irréductible ; corrigé de b73923a1 v2 aligné.
- C2 : règle de D15 : fraction écrite avec un dénominateur positif seulement si elle se simplifie, sinon résultat direct.
- C3 : « IA·ID = −IB² + BA² = −1 + 4 = 3 » (carrés calculés).
  **D18 (David, 2026-10-29, « je valide » sur C1-C3)** :

- C1 : réponses attendues en `{{eval:…}}` (entier ou fraction irréductible) : d787d8c0 (4 variations), b73923a1 v2 et v4,
  fe407c88 v4 ; corrigé de b73923a1 v2 (« BA·BC = a²/2 ») aligné.
- C2 : 2bfbf2fc v1 à v3 (même défaut trouvé sur les trois) : `m = {{if:gcd(N,D)!=1 && N!=0|N/D =|}}` résultat, dénominateur
  positif.
- C3 : b73923a1 v4, « IA·ID = −IB² + BA² = −a²/4 + a² ».

Specs des 4 modèles vertes (55 specs, 800 tirages) ; 160 tirages relus : aucune fraction réductible ni dénominateur négatif.

**Page à cocher** : https://claude.ai/artifact/NwH2PPrbGHhiqjuyiu2V8A (15 fiches, 55 exemples, aucune alerte), collection
`verdicts` vide à la publication.

**Relecture (David, page à cocher, 2026-10-29)** : 15 « ok » sur 15, aucun commentaire.

**Publication refusée (2026-10-30)** : `create-questions --publier --mettre-a-jour` a mis à jour les 4 modèles corrigés ;
`publier-lot --publier` refuse 9 brouillons sur 15 (plusieurs modèles de la sélection dans la même catégorie au même
niveau ; aucun modèle publié dans le domaine). Décision de David (« oui ») : renumérotation du plus simple au plus composé,
8 niveaux changés — Calculer un produit scalaire : fe407c88 1, ba8ae428 2, 9c7f7ef0 3, d787d8c0 4, b73923a1 5 ; Angles et
longueurs : bf5dadf6 1, 721324f9 2, f7c15433 3 ; Propriétés : f2cc01fc 1, 2bfbf2fc 2, d520539a 3, 74363137 4, affe59f7 5 ;
Lieux de points inchangé. Question d'accès : personne (David). Migration
`20261030120000_questions_1spe_produit_scalaire_niveaux` + fichiers dans la même PR, test d'intégration vert (7), rouge
sans l'`update`.

#1998 mergée (CI verte), `db:migrate` joué le 2026-10-30 : niveaux conformes en prod, trigger `updated_at` réactivé (`O`) ;
simulation `publier-lot` : 15 brouillons passent le contrôle.

**Publié le 2026-10-30** (`publier-lot --publier`, David) : 15/15 `published` en prod (MCP).

## 13. Lot 0-géométrie repérée : vérification des brouillons

_2026-10-30. 12 brouillons tagués d'un point de géométrie repérée (327, 330, 331, 332, 333, 418, 419), un point chacun ;
instantané `scripts/questions/1spe-0-geometrie-reperee/`, `question:specs --apercu 3` puis un aperçu par variation (42),
sorties dans le scratchpad de la session. Aucun modèle publié dans le domaine. Simulation `publier-lot` jouée d'entrée :
8 refus de niveau (voir N1)._

**Mécanique** : 12 / 12 verts, 2 000 tirages réussis. Case `choix` (1602c40d, d7ad48d8) en prod depuis `figure-et-choix`
lot 1 ; bonnes réponses réparties sur toutes les cases (30 tirages par variation).

**Bornes** : rien au-delà du BO 1re spé (p. 9). Vecteur normal lu, point + vecteur normal, perpendiculaire, médiatrice,
hauteur ; projeté orthogonal (et distance MH par le projeté, pas de formule de distance point-droite) ; cercle par centre
et rayon, par centre et point, par diamètre ; appartenance et position ; complétion des carrés (coefficients 2 compris,
centre à demi-entier en 60a428b9 v3) ; nature de l'ensemble (cercle, point, vide).

**Constats** :

- **C1** : 518f7f0b v1 (équation réduite de la perpendiculaire) : le corrigé finit par « y = +6 » dès que |m| ⩾ 2 — le terme
  en x manque. Cause : le coefficient −1/m n'est écrit que si |−1/m| ⩾ 1. La réponse attendue est juste.
- **C2** : 71d10661 v3 : « y = −4/−2 » (dénominateur négatif) et « y = 10/1 » possibles, même défaut que C2 du lot 0-produit
  scalaire.
- **C3** : 3a6583b5 v1 : « r² = √15² » se lit √(15²) ; écrire (√15)².
- **C4** (cosmétique) : les 5 modèles de cercle écrivent « Ω(−6 ;6) » (`\,;` sans espace après), les 7 autres « A(5 ; 5) ».
- Écartés : coefficients non réduits dans l'énoncé (« −6x + 6y + 9 = 0 ») ; équation attendue à premier coefficient négatif
  (« −x − 5y − 5 = 0 », toute équation proportionnelle acceptée) ; 71d10661 v0 et v4 voisins (v0 exige le vecteur lu, v4
  accepte tout vecteur colinéaire, voulu) ; fractions qui se simplifient en entier (« k = −5/5 = −1 »).

**N1 — niveaux** : 8 refus de `publier-lot` (deux modèles au même niveau dans une catégorie). Proposition, du plus simple au
plus composé, en gardant l'ordre actuel :

- Vecteur normal et équation de droite : 71d10661 lire 1 · e710f32f point + normal 1 → 2 · 518f7f0b perpendiculaire 2 → 3 ·
  c2add21a médiatrice 2 → 4 · 81811b59 hauteur 3 → 5.
- Équation de cercle : 3a6583b5 centre + rayon 1 · 1602c40d appartenance 1 → 2 · a6d7b414 centre + point ou diamètre 2 → 3 ·
  60a428b9 centre et rayon d'une équation développée 2 → 4 · d7ad48d8 est-ce un cercle 3 → 5.
- Projeté orthogonal inchangé (9bea5ec2 2, f6c423de 3).

8 niveaux changés → migration (comme #1998), question d'accès à trancher.

**D19 (David, 2026-10-30, « oui » sur C1-C4, N1 et la question d'accès)** :

- C1 : 518f7f0b v1, dernière ligne `y={{if:m==-1|x}}{{if:m==1|-x}}{{if:abs(m)>1|{{eval:-1/m}}x}}…` (12 tirages relus).
- C2 : 71d10661 v3, fraction écrite si |u2| > 1 avec dénominateur positif (`\dfrac{t·u2·u1}{−u2}` si u2 < −1), résultat direct
  si |u2| = 1.
- C3 : 3a6583b5 v1, « r² = (√R)² ».
- C4 : 49 « \,; » → « \,;\, » dans les 5 modèles de cercle.
- Specs des 7 modèles vertes (145 specs, 1 150 tirages). Commit 7e15a6016 ; simulation `create-questions` : 7 contenus
  différents, exactement les corrigés.
- N1 : migration `20261030150030_questions_1spe_geometrie_reperee_niveaux` (gabarit #1998), test d'intégration vert (7),
  rouge sans l'`update` ; `security-auditor` : aucun finding bloquant (diff avec le gabarit = les 8 lignes du lot ; après
  `db:migrate`, vérifier `tgenabled = 'O'` du trigger `updated_at`). Question d'accès : personne (David).
- Ordre : David lance `create-questions --publier --mettre-a-jour` (fichiers aux anciens niveaux), puis les niveaux des
  fichiers passent aux nouvelles valeurs dans la même PR que la migration.
