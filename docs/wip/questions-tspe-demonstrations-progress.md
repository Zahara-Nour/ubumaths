# Chantier « questions-tspe-demonstrations » — les points P de la terminale spécialité en modèles de questions

> Suite du chantier clos `questions-tspe` (journaux `docs/archive/wip/questions-tspe*-progress.md` ; sa Q4 mettait
> les 68 points P hors chantier). Modèles suivis : `questions-1spe-demonstrations` (archivé, D1-D13) et
> `questions-2de-demonstrations` (D1-D5). Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md).
> Bornes et couverture : [tspe.md](../systeme/programmes/bornes/lycee/tspe.md) ; BO :
> `src/lib/server/programmes/transcriptions/T_SPE.md`. En base, le niveau est `T_SPE`.
> Ouvert le 2026-11-11 (David : « comme pour la classe de première et la classe de seconde, il va falloir traiter
> la classe P »).

## Reprendre ici

_Mis à jour le 2026-11-11, après #2558 (lot 1 rangé et tagué en prod)._

- **État** : lot 1 (321, 548, 359, 373) en brouillon en prod, rangé et tagué (§ 4) ; page à cocher publiée.
- **Prochaine action** : lire les verdicts (`ArtifactData list verdicts`, compter 4) → `publier-lot.ts --dir
scripts/questions/tspe-demonstrations-1` en simulation → David publie ; puis lot 2 (388, 389, 390, 391, 405).
- **En attente de David** : relecture sur https://claude.ai/artifact/YPeen4p6oK8DdJs1hkhC6d (jouer les étapes à ranger
  dans l'aperçu admin).
- **Pièges en cours** : commitlint refuse le type `content` ; graine de l'aperçu admin = variation (§ 3).
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-demonstrations` (branche de rangement mergée et supprimée ;
  nouvelle branche depuis `origin/main` pour le lot 2).

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
