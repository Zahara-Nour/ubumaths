# Chantier « questions-tspe-demonstrations » — les points P de la terminale spécialité en modèles de questions

> Suite du chantier clos `questions-tspe` (journaux `docs/archive/wip/questions-tspe*-progress.md` ; sa Q4 mettait
> les 68 points P hors chantier). Modèles suivis : `questions-1spe-demonstrations` (archivé, D1-D13) et
> `questions-2de-demonstrations` (D1-D5). Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md).
> Bornes et couverture : [tspe.md](../systeme/programmes/bornes/lycee/tspe.md) ; BO :
> `src/lib/server/programmes/transcriptions/T_SPE.md`. En base, le niveau est `T_SPE`.
> Ouvert le 2026-11-11 (David : « comme pour la classe de première et la classe de seconde, il va falloir traiter
> la classe P »).

## Reprendre ici

_Mis à jour le 2026-11-13, phase 0 des approfondissements posée (§ 35)._

- **État** : démonstrations (lots 1-4) et algorithmes (lots 5-8) publiés (§ 34). Suite de D1 : les **31
  approfondissements** ; relevé prod et phase 0 au § 35 (lots 9 à 15 proposés).
- **Prochaine action** : après la réponse de David, lot 9 (barycentres et Leibniz : 340, 554, 341, 362).
- **En attente de David** : Q1 à Q6 du § 35 (lots, forme, rangement, sous-notions neuves pour 395 et 517,
  réemplois 340 / 538, accès).
- **Pièges en cours** : commitlint refuse le type `content` et les lignes de corps > 100 caractères ; graine de
  l'aperçu admin = variation (§ 3) ; `publier-lot.ts` lit la prod → David la lance (simulation comprise : le mode auto
  la bloque) ; **`\dots` non rendu**, `\cdots` oui (§ 14) ; titre déjà pris en prod au même niveau = lot bloqué
  (§ 19) ; `Doc-inchangée:` dans un COMMIT ; `db:migrate` « inserted before » → `--dry-run --include-all` (§ 20) ;
  `create-questions` lancé du dépôt principal y laisse les JSON modifiés : les remettre à l'état commité après le merge.
  Le journal à jour vit sur `main` (le worktree est détaché) : `git -C <wt> checkout --detach origin/main` avant de lire.
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-demonstrations`, détaché sur `origin/main`.

---

## 0. Contrôle de la couverture (MCP prod, lecture seule, 2026-11-11)

Conforme au bilan de `tspe.md` (2026-11-06) : 274 modèles `T_SPE` publiés, 0 brouillon, 0 sans nœud ; 227 points
sur 326 couverts ; 99 sans modèle = 68 P + 31 « couverts par leur voisin », dont les 21 voisins ont tous au moins un
modèle publié. Deux remarques :

- `1cfc575d` (niveau `2`, tagué TSPE-616) est **publié** ; `tspe.md` le dit encore « brouillon ». Sans effet sur la
  couverture (616 a `ea48f760`).
- 5 modèles `{T_SPE, T_COMP}` sans point TSPE (07ebdcbe, 7d3632bb, 81ff485d, 9f14d672, efb12f4b) : **voulu**,
  journal `questions-tspe` § « Sans point TSPE (aucun point compatible sur leur nœud ou leur notion) ».

## 1. Relevé : les 68 points P (MCP prod, 2026-11-11)

En base, `kind` et `exigence` les classent sans ambiguïté : **19 démonstrations** (attendues au BO),
**18 algorithmes** et **31 savoir-faire d'approfondissement** (les uns et les autres « approfondissement » : en
terminale, tous les algorithmes du BO sont des approfondissements). Aucun modèle tagué ; tous les points sont actifs.

### Démonstrations (19) — toutes sur une sous-notion existante

| Lot pressenti | Point | Démonstration                                                                  | Nœud du point (prod)                                                |
| ------------- | ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1             | 321   | Relation de Pascal par le calcul                                               | Dénombrement › Combinaisons › triangle de Pascal                    |
| 1             | 548   | Relation de Pascal par une méthode combinatoire                                | Dénombrement › Combinaisons › triangle de Pascal                    |
| 1             | 359   | Le projeté orthogonal de M sur un plan est le point du plan le plus proche     | Orthogonalité et distances dans l'espace › projeté orthogonal       |
| 1             | 373   | Équation cartésienne du plan normal à n passant par A                          | Orthogonalité et distances › vecteur normal et équation cartés.     |
| 2             | 388   | Suite croissante non majorée → +∞                                              | Suites › Limites de suites › convergence monotone                   |
| 2             | 389   | Limite de (qⁿ), après l'inégalité de Bernoulli par récurrence                  | Suites › Limites de suites › suites géométriques                    |
| 2             | 390   | Minorée par une suite qui tend vers +∞ → +∞                                    | Suites › Limites de suites › comparaison et encadrement             |
| 2             | 391   | Limites de exp en +∞ et en −∞                                                  | Fonctions › Limites de fonctions › croissances comparées            |
| 2             | 405   | Croissance comparée de xⁿ et exp en +∞                                         | Fonctions › Limites de fonctions › croissances comparées            |
| 3             | 421   | f″ ⩾ 0 ⟹ courbe au-dessus de ses tangentes                                     | Fonctions › Convexité › inégalités de convexité                     |
| 3             | 448   | Dérivée de ln (dérivabilité admise)                                            | Fonctions › Logarithmes › dérivée                                   |
| 3             | 449   | Limite en 0 de x ln x                                                          | Fonctions › Limites de fonctions › croissances comparées            |
| 3             | 471   | Deux primitives diffèrent d'une constante                                      | Équations différentielles › y′ = f › primitives : notion            |
| 3             | 472   | Résolution de y′ = ay                                                          | Équations différentielles › y′ = ay                                 |
| 4             | 494   | x ↦ ∫ₐˣ f est une primitive de f (f positive croissante) ; ∫ₐᵇ f = F(b) − F(a) | Intégration › Fonction intégrale › dérivée d'une fonction intégrale |
| 4             | 495   | Intégration par parties                                                        | Intégration › Calcul d'intégrales › intégration par parties         |
| 4             | 512   | Probabilité de k succès dans le schéma de Bernoulli                            | Probabilités › Loi binomiale › expression de la loi                 |
| 4             | 528   | Espérance de la loi binomiale                                                  | Probabilités › Loi binomiale › espérance et variance                |
| 4             | 623   | Variance de la loi binomiale                                                   | Probabilités › Loi binomiale › espérance et variance                |

### Algorithmes (18, tous « approfondissement »)

324 permutations (génération, tirage) · 393 valeurs approchées de π, e, √2, φ, ln 2 · 433 dichotomie · 434 Newton ·
592 sécante · 450 Briggs (ln) · 474 Euler pour y′ = f et y′ = ay + b · 610 milieux · 611 trapèzes · 499 Monte-Carlo
(intégrale) · 500 Brouncker (ln 2) · 513 planche de Galton · 514 surréservation (plus petit k tel que P(X > k) ⩽ α) ·
515 échantillon d'une variable aléatoire · 534 P(|Sₙ − pn| > √n) · 624 la comparer à Bienaymé-Tchebychev ·
535 marche aléatoire · 536 N échantillons, écart type des moyennes.

### Savoir-faire d'approfondissement (31)

- Géométrie : 340 barycentre (2 à 4 points), 554 associativité du barycentre, 341 fonction vectorielle de Leibniz,
  362 fonction scalaire de Leibniz, 564 plan tangent à une sphère, 361 sphère circonscrite à un tétraèdre,
  377 sphère ∩ droite, 374 intersection de deux plans (lts-7).
- Suites : 394 suites adjacentes, 395 récurrence linéaire d'ordre 2, 396 Newton (exemples), 571 Héron.
- Fonctions : 406 asymptotes obliques, 584 branches infinies, 422 courbe de Lorenz, 423 dérivée n-ième,
  424 inégalité arithmético-géométrique, 435 TVI par dichotomie, 436 f(x + y) = f(x) + f(y), 437 prolongement par
  continuité, 451 x ↦ xᵃ, 452 limite de (1 + x/n)ⁿ, 460 fonction tangente.
- Équations différentielles et intégrales : 473 autres équations (logistique), 496 aire par suites adjacentes,
  497 encadrement de Hₙ par des intégrales.
- Probabilités : 517 loi de Poisson, 529 E(XY) = E(X)E(Y), 537 estimation, 538 marche aléatoire, 539 exemples
  (sondage, sex ratio, demi-vie).

Points sur une **notion** (pas une sous-notion), à ranger sur une sous-notion au lot : 340, 554, 341 (Géométrie ›
Vecteurs), 393, 395, 422, 423, 436, 450, 451, 452, 460, 513, 517.

Réemplois possibles, **à vérifier** au lot (modèles publiés d'autres niveaux, comme `d4db2207` et `64f54fc1` en 2de) :
Newton (1SPE-288 → 434, 396), Euler (1SPE-298 → 474), Monte-Carlo (1SPE-344 → 499), marche aléatoire
(1SPE-346 → 535, 538), (1 + 1/n)ⁿ (1SPE-299 → 452), inégalité arithmético-géométrique (2-286 → 424), barycentre
(2-305 → 340).

## 2. Phase 0 — questions à David (posées le 2026-11-11)

- **Q1 — Périmètre et ordre.** Les 19 démonstrations d'abord (attendues au BO). Ensuite les algorithmes ou les
  approfondissements : la 1re a fait approfondissements puis algorithmes, la 2de l'inverse. _Reco : démonstrations,
  puis algorithmes (18, forme déjà rodée en 1re et 2de), puis approfondissements (31) ; chaque suite a sa phase 0._
- **Q2 — Forme des démonstrations.** Comme D1 de la 2de : 2-3 variations « démonstration à trous » (étape clé en
  case, ou justification en case choix à 4 propositions, erreurs typiques en distracteurs) + une dernière variation
  « Remets les étapes de la démonstration dans l'ordre » (` ```ranger `, `signe: aucun`, 4 à 6 étapes). _Reco : oui._
- **Q3 — Valeurs tirées** là où la preuve s'y prête (373 : A et n ; 389 : q ; 472 : a ; 512, 528, 623 : n et k
  petits dans une variation d'exemple), lettres ailleurs. _Reco : oui._
- **Q4 — Rangement.** Un modèle par point, tagué sur son point P, sur la **sous-notion existante du point** (les 19
  en ont une), niveau après ceux déjà présents ; aucun nœud neuf. 321 et 548 : deux modèles distincts. _Reco : oui._
- **Q5 — Accès** (avant toute migration) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » _Reco :
  personne de plus (brouillons ; migration de nœud et de tags seulement) ; à la publication, les élèves de terminale
  spé voient les modèles, comme tout modèle publié._
- **Q6 — Doc.** Corriger dans `tspe.md` la phrase sur `1cfc575d` (publié, plus brouillon), en commit de doc direct.
  _Reco : oui._

Lots proposés : (1) dénombrement et géométrie (321, 548, 359, 373) ; (2) suites et limites (388, 389, 390, 391, 405) ;
(3) dérivation, logarithme, primitives (421, 448, 449, 471, 472) ; (4) intégration et loi binomiale (494, 495, 512,
528, 623).

**D1 (David, 2026-11-11, « je suis tes recos »)** : Q1 les 19 démonstrations d'abord, puis les algorithmes, puis les
approfondissements (chaque suite avec sa phase 0) ; Q2 2-3 variations à trous (case, ou case choix à 4 propositions,
erreurs typiques en distracteurs) + une variation « étapes à ranger » (` ```ranger `, `signe: aucun`, 4 à 6 étapes) ;
Q3 valeurs tirées là où la preuve s'y prête, lettres ailleurs ; Q4 un modèle par point, tagué sur son point P, sur la
sous-notion existante du point, aucun nœud neuf (321 et 548 : deux modèles) ; Q5 accès : personne de plus ; Q6
`tspe.md` corrigé (1cfc575d publié), commit de doc direct. Lots 1 à 4 dans l'ordre du § 2.

## 3. Lot 1 : dénombrement et géométrie (2026-11-11)

| Point | Modèle (`scripts/questions/tspe-demonstrations-1/`) | Niveau | Variations                                                                                                          |
| ----- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- |
| 321   | `01-demontrer-relation-de-pascal-par-le-calcul`     | 5      | facteur k + 1 (case), facteur n − k (case), (n + 1) − (k + 1) = n − k (choix), étapes (5)                           |
| 548   | `02-demontrer-relation-de-pascal-par-denombrement`  | 6      | exemple : parties à 3 éléments contenant a, C(n, 2) (case, n de 4 à 8), sans a (choix), additif (choix), étapes (4) |
| 359   | `03-demontrer-projete-orthogonal-plus-proche`       | 6      | MH·HN = 0 (case), pourquoi (choix), MN > MH (choix), étapes (4)                                                     |
| 373   | `04-demontrer-equation-cartesienne-plan`            | 4      | M ∈ P ⟺ AM·n = 0 (choix), d (case, A et n tirés de 1 à 6 / 2 à 5), repère orthonormé (choix), étapes (4)            |

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod : triangle de Pascal 3-4, projeté orthogonal 2-5,
vecteur normal et équation cartésienne 1-3). Script : `docs/wip/questions/lot-tspe-demonstrations-1.py`. Étapes
interchangeables évitées : « Soit N » (359) et « Soit M » (373) passés dans l'énoncé, « Les autres… » (548) et « Or… »
(359) pour fixer l'ordre.

Vérifié : `question:specs` 150 tirages par variation, 4/4 importables, 57 specs vertes, 0 `\textcolor` hors `$` ;
3 714 formules des aperçus passées à `validateLatex` + accolades, 0 problème ; brouillons en base locale (copie hors
dépôt) ; aperçu admin vu à l'écran (choix 321, étapes à ranger 321, case de 373).

Pièges du lot : une case à réponse nombre seul demande un `?` dans une formule de l'énoncé (`Il y en a $?$.`), sinon
« Blank count mismatch » ; dans l'aperçu admin, la graine fixe la variation (graines 7, 12, 1, 4 → variations 1 à 4
pour un modèle à 4 variations) ; la saisie dans le champ MathLive ne passe pas par l'automatisation de Chrome.

PR des fichiers : #2557, mergée (CI verte du premier coup).

## 4. Lot 1 : brouillons en prod, rangement, page à cocher (2026-11-11)

David a lancé `create-questions --publier` depuis le dépôt principal : 4 brouillons. Ids reportés dans les JSON (branche
de rangement), dépôt principal rendu propre (`git restore`).

| Modèle   | Sous-notion                                                                          | Point    |
| -------- | ------------------------------------------------------------------------------------ | -------- |
| 185496e9 | Dénombrement › Combinaisons › triangle de Pascal                                     | TSPE-321 |
| 3ca56be0 | Dénombrement › Combinaisons › triangle de Pascal                                     | TSPE-548 |
| 274804ba | Géométrie › Orthogonalité et distances dans l'espace › projeté orthogonal            | TSPE-359 |
| 0dacdcc5 | Géométrie › Orthogonalité et distances dans l'espace › vecteur normal et équation c. | TSPE-373 |

Migration `20261111163622_questions_tspe_demonstrations_1_rangement_tags.sql` (gabarit `20261108155933`, gardes et
rollback identiques) ; test `tests/integration/questions-tspe-demonstrations-1-rangement-tags.test.ts` 12/12 vert,
rouge sans la migration (partie aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie. `security-auditor` :
aucun finding. Accès : personne de plus (Q5). Mergée (#2558, CI verte du premier coup) ; `check:migrations --pr`
vert ; `db:migrate` depuis le dépôt principal (seule migration en attente) ; vérifié en prod : 4 brouillons, chacun sur
sa sous-notion avec son seul point, `updated_at` inchangé. Garde des niveaux : aucun niveau manquant.

Piège : commitlint refuse le type `content` (types admis : feat, fix, docs…).

Page à cocher : https://claude.ai/artifact/YPeen4p6oK8DdJs1hkhC6d (4 alertes attendues : bloc ranger non dessiné, à
jouer dans l'aperçu admin) ; base `verdicts` vide à la publication.

## 5. Lot 1 : publication (2026-11-11)

Verdicts lus : 4/4 « ok », sans commentaire. `publier-lot.ts` en simulation (4 brouillons passent le contrôle), puis
`--publier` lancé par David : 4/4 publiés, statut relu en base.

## 6. Lot 2 : suites et limites (2026-11-11)

| Point | Modèle (`scripts/questions/tspe-demonstrations-2/`) | Niveau | Variations                                                                                     |
| ----- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| 388   | `01-demontrer-suite-croissante-non-majoree`         | 3      | non majorée : il existe N, u_N > A (choix), croissante (choix), définition (choix), étapes (4) |
| 389   | `02-demontrer-limite-q-puissance-n`                 | 3      | hérédité de Bernoulli, na² (case), 1 + a > 0 (choix), a = q − 1 (case, q de 2 à 9), étapes (4) |
| 390   | `03-demontrer-minoration-limite-infinie`            | 3      | limite de (vₙ) traduite (choix), rang max(n₀ ; N₁) (choix), définition (choix), étapes (4)     |
| 391   | `04-demontrer-limites-exponentielle`                | 5      | f′(x) = eˣ − 1 (case), minimum f(0) = 1 (choix), inverse en −∞ (choix), étapes (4)             |
| 405   | `05-demontrer-croissance-comparee-exp-puissance`    | 6      | cas n = 1 par eˣ ⩾ x²/2 admis (choix), X = x/n (case), conclusion (choix), étapes (4)          |

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-11 : convergence monotone 1-2, suites
géométriques 1-2, comparaison et encadrement 1-2, croissances comparées 3-4 ; 405 après 391). Aucun tag sur ces
points. Script : `docs/wip/questions/lot-tspe-demonstrations-2.py`.

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables, 73 specs vertes, 0 `\textcolor` hors `$` ;
4 296 formules des aperçus (483 distinctes) passées à `validateLatex` + accolades, 0 problème ; brouillons en base
locale (copie hors dépôt) ; aperçu admin vu à l'écran (étapes à ranger 389, choix 405).

Piège du lot : `x/n` saisi en ligne sort en « forme à améliorer » (bad_form) ; MathLive donne `\frac{x}{n}`, seule
écriture alternative retenue en spec.

PR des fichiers : #2561, mergée (CI verte du premier coup).

## 7. Lot 2 : brouillons en prod, rangement (2026-11-11)

David a lancé `create-questions --publier` depuis le dépôt principal : 5 brouillons. Ids reportés dans les JSON (branche
de rangement), dépôt principal rendu propre (`git restore`). Relevé prod (MCP) : 5 brouillons `{T_SPE}`, sans nœud ni
tag ; les 5 points actifs sur leurs sous-notions actives.

| Modèle   | Sous-notion                                              | Point    |
| -------- | -------------------------------------------------------- | -------- |
| 1b7b322a | Suites › Limites de suites › convergence monotone        | TSPE-388 |
| 9ca26a84 | Suites › Limites de suites › suites géométriques         | TSPE-389 |
| 0a9babf6 | Suites › Limites de suites › comparaison et encadrement  | TSPE-390 |
| 2a86b496 | Fonctions › Limites de fonctions › croissances comparées | TSPE-391 |
| c8571d78 | Fonctions › Limites de fonctions › croissances comparées | TSPE-405 |

Migration `20261111174042_questions_tspe_demonstrations_2_rangement_tags.sql` (copie de celle du lot 1, seuls
l'en-tête, les données et les compteurs changent) ; test
`tests/integration/questions-tspe-demonstrations-2-rangement-tags.test.ts` 12/12 vert, rouge sans la migration
(partie aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie, vert relancé après le pre-commit. `security-auditor` :
aucun finding. Accès : personne de plus (Q5).

Mergée (#2563, CI verte du premier coup) ; `check:migrations --pr` vert ; `db:migrate` depuis le dépôt principal (seule
migration en attente) ; vérifié en prod : 5 brouillons, chacun sur sa sous-notion avec son seul point, `updated_at`
inchangé. Garde des niveaux : aucun niveau manquant.

## 8. Lot 2 : page à cocher (2026-11-11)

`page-a-cocher.ts --dir scripts/questions/tspe-demonstrations-2`, lu en base prod : 5 brouillons `draft`, chacun sur son
point. Page : https://claude.ai/artifact/DCDGpXzdqBKuo28RztAXG7 (capacité `db`) ; 5 alertes attendues (bloc ranger non
dessiné, à jouer dans l'aperçu admin) ; base `verdicts` vide à la publication.

## 9. Lot 2 : publication (2026-11-11)

Verdicts lus : 5/5 « ok », sans commentaire. `publier-lot.ts` en simulation (5 brouillons passent le contrôle), puis
`--publier` lancé par David : 5/5 publiés, statut relu en base (MCP).

## 10. Lot 3 : dérivation, logarithme, primitives (2026-11-11)

| Point | Modèle (`scripts/questions/tspe-demonstrations-3/`) | Niveau | Variations                                                                                           |
| ----- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| 421   | `01-demontrer-courbe-au-dessus-des-tangentes`       | 4      | f′ croissante (choix), g(a) = 0 (case), g ⩾ 0 (choix), étapes (4)                                    |
| 448   | `02-demontrer-derivee-logarithme`                   | 3      | e^(ln x) = x (case), dérivée de e^(ln x) (choix), ln′(x) = 1/x (case), étapes (4)                    |
| 449   | `03-demontrer-limite-x-ln-x-en-0`                   | 7      | x ln x = X e^X (case), X → −∞ (choix), composition (choix), étapes (4)                               |
| 471   | `04-demontrer-primitives-different-d-une-constante` | 5      | H′ = 0 (case), dérivée nulle sur un intervalle (choix), F = G + c (choix), étapes (4)                |
| 472   | `05-demontrer-resolution-y-prime-egal-ay`           | 2      | dérivée de e^(ax) (case, a de −6 à 6 sauf −1, 0, 1), z′ = 0 (choix), y = Ce^(ax) (choix), étapes (4) |

Niveaux : après ceux déjà présents sur le nœud (relevé prod du 2026-11-11 : inégalités de convexité 3, dérivée de ln
1-2, croissances comparées 3-6 (391 et 405 compris), primitives : notion 1-4, y′ = ay 1). Aucun tag sur ces points.
**TSPE-472 est posé sur la notion « Équations différentielles › y′ = ay »**, qui n'a pas de sous-notion (un modèle
publié y est déjà) : la migration de rangement visera ce nœud à deux niveaux. Script :
`docs/wip/questions/lot-tspe-demonstrations-3.py`.

Vérifié : `create-questions` en simulation 5/5 (69 specs vertes) ; `question:specs` 150 tirages par variation, 5/5
importables, 0 `\textcolor` hors `$` ; 4 848 formules des aperçus passées à `validateLatex` + accolades, 0 problème ;
brouillons en base locale (copie hors dépôt) ; aperçu admin vu à l'écran (case et étapes à ranger de 472, choix de
448). Le `C` de `$Ce^{ax}$` sort en romain dans l'appli, comme dans les modèles déjà publiés (rien de propre au lot).

PR des fichiers : #2573, mergée.

## 11. Lot 3 : brouillons en prod, rangement (2026-11-11)

David a lancé `create-questions --publier` depuis le dépôt principal : 5 brouillons. Ids reportés dans les JSON (branche
de rangement), dépôt principal rendu propre (`git restore`). Relevé prod (MCP) : 5 brouillons `{T_SPE}`, sans nœud ni
tag ; les 5 points actifs, aucun déjà tagué ; sur la notion « y′ = ay », le modèle publié 968f4295 est déjà rangé et
tagué (TSPE-464, TCOMP-253) : un modèle sur une notion est accepté par la règle des tags.

| Modèle   | Nœud                                                           | Point    |
| -------- | -------------------------------------------------------------- | -------- |
| aa8e1716 | Fonctions › Convexité › inégalités de convexité                | TSPE-421 |
| 2d8d1efd | Fonctions › Logarithmes › dérivée                              | TSPE-448 |
| f68e6a98 | Fonctions › Limites de fonctions › croissances comparées       | TSPE-449 |
| eaf0f7f5 | Équations différentielles › y′ = f › primitives : notion       | TSPE-471 |
| 3885e298 | Équations différentielles › y′ = ay (notion, sans sous-notion) | TSPE-472 |

Migration `20261111224848_questions_tspe_demonstrations_3_rangement_tags.sql` (celle du lot 2, plus : sous-notion
facultative et seconde passe de résolution sur la notion, aller et rollback) ; test
`tests/integration/questions-tspe-demonstrations-3-rangement-tags.test.ts` 12/12 vert, rouge sans la migration (partie
aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie. `security-auditor` : aucun finding bloquant (non bloquant : pas de cas « notion
de 472 introuvable », couvert par la même garde que « point archivé »). Accès : personne de plus (Q5).

Mergée (#2579, CI verte du premier coup) ; `check:migrations --pr` vert ; `db:migrate` depuis le dépôt principal (seule
migration en attente) ; vérifié en prod : 5 brouillons, chacun sur son nœud (3885e298 sur la notion) avec son seul
point, `updated_at` inchangé. Garde des niveaux : aucun niveau manquant.

## 12. Lot 3 : page à cocher (2026-11-12)

`page-a-cocher.ts --dir scripts/questions/tspe-demonstrations-3`, lu en base prod : 5 brouillons `draft`, chacun sur son
point. Page : https://claude.ai/artifact/Rt9XXTXJnsPSdGGDpUYsv1 (capacité `db`) ; 5 alertes attendues (bloc ranger non
dessiné, à jouer dans l'aperçu admin) ; base `verdicts` vide à la publication.

## 13. Lot 3 : publication (2026-11-12)

Verdicts lus : 5/5 « ok », sans commentaire (ids = ceux du § 11). `publier-lot.ts` en simulation (5 brouillons passent
le contrôle), puis `--publier` lancé par David : 5/5 publiés, statut relu en base (MCP : 5 `published`).

## 14. Lot 4 : intégration et loi binomiale (2026-11-12)

| Point | Modèle (`scripts/questions/tspe-demonstrations-4/`) | Niveau | Variations                                                                                                                         |
| ----- | --------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 494   | `01-demontrer-fonction-integrale-primitive`         | 4      | encadrement par croissance (choix), limite du taux = f(x) (case), F(a) = 0 (case), étapes (4)                                      |
| 495   | `02-demontrer-integration-par-parties`              | 4      | (uv)′ (choix), uv primitive de (uv)′ (choix), formule isolée (choix), étapes (4)                                                   |
| 512   | `03-demontrer-loi-binomiale`                        | 7      | probabilité d'un chemin (choix), nombre de chemins C(n, k) (case, n de 3 à 6, k de 1 à n − 1), incompatibilité (choix), étapes (4) |
| 528   | `04-demontrer-esperance-loi-binomiale`              | 3      | E(Xᵢ) = p (case), linéarité (choix), exemple E(X) (case, n de 2 à 20, p = 0,1 à 0,9), étapes (4)                                   |
| 623   | `05-demontrer-variance-loi-binomiale`               | 4      | V(Xᵢ), facteur 1 − p (case), indépendance (choix), exemple V(X) (case, n et p tirés), étapes (4)                                   |

Niveaux : après ceux déjà présents sur la sous-notion (relevé prod du 2026-11-12 : dérivée d'une fonction intégrale
2-3, intégration par parties 1-3, expression de la loi 1-6, espérance et variance 1-2 ; 623 après 528). Les 5 points
sont sur une sous-notion, aucun tagué. Q3 : pour 528 et 623, la variation d'exemple tire n et p (k n'y a pas de
sens). Script : `docs/wip/questions/lot-tspe-demonstrations-4.py`.

Vérifié : `create-questions` en simulation 5/5 (72 specs vertes) ; `question:specs` 150 tirages par variation, 5/5
importables, 0 `\textcolor` hors `$` ; 3 916 formules des aperçus (439 distinctes) passées à `validateLatex` +
accolades, 0 problème ; brouillons en base locale (copie hors dépôt) ; aperçu admin vu à l'écran (case de 512,
étapes à ranger et exemple de 623, choix de 495, énoncé de 528).

Pièges du lot, vus seulement à l'écran :

- **`\dots` sort en rouge** (commande non rendue), dans l'énoncé comme dans les étapes à ranger ; `validateLatex` ne
  le signale pas. Remplacé par `\cdots`, qui est rendu. 64 `\dots` dans d'autres `scripts/questions/` (1re, 2de,
  dénombrement de terminale) : à regarder hors chantier, certains peuvent être dans des blocs de code.
- Réponse attendue décimale calculée (`{{eval:n*t*(10-t)/100}}`) : sans `;d`, elle sort en fraction (`\dfrac{21}{10}`)
  et la saisie « 2,1 » est jugée « forme à améliorer ». Avec `;d`, c'est correct.
- Propositions de choix trop longues (formule complète d'intégration par parties, en `\displaystyle`) : elles débordent
  de leur case. Question reformulée (« Que vaut ∫ u v′ ? »), propositions réduites au membre de droite.
- Aperçu admin : le `?seed=` de l'adresse est ignoré ; la graine se saisit dans le champ « Seed », puis « Générer ».

## 15. Lot 4 : brouillons en prod, rangement (2026-11-12)

David a lancé `create-questions --publier` depuis le dépôt principal : 5 brouillons. Ids reportés dans les JSON (branche
de rangement), dépôt principal rendu propre (`git restore`). Relevé prod (MCP) : 5 brouillons `{T_SPE}`, sans nœud ni
tag ; les 5 points actifs sur leurs sous-notions actives, aucun déjà tagué. Noms à apostrophe droite (`'`, 0x27) :
« dérivée d'une fonction intégrale », « Calcul d'intégrales ».

| Modèle   | Sous-notion                                                         | Point    |
| -------- | ------------------------------------------------------------------- | -------- |
| 0b85dc50 | Intégration › Fonction intégrale › dérivée d'une fonction intégrale | TSPE-494 |
| 6e4e779c | Intégration › Calcul d'intégrales › intégration par parties         | TSPE-495 |
| a4b9281f | Probabilités › Loi binomiale › expression de la loi                 | TSPE-512 |
| 040b57c3 | Probabilités › Loi binomiale › espérance et variance                | TSPE-528 |
| 3e797f0a | Probabilités › Loi binomiale › espérance et variance                | TSPE-623 |

Migration `20261112051818_questions_tspe_demonstrations_4_rangement_tags.sql` (copie de celle du lot 2, seuls
l'en-tête, les données et le préfixe `_qtd4_` changent) ; test
`tests/integration/questions-tspe-demonstrations-4-rangement-tags.test.ts` 12/12 vert, rouge sans la migration (partie
aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie. Accès : personne de plus (Q5). `security-auditor` :
aucun finding.

Mergée (#2585, CI verte du premier coup) ; `check:migrations --pr` vert ; `db:migrate` depuis le dépôt principal (seule
migration en attente) ; vérifié en prod : 5 brouillons, chacun sur sa sous-notion avec son seul point, `updated_at`
inchangé. Garde des niveaux : aucun niveau manquant.

Piège : commitlint refuse une ligne de corps de plus de 100 caractères (couper à la main).

## 16. Lot 4 : page à cocher (2026-11-12)

`page-a-cocher.ts --dir scripts/questions/tspe-demonstrations-4`, lu en base prod : 5 brouillons `draft`, chacun sur son
point. Page : https://claude.ai/artifact/WFfKsrjNvYpQgVypTTSoJm (capacité `db`) ; 5 alertes attendues (bloc ranger non
dessiné, à jouer dans l'aperçu admin) ; base `verdicts` vide à la publication.

## 17. Lot 4 : publication (2026-11-12)

Verdicts lus : 5/5 « ok », sans commentaire (ids = ceux du § 15). `publier-lot.ts` en simulation (5 brouillons passent
le contrôle), puis `--publier` lancé par David : 5/5 publiés, statut relu en base (MCP : 5 `published`). Fin des
démonstrations.

## 18. Algorithmes : relevé et phase 0 (2026-11-12)

Relevé prod (MCP, 2026-11-12) : les 18 points sont actifs, de type `algorithme`, et **aucun modèle n'est tagué** dessus.
Le niveau indiqué est le plus haut déjà présent sur le nœud.

| Point | Algorithme                                       | Nœud du point (prod)                                                       | Niv. max |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------- | -------- |
| 324   | Génération ou tirage aléatoire d'une permutation | Dénombrement › Arrangements et permutations › permutations                 | 3        |
| 393   | Valeurs approchées de π, e, √2, φ, ln 2          | **notion** Suites › Limites de suites                                      | —        |
| 433   | Dichotomie                                       | Fonctions › Continuité › encadrement d'une solution                        | 3        |
| 434   | Newton                                           | Fonctions › Continuité › encadrement d'une solution                        | 3        |
| 592   | Sécante                                          | Fonctions › Continuité › encadrement d'une solution                        | 3        |
| 450   | Briggs (logarithme)                              | **notion** Fonctions › Logarithmes                                         | —        |
| 474   | Euler pour y′ = f et y′ = ay + b                 | Équations différentielles › Généralités › méthode d'Euler                  | aucun    |
| 610   | Milieux                                          | Intégration › Calcul d'intégrales › méthode des rectangles                 | 2        |
| 611   | Trapèzes                                         | Intégration › Calcul d'intégrales › méthode des rectangles                 | 2        |
| 500   | Brouncker (ln 2)                                 | Intégration › Calcul d'intégrales › méthode des rectangles                 | 2        |
| 499   | Monte-Carlo                                      | **notion** Intégration › Intégrale et aire                                 | —        |
| 513   | Planche de Galton                                | **notion** Probabilités › Loi binomiale                                    | —        |
| 514   | Surréservation : plus petit k, P(X > k) ⩽ α      | Probabilités › Loi binomiale › intervalle de fluctuation                   | 2        |
| 515   | Échantillon d'une variable aléatoire             | Probabilités › Sommes et concentration › échantillons                      | 3        |
| 534   | P(\|Sₙ − pn\| > √n)                              | Probabilités › Sommes et concentration › Bienaymé-Tchebychev               | 2        |
| 624   | La comparer à Bienaymé-Tchebychev                | Probabilités › Sommes et concentration › Bienaymé-Tchebychev               | 2        |
| 535   | Marche aléatoire                                 | Probabilités › Probabilités conditionnelles › épreuves indépendantes succ. | 4        |
| 536   | N échantillons, écart type des moyennes          | Probabilités › Sommes et concentration › loi des grands nombres            | 1        |

**Réemplois du § 1 : aucun n'est possible.** Un tag n'est accepté que si le point est sur le nœud du modèle ou sur sa
notion (`question_template_points_check_rules`). Or les modèles de 1re sont rangés ailleurs : Newton `2286c302` sur
Dérivation › tangente, Euler `a6d5ec1e` sur Exponentielle › dérivée, Monte-Carlo `e05ecec7` et `7652fee6` sur
Échantillonnage › simulation, e `3762e1e9` sur Exponentielle. La marche aléatoire `4bd92a32` est bien sur la
sous-notion de 535, mais c'est un calcul de probabilité, pas un programme. Ces modèles servent de gabarits : formes,
distracteurs et pièges du § 17 du journal archivé `questions-1spe-demonstrations`.

### Phase 0 — questions à David (posées le 2026-11-12)

- **Q1 — Périmètre et lots.** Les 18 algorithmes, en 4 lots : (5) analyse (393, 433, 434, 592, 450) ; (6) équations
  différentielles et intégration (474, 610, 611, 500, 499) ; (7) probabilités, simulation et loi binomiale (324, 513,
  514, 515) ; (8) probabilités, concentration (534, 624, 535, 536). _Reco : oui._
- **Q2 — Forme.** Comme D9 de la 1re : Python seulement ; (a) faire tourner (valeur renvoyée pour une entrée tirée, en
  case), (b) compléter une ligne (case choix, 4 propositions, erreurs typiques en distracteurs), (c) interpréter (de
  quoi la valeur renvoyée est une approximation). 2 ou 3 variations par modèle. Un programme aléatoire n'est jamais
  « faites-le tourner » : décompte donné (Monte-Carlo, 536), ou formes (b) et (c) seulement (324 tirage, 513, 515, 535).
  Les sommes binomiales (514, 534) ne se calculent pas à la main : (a) se fait avec une table de valeurs donnée dans
  l'énoncé, comme `f0c8c1fc`. _Reco : oui._
- **Q3 — Rangement.** Un modèle par point, tagué sur son point P (ADR 0020), soit **18 modèles neufs**. Aucun réemploi
  (voir ci-dessus) ; les modèles de 1re servent de gabarits. 534 et 624 font deux modèles, sur la même sous-notion. Les
  modèles vont sur la sous-notion du point, au-dessus des niveaux déjà présents, sans nœud neuf. Pour les 4 points posés
  sur une notion, le modèle va sur une sous-notion existante et le point reste sur la notion, comme au lot 11 de la 1re :
  393 → Limites de suites › convergence monotone (suites monotones vers √2, e) ; 450 → Logarithmes › propriétés
  algébriques (ln √x = ½ ln x) ; 499 → Intégrale et aire › aire algébrique ; 513 → Loi binomiale › schéma de
  Bernoulli. _Reco : oui._
- **Q4 — 393, un seul modèle** à 3 variations (une par constante) : √2 par Héron (uₙ₊₁ = (uₙ + 2/uₙ)/2), φ par
  uₙ₊₁ = 1 + 1/uₙ, e par la somme des 1/k!. π est déjà traité par Archimède en 1re, et ln 2 par Brouncker (500).
  _Reco : oui._
- **Q5 — Accès** (avant toute migration) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » _Reco :
  personne de plus. Ce sont des brouillons, et la migration ne touche que le nœud et les tags. À la publication, les
  élèves de terminale spé voient les modèles, comme pour tout modèle publié._
- **Q6 — Publication** comme les démonstrations : page à cocher, puis `publier-lot.ts` lancé par David. _Reco : oui._

**D2 (David, 2026-11-12, « je valide »)** : Q1 à Q6 telles que recommandées. Lots 5 à 8 dans l'ordre de Q1 ; forme D9
(a/b/c, Python, jamais de programme aléatoire à faire tourner, table de valeurs donnée pour 514 et 534) ; 18 modèles
neufs, sans nœud neuf, et pour les points posés sur une notion, le modèle va sur la sous-notion de Q3 ; 393 en un
modèle (√2, φ, e) ; accès : personne de plus ; publication comme les démonstrations.

## 19. Lot 5 : algorithmes, analyse (2026-11-12)

| Point | Modèle (`scripts/questions/tspe-algorithmes-5/`) | Nœud, niveau                                | Variations                                                                                                     |
| ----- | ------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 393   | `01-valeurs-approchees-racine-2-nombre-d-or-e`   | Limites de suites › convergence monotone, 4 | Héron : `heron(p, 1)`, p ∈ {1, 2, 4, 5} (case) ; nombre d'or par x = 1 + 1/x (choix) ; e : `t = t / k` (choix) |
| 433   | `02-methode-de-dichotomie`                       | Continuité › encadrement d'une solution, 4  | deux tours sur x² − c, c non carré de 2 à 15 (deux cases a et b) ; `if f(a) * f(m) <= 0:` ; tours pour 10⁻ᵏ    |
| 434   | `03-methode-de-newton`                           | Continuité › encadrement d'une solution, 5  | une itération sur x³ − c depuis 1 (case, entier) ; `while abs(f(x)) > eps:` (choix) ; ∛c (choix)               |
| 592   | `04-methode-de-la-secante`                       | Continuité › encadrement d'une solution, 6  | `secante(1, 3, 1)` sur x² − c = (3 + c)/4 (case) ; ligne de la sécante (choix) ; que représente x (choix)      |
| 450   | `05-algorithme-de-briggs`                        | Logarithmes › propriétés algébriques, 3     | `briggs(q^(2^n), n)` = 2ⁿ(q − 1) (case) ; `return 2**n * (x - 1)` (choix) ; ln √x = ½ ln x (choix)             |

Script : `docs/wip/questions/lot-tspe-algorithmes-5.py`. Le titre « Méthode de Newton en Python » existe déjà en prod au
niveau 5 (`2286c302`, 1re) : `create-questions` aurait bloqué le lot. Le modèle s'appelle donc « … : racine cubique ».
Dichotomie : les étapes du corrigé passent par `{{if}}` sur le signe de f(m) ; a et b finaux par `floor(4*sqrt(c))/4`.

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables (58 specs vertes), 0 `\textcolor` hors `$`, 0
avertissement ; 210 réponses « faire tourner » recoupées en exécutant les programmes des énoncés (0 écart) ;
`create-questions` en simulation prod (5 à créer, 0 homonyme) ; brouillons en base locale (copie hors dépôt) ; aperçu
admin vu à l'écran : case double de la dichotomie jouée juste, puis son corrigé ; choix faux de la sécante, jugé
faux ; ∛ (Newton), nombre d'or et propriétés de ln rendus.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/tspe-algorithmes-5 --publier`

## 20. Lot 5 : brouillons en prod, rangement (2026-11-12)

David a lancé `create-questions --publier` depuis le dépôt principal : 5 brouillons. Ids reportés dans les JSON (branche
de rangement), dépôt principal rendu propre (`git restore`). Relevé prod (MCP) : 5 brouillons `{T_SPE}` aux niveaux du
§ 19 (4, 4, 5, 6, 3), sans nœud ni tag ; les 5 points actifs, aucun déjà tagué ; 393 et 450 posés sur leur notion
(Limites de suites, Logarithmes), 433, 434 et 592 sur « encadrement d'une solution » ; les 3 sous-notions visées
actives, noms à apostrophe droite.

| Modèle   | Sous-notion                                         | Point    |
| -------- | --------------------------------------------------- | -------- |
| b7fd4743 | Suites › Limites de suites › convergence monotone   | TSPE-393 |
| 641e5a83 | Fonctions › Continuité › encadrement d'une solution | TSPE-433 |
| 85a3aec6 | Fonctions › Continuité › encadrement d'une solution | TSPE-434 |
| 3bc7b3c9 | Fonctions › Continuité › encadrement d'une solution | TSPE-592 |
| f455700a | Fonctions › Logarithmes › propriétés algébriques    | TSPE-450 |

Migration `20261112131748_questions_tspe_algorithmes_5_rangement_tags.sql` (copie de celle du lot 4, seuls l'en-tête,
les données et le préfixe `_qta5_` changent) ; test `tests/integration/questions-tspe-algorithmes-5-rangement-tags.test.ts`
12/12 vert, rouge sans la migration (partie aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie. Accès :
personne de plus (§ 18 Q5, D2).
`security-auditor` : aucun finding. PR #2594.

Mergée (#2594 ; premier passage rouge sur la garde doc, ligne `Doc-inchangée:` ajoutée dans un commit, puis CI verte) ;
`check:migrations --pr` vert ; `db:migrate` refusé (« inserted before » : une autre session avait migré après
l'horodatage), `db push --dry-run --include-all` ne montrait que cette migration, puis `--include-all`. Vérifié en
prod : 5 brouillons, chacun sur sa sous-notion avec son seul point, `updated_at` inchangé.

## 21. Lot 5 : page à cocher (2026-11-12)

`page-a-cocher.ts --dir scripts/questions/tspe-algorithmes-5`, lu en base prod : 5 brouillons `draft`, chacun sur son
point, 3 exemples chacun, aucune alerte. Page : https://claude.ai/artifact/XdXrnzXoD8SHNnWRY4QMUC (capacité `db`) ;
base `verdicts` vide à la publication.

## 22. Lot 5 : publication (2026-11-12)

Verdicts lus : 5/5 « ok », sans commentaire (ids = ceux du § 20). `publier-lot.ts` en simulation puis `--publier`,
lancés par David (le mode auto a bloqué la simulation : elle lit la prod). Relu en base (MCP) : 5 `published`.

## 23. Lot 6 : algorithmes, équations différentielles et intégration (2026-11-12)

Relevé prod (MCP, 2026-11-12) : les 5 points actifs, aucun tagué. 474 sur « méthode d'Euler » (sous-notion vide) ;
610, 611, 500 sur « méthode des rectangles » (niveau max 2) ; 499 sur la notion Intégrale et aire, modèle sur « aire
algébrique » (niveau max 2, D2 Q3). Aucun homonyme de titre.

**D3 (David, 2026-11-12, « je te suis »)** : tableau ci-dessous tel que proposé ; Euler au niveau 1 (sous-notion
vide) ; Monte-Carlo sur x³ et le rectangle [0 ; 2] × [0 ; 8] (pas la parabole de 1re) ; trapèzes (c) par la convexité.

| Point | Modèle (`scripts/questions/tspe-algorithmes-6/`) | Nœud, niveau                     | Variations                                                                                   |
| ----- | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------- |
| 474   | `01-methode-d-euler`                             | méthode d'Euler, 1               | `euler(a, b, y0, 0.5, 2)` sur y′ = ay + b (case) ; `y = y + h * f(x)` (choix) ; y(t) (choix) |
| 610   | `02-methode-des-milieux`                         | méthode des rectangles, 3        | x² sur [0 ; B], n ∈ {2, 4}, fraction (case) ; `f(a + (k + 0.5) * h)` (choix) ; limite 1/3    |
| 611   | `03-methode-des-trapezes`                        | méthode des rectangles, 4        | x² sur [0 ; B], n ∈ {2, 4}, fraction (case) ; `(f(x) + f(x + h)) * h / 2` ; excès (convexe)  |
| 500   | `04-algorithme-de-brouncker`                     | méthode des rectangles, 5        | `brouncker(n)`, n ∈ {2, 3} → 7/12, 37/60 (case) ; `1 / ((2*k - 1) * (2*k))` ; ln 2 (choix)   |
| 499   | `05-methode-de-monte-carlo`                      | Intégrale et aire › aire alg., 3 | décompte c donné → 16c/1000 (case) ; `if y <= f(x):` (choix) ; c/N → 1/4 (choix)             |

Script : `docs/wip/questions/lot-tspe-algorithmes-6.py`. Pièges : en spec, une variable passée en décimal (`r: 0.375`)
impose la forme décimale : passer les fractions en chaîne (`'3/8'`) ; un décimal exact là où la fraction est attendue
rend `bad_form` (spec avec `constraintViolations: ['form']`). Euler : y0 ∈ {0, 4, 5}, car a = −1, b = y0 tombait sur
l'équilibre (y constant), vu à l'écran.

Vérifié : `question:specs` 150 tirages par variation, 5/5 importables (62 specs vertes), 0 `\textcolor` hors `$` ;
260 réponses « faire tourner » recoupées en exécutant les programmes des énoncés (0 écart) ; `create-questions` en
simulation prod (5 à créer, 0 déjà en base) ; brouillons en base locale (copie hors dépôt) ; aperçu admin vu à
l'écran : trapèzes, choix (intégrale, code) rendus, case 3/8 jouée « Juste » ; Euler rendu.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/tspe-algorithmes-6 --publier`

Mergé (#2601, 2026-11-12) : CI verte ; le premier `gh pr merge` a reçu un 502, puis « Merge already in progress » ;
le commit de merge `cdeb275` est arrivé sur `main` mais GitHub a classé la PR « CLOSED ». Vérifié : les 5 JSON sont
dans `main`. Le dépôt principal, dont l'index portait un fichier d'une autre session, ne pouvait pas `pull` : David a
lancé `create-questions` depuis le worktree (à jour, base prod par `.env`).

## 24. Lot 6 : brouillons en prod, rangement (2026-11-12)

David a lancé `create-questions --publier` depuis le worktree : 5 brouillons. Ids reportés dans les JSON (branche de
rangement). Relevé prod (MCP) : 5 brouillons `{T_SPE}` aux niveaux du § 23 (1, 3, 4, 5, 3), sans nœud ni tag ; les 5
points actifs, aucun déjà tagué ; 499 posé sur sa notion (Intégrale et aire), 474 sur « méthode d'Euler », 610, 611 et
500 sur « méthode des rectangles » ; les 3 sous-notions visées actives, noms à apostrophe droite.

| Modèle   | Sous-notion                                                | Point    |
| -------- | ---------------------------------------------------------- | -------- |
| 848e62ff | Équations différentielles › Généralités › méthode d'Euler  | TSPE-474 |
| c9cd3e4e | Intégration › Calcul d'intégrales › méthode des rectangles | TSPE-610 |
| 4625cdec | Intégration › Calcul d'intégrales › méthode des rectangles | TSPE-611 |
| baf6dc34 | Intégration › Calcul d'intégrales › méthode des rectangles | TSPE-500 |
| 4cf87b77 | Intégration › Intégrale et aire › aire algébrique          | TSPE-499 |

Migration `20261112161704_questions_tspe_algorithmes_6_rangement_tags.sql` (copie de celle du lot 5, seuls l'en-tête,
les données et le préfixe `_qta6_` changent) ; test `tests/integration/questions-tspe-algorithmes-6-rangement-tags.test.ts`
12/12 vert, rouge sans la migration (partie aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie (`cmp`).
Accès : personne de plus (§ 18 Q5, D2).
`security-auditor` : aucun finding (diff contre le lot 5 limité aux données ; gardes résolues en prod, 1 nœud et
1 point par ligne). PR #2602.

Rangement appliqué : `db:migrate` lancé du dépôt principal après #2602 (il a aussi appliqué
`20261112154105_active_student_ids_lecture_seule`, mergée par une autre session et encore en attente). Vérifié en prod : les
5 brouillons sur leur sous-notion (méthode d'Euler ; méthode des rectangles × 3 ; aire algébrique), un point chacun,
`updated_at` inchangé. Branches du lot 6 supprimées.

## 25. Lot 6 : page à cocher (2026-11-12)

`page-a-cocher.ts --dir scripts/questions/tspe-algorithmes-6`, lu en base prod : 5 brouillons `draft`, chacun sur son
point, 3 exemples chacun, aucune alerte. Page : https://claude.ai/artifact/29jy3b8va86UQqrKVi673t (capacité `db`) ;
base `verdicts` vide à la publication.

## 26. Lot 6 : publication (2026-11-12)

Verdicts lus : 5/5 « ok », sans commentaire (ids = ceux du § 24). `publier-lot.ts` en simulation puis `--publier`,
lancés par David. Relu en base (MCP) : 5 `published`.

## 27. Lot 7 : algorithmes, probabilités, simulation et loi binomiale (2026-11-12)

Relevé prod (MCP, 2026-11-12) : les 4 points actifs, de type `algorithme`, aucun tagué. 324 sur « permutations »
(niveau max 3) ; 513 sur la notion Loi binomiale, modèle sur « schéma de Bernoulli » (niveau max 3, D2 Q3) ; 514 sur
« intervalle de fluctuation » (niveau max 2) ; 515 sur « échantillons » (niveau max 3). Aucun homonyme de titre.

**D4 (David, 2026-11-12, « je valide », après mes recos)** : tableau ci-dessous tel que proposé. 513 et 515 sans
forme (a) (programmes aléatoires) : 513 double (c) (loi, puis P(X = k)), 515 double (b) (simulation de X, puis somme) ;
niveaux juste au-dessus de l'existant ; 324 (a) compte les listes (n!), sans demander la k-ième.

| Point | Modèle (`scripts/questions/tspe-algorithmes-7/`) | Nœud, niveau                    | Variations                                                                                                                    |
| ----- | ------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 324   | `01-permutations-en-python`                      | permutations, 4                 | `len(permutations([1, …, n]))`, n ∈ {3, 4, 5} → n! (case) ; `j = randint(0, i)` ; 1/n! (choix)                                |
| 513   | `02-planche-de-galton`                           | Loi binomiale › schéma de B., 4 | `if random() < 0.5:` (choix) ; loi B(n ; 0,5) (choix) ; P(case k) = C(n, k)/2ⁿ, fraction (case)                               |
| 514   | `03-probleme-de-la-surreservation`               | intervalle de fluctuation, 3    | table de P(X ⩽ k), B(80 ; 0,9), α ∈ {0,2 ; 0,1 ; 0,05 ; 0,01} → 74, 75, 76, 78 (case) ; `while 1 - F(k) > alpha:` ; sens de k |
| 515   | `04-simuler-un-echantillon`                      | échantillons, 4                 | `if random() < 0.3:` (choix) ; `S = S + X()` (choix) ; moyenne d'un grand échantillon → E(X)                                  |

Script : `docs/wip/questions/lot-tspe-algorithmes-7.py`. Dans le code Python, un décimal s'écrit en dur ou par
`{{if}}` (α de 514), jamais par `{{eval}}`. Les `{{if}}` imbriqués à branches `0{,}6995` passent. Table de 514
calculée en Python (`math.comb`). Choix de 514 (c) : la bonne réponse raccourcie (elle se trahissait par sa longueur) ;
515 (c) : quatre nombres nus (pas « E(X) = » sur deux d'entre eux seulement).

Vérifié : `question:specs` 150 tirages par variation, 4/4 importables (53 specs vertes), 0 `\textcolor` hors `$` ;
149 réponses recoupées en exécutant les programmes des énoncés (324 (a), 514 (a), et 513 P(X = k) par les 2ⁿ chutes) :
0 écart ; `create-questions` en simulation prod (4 à créer, 0 déjà en base) ; brouillons en base locale (copie hors
dépôt, variables de `.env.local` passées à la main : `dotenv` ne lit que `.env`) ; aperçu admin vu à l'écran :
surréservation, table en virgules, case 74 jouée « Juste », corrigé rendu ; échantillon, choix −0,1 / 0,5 / 1,89 / 0,3
rendus en virgules, 0,3 joué « Faux » ; Galton, lois rendues.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/tspe-algorithmes-7 --publier`

Mergé (#2605, 2026-11-12) : CI verte ; merge retardé par un `deploy:prod` en cours (garde-fou), fait à sa fin.

## 28. Lot 7 : brouillons en prod, rangement (2026-11-12)

David a lancé `create-questions --publier` depuis le dépôt principal : 4 brouillons. Ids reportés dans les JSON
(branche de rangement). Relevé prod (MCP) : 4 brouillons `{T_SPE}` aux niveaux du § 27 (4, 4, 3, 4), sans nœud ni tag ;
les 4 points actifs, aucun déjà tagué ; 513 posé sur sa notion (Loi binomiale), 324, 514 et 515 sur leur sous-notion ;
les 4 sous-notions visées actives.

| Modèle   | Sous-notion                                                | Point    |
| -------- | ---------------------------------------------------------- | -------- |
| 0671ee48 | Dénombrement › Arrangements et permutations › permutations | TSPE-324 |
| a29488bc | Probabilités › Loi binomiale › schéma de Bernoulli         | TSPE-513 |
| 88d644e6 | Probabilités › Loi binomiale › intervalle de fluctuation   | TSPE-514 |
| b107cbf1 | Probabilités › Sommes et concentration › échantillons      | TSPE-515 |

Migration `20261112220558_questions_tspe_algorithmes_7_rangement_tags.sql` (copie de celle du lot 6, seuls l'en-tête,
les données et le préfixe `_qta7_` changent) ; test `tests/integration/questions-tspe-algorithmes-7-rangement-tags.test.ts`
12/12 vert, rouge sans la migration (partie aller vidée : 6 rouges, 5 sautés), fichier restauré d'une copie (`cmp`).
Accès : personne de plus (§ 18 Q5, D2).
`security-auditor` : aucun finding (diff contre le lot 6 limité aux données ; chemins, points et noms de sous-notion
résolus en prod à une ligne chacun, 513 sur sa notion).

Rangement appliqué : `db:migrate` lancé du dépôt principal après #2608. Vérifié en prod : les 4 brouillons sur leur
sous-notion (permutations ; schéma de Bernoulli ; intervalle de fluctuation ; échantillons), un point chacun,
`updated_at` inchangé. Branche du lot 7 supprimée. Les 4 JSON modifiés par `create-questions` dans le dépôt principal,
identiques à `origin/main`, y ont été remis à l'état commité avant le pull.

## 29. Lot 7 : page à cocher (2026-11-12)

`page-a-cocher.ts --dir scripts/questions/tspe-algorithmes-7`, lu en base prod : 4 brouillons `draft`, chacun sur son
point, 3 exemples chacun, aucune alerte. Page : https://claude.ai/artifact/LuyXd7gcHJ6gqJJCArM8vH (capacité `db`) ;
base `verdicts` vide à la publication.

## 30. Lot 7 : publication (2026-11-12)

Verdicts lus : 4/4 « ok », sans commentaire (ids = ceux du § 28). `publier-lot.ts` en simulation puis `--publier`,
lancés par David. Relu en base (MCP) : 4 `published`.

## 31. Lot 8 : algorithmes, concentration et loi des grands nombres (2026-11-13)

Relevé prod (MCP, 2026-11-12) : les 4 points actifs, de type `algorithme`, aucun tagué. 534 et 624 sur
« Bienaymé-Tchebychev » (niveau max 2) ; 535 sur « épreuves indépendantes successives » (niveau max 4, dont la marche
aléatoire de 1re `4bd92a32`, un calcul) ; 536 sur « loi des grands nombres » (niveau max 1). Aucun homonyme de titre.

**D5 (David, 2026-11-13, « je valide », après mes recos)** : tableau ci-dessous tel que proposé ; 534 avec p = 0,5
seulement ; 536 sans les proportions 0,68 / 0,95 / 0,997 (approximation normale, hors programme).

| Point | Modèle (`scripts/questions/tspe-algorithmes-8/`) | Nœud, niveau                   | Variations                                                                                       |
| ----- | ------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| 534   | `01-probabilite-de-l-ecart-a-pn`                 | Bienaymé-Tchebychev, 3         | table des P(Sₙ ⩽ k), n ∈ {36, 49, 64, 100}, p = 0,5 (case) ; `if abs(k - n*p) > sqrt(n):` ; sens |
| 624   | `02-comparer-avec-bienayme-tchebychev`           | Bienaymé-Tchebychev, 4         | `borne(n, p)` → p(1 − p) (case) ; `return V / delta**2` ; 0,0352 contre 0,25 (choix)             |
| 535   | `03-simuler-une-marche-aleatoire`                | épreuves indép. successives, 5 | `x = x - 1` ; `if random() < 0.7:` ; position moyenne → n(2p − 1) (case)                         |
| 536   | `04-ecart-type-des-moyennes`                     | loi des grands nombres, 2      | ligne de comptage `abs(m - mu) <= k * sigma / sqrt(n)` ; s ≈ σ/√n (case) ; n × 4 → s ÷ 2         |

Écart au tableau proposé : 534 tire n dans {36, 49, 64, 100}, et non {16, 25, 36, 100} : pour 16 et 25, la somme lue
dans la table arrondie à 10⁻⁴ (0,0212 ; 0,0432) diffère de la valeur exacte arrondie (0,0213 ; 0,0433). Le script le
vérifie (`assert`). Table écrite à 4 décimales (`0{,}0300`, pas `0{,}03`).

Script : `docs/wip/questions/lot-tspe-algorithmes-8.py`. 536 : X vaut 10 − σ ou 10 + σ, avec la probabilité 1/2 chacune
(espérance 10, écart type σ). Un `\textcolor` sur du texte du corrigé va dans `$\text{…}$`.

Vérifié : `question:specs` 150 tirages par variation, 4/4 importables (52 specs vertes), 0 `\textcolor` hors `$` ;
57 réponses recoupées en exécutant les programmes des énoncés (534 et 624 exacts ; 535 et 536 simulés, tolérance
0,1 et 15 %) : 0 écart ; `create-questions` en simulation prod (4 à créer, 0 déjà en base) ; brouillons en base locale
(copie hors dépôt) ; aperçu admin vu à l'écran : 534, table rendue, case 0,0288 jouée « Juste » ; 624 (c), choix D
joué « Faux », corrigé rendu.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/tspe-algorithmes-8 --publier`

Mergé (#2613, 2026-11-13) : CI verte.

## 32. Lot 8 : brouillons en prod, rangement (2026-11-13)

David a lancé `create-questions --publier` depuis le dépôt principal : 4 brouillons. Ids reportés dans les JSON
(branche de rangement). Relevé prod (MCP) : 4 brouillons `{T_SPE}` aux niveaux du § 31 (3, 4, 5, 2), sans nœud ni tag ;
les 4 points actifs, aucun déjà tagué, chacun sur sa sous-notion ; les 3 sous-notions visées actives, une ligne chacune.

| Modèle   | Sous-notion                                                                | Point    |
| -------- | -------------------------------------------------------------------------- | -------- |
| daa7f4e5 | Probabilités › Sommes et concentration › Bienaymé-Tchebychev               | TSPE-534 |
| d01b1293 | Probabilités › Sommes et concentration › Bienaymé-Tchebychev               | TSPE-624 |
| 957c2012 | Probabilités › Probabilités conditionnelles › épreuves indépendantes succ. | TSPE-535 |
| a24cffa6 | Probabilités › Sommes et concentration › loi des grands nombres            | TSPE-536 |

Migration `20261112232927_questions_tspe_algorithmes_8_rangement_tags.sql` (copie de celle du lot 7, seuls l'en-tête,
les données et le préfixe `_qta8_` changent) ; test `tests/integration/questions-tspe-algorithmes-8-rangement-tags.test.ts`
12/12 vert, rouge sans la migration (étape 4 retirée : 2 rouges + `beforeAll` en échec, 5 sautés), fichier restauré
d'une copie (`cmp`). Accès : personne de plus (§ 18 Q5, D2).
`security-auditor` : aucun finding (diff contre le lot 7 limité à l'en-tête, aux données et au préfixe ; deux modèles
sur la même sous-notion, rien ne la suppose unique).

Rangement appliqué : #2615 mergé (CI verte, `check:migrations` OK), `db:migrate` lancé du dépôt principal (seule
migration en attente). Vérifié en prod : les 4 brouillons sur leur sous-notion, un point chacun, `updated_at`
inchangé. Branche supprimée. Les 4 JSON modifiés par `create-questions` dans le dépôt principal, identiques à
`origin/main`, y ont été remis à l'état commité avant le pull.

## 33. Lot 8 : page à cocher (2026-11-13)

`page-a-cocher.ts --dir scripts/questions/tspe-algorithmes-8`, lu en base prod : 4 brouillons `draft`, chacun sur son
point, 3 exemples chacun, aucune alerte. Page : https://claude.ai/artifact/Gkqe46y5T66T7aaWNio2xM (capacité `db`) ;
base `verdicts` vide à la publication.

## 34. Lot 8 : publication, bilan des algorithmes (2026-11-13)

Verdicts lus : 4/4 « ok », sans commentaire (ids = ceux du § 32). `publier-lot.ts` en simulation puis `--publier`,
lancés par David. Relu en base (MCP) : 4 `published`.

Bilan prod (MCP, points `T_SPE` actifs, modèle publié tagué) : `demonstration` 20/20 ; `algorithme` 22/22 ;
`savoir_faire` approfondissement 5/36, soit les **31** du § 1 encore sans modèle ; aucun brouillon tagué. Suites de D1
(§ 2) : démonstrations ✅, algorithmes ✅, approfondissements à faire (phase 0 à poser).

## 35. Approfondissements : relevé et phase 0 (2026-11-13)

Relevé prod (MCP, 2026-11-13) : les 31 points du § 1 sont actifs, de type `savoir_faire`, exigence
`approfondissement`, et **aucun modèle n'est tagué** dessus (les 5 autres approfondissements, 322, 360, 375, 376, 516,
en ont déjà). « Niv. max » = plus haut niveau publié sur le nœud du modèle.

| Lot | Point | Approfondissement                      | Nœud du point (prod)                                  | Modèle sur (sous-notion)                       | Niv. max | Forme pressentie            |
| --- | ----- | -------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | -------- | --------------------------- |
| 9   | 340   | Barycentre de 2, 3 ou 4 points         | **notion** Géométrie › Vecteurs                       | Vecteurs › combinaison linéaire                | 3        | application, coordonnées    |
| 9   | 554   | Associativité du barycentre            | **notion** Géométrie › Vecteurs                       | Vecteurs › combinaison linéaire                | 3        | preuve à trous + ranger     |
| 9   | 341   | Fonction vectorielle de Leibniz        | **notion** Géométrie › Vecteurs                       | Vecteurs › combinaison linéaire                | 3        | application (réduction)     |
| 9   | 362   | Fonction scalaire de Leibniz           | Orthogonalité et distances › produit scalaire espace  | idem                                           | 5        | application (lieu, sphère)  |
| 10  | 374   | Intersection de deux plans             | Espace › positions relatives et intersections         | idem                                           | 3        | application, valeurs tirées |
| 10  | 377   | Sphère ∩ droite                        | Orthogonalité et distances › sphère                   | idem                                           | 4        | application, valeurs tirées |
| 10  | 564   | Plan tangent à une sphère              | Orthogonalité et distances › sphère                   | idem                                           | 4        | application, valeurs tirées |
| 10  | 361   | Sphère circonscrite à un tétraèdre     | Orthogonalité et distances › sphère                   | idem                                           | 4        | application, valeurs tirées |
| 11  | 394   | Suites adjacentes                      | Limites de suites › convergence monotone              | idem                                           | 4        | application + preuve        |
| 11  | 395   | Récurrence linéaire d'ordre 2          | **notion** Suites › Suites récurrentes                | **aucune ne convient** (escalier, point fixe)  | —        | application, valeurs tirées |
| 11  | 396   | Newton (exemples)                      | Suites récurrentes › point fixe                       | idem                                           | 3        | calcul des itérés à la main |
| 11  | 571   | Convergence de la méthode de Héron     | Suites récurrentes › point fixe                       | idem                                           | 3        | preuve à trous + ranger     |
| 12  | 406   | Asymptotes obliques                    | Limites de fonctions › asymptotes                     | idem                                           | 1        | application, valeurs tirées |
| 12  | 584   | Branches infinies                      | Limites de fonctions › asymptotes                     | idem                                           | 1        | application                 |
| 12  | 435   | TVI démontré par dichotomie            | Continuité › valeurs intermédiaires                   | idem                                           | 2        | preuve à trous + ranger     |
| 12  | 436   | f(x + y) = f(x) + f(y), f continue     | **notion** Fonctions › Continuité                     | Continuité › continuité en un point (à défaut) | 2        | preuve à trous + ranger     |
| 12  | 437   | Prolongement par continuité            | Continuité › continuité en un point                   | idem                                           | 2        | application                 |
| 13  | 422   | Courbe de Lorenz                       | **notion** Fonctions › Convexité                      | Convexité › caractérisations                   | 3        | application (Gini)          |
| 13  | 423   | Dérivée n-ième                         | **notion** Fonctions › Dérivation                     | Dérivation › fonctions dérivées                | 7        | application, conjecture     |
| 13  | 424   | Inégalité arithmético-géométrique      | Convexité › inégalités de convexité                   | idem                                           | 4        | preuve (concavité de ln)    |
| 13  | 451   | x ↦ xᵃ                                 | **notion** Fonctions › Logarithmes                    | Logarithmes › propriétés algébriques           | 3        | application                 |
| 13  | 452   | Limite de (1 + x/n)ⁿ                   | **notion** Fonctions › Fonction exponentielle         | Exponentielle › propriétés algébriques ¹       | 8        | preuve à trous + ranger     |
| 13  | 460   | Fonction tangente                      | **notion** Fonctions › Fonctions trigonométriques     | Fonctions trigo › dérivées et variations       | 4        | application                 |
| 14  | 473   | Autres équations différentielles       | Éq. diff. › Généralités › notion de solution          | idem                                           | 1        | application (logistique)    |
| 14  | 496   | Aire par suites adjacentes             | Calcul d'intégrales › méthode des rectangles          | idem                                           | 5        | application                 |
| 14  | 497   | Encadrement de Hₙ par des intégrales   | Calcul d'intégrales › positivité et inégalités        | idem                                           | 3        | preuve à trous + ranger     |
| 15  | 517   | Loi de Poisson (limite de binomiales)  | **notion** Probabilités › Autres lois                 | **aucune ne convient**                         | —        | application, valeurs tirées |
| 15  | 529   | E(XY) = E(X)E(Y), variance d'une somme | Sommes et concentration › espérance et variance somme | idem                                           | 3        | preuve + application        |
| 15  | 537   | Estimation                             | Statistiques › Échantillonnage › estimation propor.   | idem (aucun modèle dessus)                     | —        | application                 |
| 15  | 538   | Marche aléatoire                       | Probabilités conditionnelles › épreuves indép. succ.  | idem                                           | 5        | application (loi binomiale) |
| 15  | 539   | Sondage, sex ratio, demi-vie           | Sommes et concentration › loi des grands nombres      | idem                                           | 2        | application (concentration) |

¹ Comme `3762e1e9` (1SPE-299, valeur approchée de e par (1 + 1/n)ⁿ), rangé là.

**Réemplois possibles** (le tag est accepté : point sur le nœud ou la notion du modèle) : 340 ← `6bd8366f` (2de,
« Barycentre de deux ou trois points », Vecteurs › combinaison linéaire) ; 538 ← `4bd92a32` (1re, « Marche aléatoire
sur une droite graduée », même sous-notion). Tous deux sont du niveau de leur classe (2 ou 3 points dans le plan ;
arbre sur quelques pas), pas de la terminale (4 points, espace ; loi binomiale).

Chevauchements à éviter : 396 et 571 ne refont pas les algorithmes 434 (Newton en Python) et 393 (Héron en Python) :
calcul des itérés à la main pour 396, étude de la convergence (preuve) pour 571. 435 n'est pas l'algorithme 433 :
c'est la preuve du TVI par les suites adjacentes.

### Phase 0 — questions à David (posées le 2026-11-13)

- **Q1 — Périmètre et lots.** Les 31 approfondissements en 7 lots : (9) barycentres et Leibniz ; (10) plans et
  sphères ; (11) suites ; (12) limites et continuité ; (13) convexité, dérivation, fonctions usuelles ; (14) équations
  différentielles et intégrales ; (15) probabilités et statistiques. _Reco : oui._
- **Q2 — Forme.** Comme D3 de la 1re : les preuves (554, 571, 435, 436, 452, 497, et en partie 394, 424, 529) à trous
  - une variation « étapes à ranger » (D1 de ce chantier) ; les autres en exercices d'application à valeurs tirées,
    2 ou 3 variations ; tout résultat hors programme dont l'exercice a besoin est donné dans l'énoncé (loi de Poisson,
    formule de Gini, xᵃ = eᵃ ˡⁿ ˣ). _Reco : oui._
- **Q3 — Rangement.** Un modèle par point, tagué sur son point P, soit 31 modèles neufs, sur la sous-notion du point,
  au-dessus des niveaux déjà présents. Pour les points posés sur une notion, le modèle va sur la sous-notion de la
  colonne « Modèle sur », et le point reste sur la notion. _Reco : oui._
- **Q4 — 395 et 517, sans sous-notion qui convienne.** (a) deux sous-notions neuves, « récurrence linéaire d'ordre 2 »
  sous Suites récurrentes et « loi de Poisson » sous Autres lois, posées par la migration du lot, comme D4 de la 1re ;
  ou (b) la plus proche existante (point fixe ; espérance et variance). _Reco : (a), une case vide vaut mieux qu'un
  modèle mal rangé._ 436 reste sur « continuité en un point », faute de mieux, sans nœud neuf.
- **Q5 — Réemplois.** 340 et 538 : modèles neufs de niveau terminale, `6bd8366f` et `4bd92a32` servant de gabarits ;
  ou réemploi (ajout de `T_SPE` aux classes et tag). _Reco : modèles neufs._
- **Q6 — Accès** (avant toute migration) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » _Reco : personne
  de plus (brouillons ; migration de nœud et de tags, et pour Q4 a deux sous-notions vides, publiques comme toutes)._
  Publication comme les lots 1 à 8 : page à cocher, puis `publier-lot.ts` lancé par David.
