# Chantier « questions-1spe-demonstrations » — première spécialité, démonstrations du BO en modèles de questions

> Suite du chantier clos [`questions-1spe`](../archive/wip/questions-1spe-progress.md) (relevé § 1, classement § 3,
> décisions D1-D7 § 5 ; D4 y mettait les points P hors chantier : ce chantier rouvre **les démonstrations seulement**).
> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes et couverture :
> [1spe.md](../systeme/programmes/bornes/lycee/1spe.md) § Couverture. En base, le niveau est `1_SPE`.
> Ouvert le 2026-11-03 (David : « ouvre le chantier questions-1spe-demonstrations », après la proposition « P,
> démonstrations : possible en questions, sous une autre forme »).

## Reprendre ici

_Mis à jour le 2026-11-03, à l'ouverture du chantier._

- **État** : relevé fait (§ 1, 17 démonstrations du BO) ; outils regardés (§ 2) ; phase 0 écrite (§ 3), **non validée**.
- **Prochaine action** : faire trancher Q1-Q5 (§ 3) par David, puis relevé MCP (nœuds des points, catégories et niveaux voisins).
- **En attente de David** : Q1-Q5 du § 3, dont la question d'accès (Q5).
- **Pièges en cours** : le bloc `ranger` n'accepte que `signe: <` / `>` (§ 2) ; pièges des lots 1re spé dans
  `couvrir-un-niveau.md` § 9 (`cleanCoefficients`, `acceptDecimal`, `e` = Euler, choix mélangés, `colt`).
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-demonstrations`, branche `docs/questions-1spe-demonstrations`
  (renommer en `feat/…` au premier fichier de code ou de modèle).

---

## 1. Relevé : les démonstrations du BO (bornes `1spe.json`, 2026-11-03)

Les 52 points P sans modèle (couverture du 2026-11-03) se répartissent en **17 démonstrations** (rubrique
« Démonstrations » du BO), des exemples d'algorithmes et des approfondissements (« en aucun cas obligatoires »), et
5 points-compétences. Ce chantier ne prend que les démonstrations.

| Thème            | Point | Démonstration                                              | Voisin déjà couvert (le résultat) |
| ---------------- | ----- | ---------------------------------------------------------- | --------------------------------- |
| Suites           | 232   | Terme général d'une suite arithmétique                     | 223 (forme explicite)             |
| Suites           | 233   | Terme général d'une suite géométrique                      | 223                               |
| Suites           | 234   | 1 + 2 + ⋯ + n                                              | sommes de termes                  |
| Suites           | 235   | 1 + q + ⋯ + qⁿ                                             | sommes de termes                  |
| Second degré     | 255   | Résolution de l'équation du second degré (forme canonique) | discriminant, racines             |
| Dérivation       | 275   | Équation de la tangente en un point                        | 272                               |
| Dérivation       | 276   | √ n'est pas dérivable en 0 (taux de variation)             | 267 (taux en 0)                   |
| Dérivation       | 277   | Dérivée de la fonction carré (taux de variation)           | 264 (« à savoir »)                |
| Dérivation       | 398   | Dérivée de la fonction inverse                             | 392 (« à savoir »)                |
| Dérivation       | 278   | Dérivée d'un produit                                       | dériver un produit                |
| Exponentielle    | 300   | Unicité de f dérivable avec f′ = f, f(0) = 1               | —                                 |
| Exponentielle    | 301   | exp(x + y) = exp(x) exp(y)                                 | 290 (« à savoir »)                |
| Exponentielle    | 302   | exp strictement positive et croissante                     | signe et variations               |
| Trigonométrie    | 308   | cos(π/4), sin(π/4)                                         | 5a89b292 (valeurs remarquables)   |
| Trigonométrie    | 411   | cos(π/3), sin(π/3)                                         | 5a89b292                          |
| Produit scalaire | 322   | Al-Kashi par le produit scalaire                           | 316 (« à savoir »)                |
| Produit scalaire | 323   | Ensemble des M tels que MA·MB = 0                          | cercle de diamètre [AB]           |

**Hors chantier** (restent P) : exemples d'algorithmes (238-242, 279, 288, 298, 299, 309, 344, 359, 360, 380, 381,
427, 431), approfondissements (256-258, 387, 324-326, 334, 335, 420, 345, 346, 361), points-compétences (205, 284,
435, 436, 437). Couverts par un voisin (10) et D (362, 365) : inchangés.

## 2. Outils pour une démonstration en question (vérifié dans le code, 2026-11-03)

- **Case ouverte ou case choix** dans un énoncé à trous : rien à créer. Exemple : la démonstration écrite, une étape
  laissée en `[_]` (« le taux de variation vaut … ») ou une justification à choisir (« car … » : case choix à
  4 propositions, erreurs typiques en distracteurs, comme D29).
- **Remettre les étapes dans l'ordre** : bloc ` ```ranger ` (3 à 8 étiquettes, ordre mélangé au tirage, juge
  strict). **Limite** : `ranger-parser.ts` n'accepte que `signe: <` (défaut) ou `signe: >` ; il n'y a ni signe
  neutre, ni « ⟹ » entre les places. Des étapes de preuve s'afficheraient séparées par « < ». Il faut une petite
  extension du bloc (par exemple `signe: ⟹` ou `signe: aucun`, affichage, Typst, tests), qui passe par une PR de code.
  Sinon, il faut renoncer à cette forme.

## 3. Phase 0 — questions à David (posées le 2026-11-03)

- **Q1 — Périmètre.** Les 17 démonstrations du § 1 seulement ; algorithmes, approfondissements et compétences
  restent hors chantier (D4). _Reco : oui._
- **Q2 — Forme.** (a) **démonstration à trous** : la preuve est écrite, et l'élève complète l'étape clé (case) ou
  choisit la justification (case choix, 4 propositions) ; (b) **étapes à remettre dans l'ordre** (` ```ranger `).
  _Reco : (a) pour les 17, sans outil neuf ; (b) en second temps, seulement si l'extension `signe:` du § 2 est
  voulue. Elle irait à `docs/wip/outils-manquants.md`, ou dans un petit lot de code de ce chantier._
- **Q3 — Variations.** 2-3 variations par modèle : des étapes différentes de la même preuve sont laissées à trous
  (une variation par étape clé), avec des valeurs tirées là où la preuve s'y prête (232, 233 : u₀, r, q ; 275 : a ;
  308, 411 : rien). _Reco : oui._
- **Q4 — Rangement.** Un modèle par point (ADR 0020), avec un tag sur son point P. Rangés dans une catégorie neuve
  **« Démonstrations »** dans chaque domaine, comme « À savoir » (D29), niveaux numérotés après le relevé MCP.
  _Reco : oui. Autre choix possible : sous la notion du résultat, à côté de son « à savoir »._
- **Q5 — Accès** (avant toute migration) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? » _Reco :
  personne de plus. Ce sont des brouillons, et la migration ne pose que le nœud et les tags. Les élèves de 1re spé
  verront les modèles à la publication, comme tout modèle publié._

Découpage en lots proposé après validation : (1) suites et second degré (232, 233, 234, 235, 255) ; (2) dérivation
(275, 276, 277, 398, 278) ; (3) exponentielle, trigo, produit scalaire (300, 301, 302, 308, 411, 322, 323).
