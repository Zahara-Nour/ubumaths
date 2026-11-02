# Chantier « questions-tspe-proba » — terminale spécialité, probabilités (lots 5a, 5b)

> Sous-chantier de [`questions-tspe`](questions-tspe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots 2 à 4 § 15-17). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base, le niveau est `T_SPE`.
> Réparti le 2026-11-02 (David : « accélérer en répartissant les lots sur plusieurs sessions ») en trois sessions
> parallèles : `questions-tspe-proba` (lots 5a, 5b), `questions-tspe-espace` (6a, 6b), `questions-tspe-restes`
> (7, puis 8 quand les deux autres sont finis). Lot 9 (espace sur figure) attend le chantier `solides`.

## Reprendre ici

_Mis à jour le 2026-11-02, après la publication du lot 5b._

- **État** : ✅ **sous-chantier clos** : lots 5a (9 modèles) et 5b (4 modèles) publiés en prod. Fin notée au § 18 de l'index.
- **Prochaine action** : aucune ici. Le versement (durable → `docs/systeme/`, journaux → `docs/archive/wip/`) se fait avec celui de `questions-tspe`, à la fin des trois sous-chantiers.
- **En attente de David** : rien.
- **Pièges en cours** : voir « Décisions communes et pièges » (à reprendre au versement).
- **Worktree / branche** : aucun.

---

## Lots

| Lot | Thème                                                  | Points                                      |
| --- | ------------------------------------------------------ | ------------------------------------------- |
| 5a  | Succession d'épreuves, schéma de Bernoulli             | 501, 612, 505, 615, 507, 509, 613, 506, 617 |
| 5b  | Sommes de variables aléatoires, loi des grands nombres | 518, 521, 525, 532                          |

Dossiers : `scripts/questions/tspe-5a-…/`, `scripts/questions/tspe-5b-…/` ; scripts `docs/wip/questions/lot-tspe-5a-….py`.

## Points (classement du § 3 de l'index)

- **5a, A** : 501, 612 (produit des probabilités, produit cartésien), 505, 615 (modéliser), 507 (indépendance),
  509 (seuil par la loi binomiale).
- **5a, B** : 613, 506 (arbre : ` ```probtree ` à trous), 617 (probabilités totales sur un arbre).
- **5b, A** : 518 (somme de deux variables), 521 (V(aX) = a²V(X)), 525 (écrire une variable comme somme), 532 (loi
  des grands nombres : interprétation).
- **Voisins** (déjà couverts, à ne pas répéter) : 502, 616, 618, 510, 619, 620, 511, 516 ; 522, 621, 524, 622, 526,
  527, 530, 531, 533. 1cfc575d (chemin dans un arbre pondéré, niveau `2`, tagué TSPE-616). Points « = » laissés au
  lot 8 : 503, 504, 614, 508, 519, 520, 523.

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait, lots 0) ; D2 points « = » → lot 8 « à savoir », pas ici ; D4 points
  P hors chantier ; D7 vérifier aussi contre `tcomp.json` quand un modèle porte `T_COMP`. Lots neufs : niveau
  `T_SPE` seul (lots 2 à 4), un point par modèle (ADR 0020).
- **Gabarits** : script `docs/wip/questions/lot-tspe-integrales-primitives.py` (fonctions `coef()`, `terme()`,
  `colm()`, `par_k()`) ; migration `supabase/migrations/20261102083457_questions_tspe_lot4_rangement_tags.sql` + son
  test (accepte un modèle sur une notion sans sous-notion).
- **Rendu** : `cleanCoefficients` ne nettoie que les formules que le moteur sait analyser (`(E) : y′ = …`,
  `x ↦ …` restent en « +-2x », « 1x³ ») → signes écrits par `coef()` / `terme()` ; couleur toujours dans `$…$`
  (`colm()`) ; `{{eval:…}}` peut rendre `\dfrac{1}{2}`, illisible dans un bloc ```courbe ; `|` interdit dans une
  branche de `{{if:…}}` ; relire les tirages (`question:specs --apercu 40`), pas seulement les specs.
- **Tag** : le point doit être sur le **nœud du modèle ou sa notion** (§ 14 de l'index) ; niveaux numérotés à
  l'écriture, après relevé des niveaux de la catégorie (thème, domaine, sous-domaine).
- **Prod** : `create-questions --publier` et `publier-lot --publier` → David (`!`) ; `create-questions` depuis le
  dépôt principal APRÈS le merge des fichiers. `db:migrate` depuis le dépôt principal, après `migration list
--linked` : il passe **toutes** les migrations en attente, celles des autres sessions comprises → ne pas passer
  celle d'un autre sans le dire à David. Horodatage : `pnpm migration:horodatage`, puis `check:migrations --pr`.
- **Sessions parallèles** : port de dev 5176+ (5176 souvent pris : prendre le premier libre) ; base Supabase locale
  partagée (verrou : exit 2 = attendre) ; une sous-notion neuve oblige à mettre à jour la copie figée de l'arbre des
  tests (lot 2, § 15 de l'index) → prévenir les autres sessions ; dépôt principal partagé : `git commit -m … --
<fichiers>`, push en course possible (refaire `pull --rebase`).
- **CI** : job navigateur `wrapDynamicImport` → relancer les jobs en échec ; une garde de doc veut `Doc-inchangée:
migration de données, aucun code couvert` dans un commit de la PR de migration.
- **Aperçu local** : la saisie MathLive n'est pas pilotable par l'automate (jouer les cases choix ; les réponses
  tapées sont couvertes par les specs).

## Lot 5a : succession d'épreuves, schéma de Bernoulli

_2026-11-02. Relevé MCP (prod) : 501, 505, 506, 612, 613, 615 sur « Probabilités conditionnelles › épreuves
indépendantes successives » ; 507, 617 sur la **notion** « Probabilités conditionnelles » (un modèle peut aller sur
n'importe laquelle de ses sous-notions) ; 509 sur « Loi binomiale › expression de la loi ». Aucun des 9 n'a de modèle.
Voisins de 1re spé publiés sur les mêmes nœuds, à ne pas répéter : fe6f5606, 2f4f4ae0 (arbre de **deux** épreuves),
82e6baff, 22332630 (tableaux), d5780995 (deux épreuves, « au moins une fois »), 36010981 (réunion d'événements
indépendants), f2ed0ea0, 42bb2d66, d8c9cb60 (Bernoulli, **n ⩽ 4**), 5ba712bc (probabilités totales, partition en
**deux**), 69a05f98, 6dd2f133, a9c71276, 2c116f4d. Ce qui distingue la terminale (bornes) : n quelconque, épreuves
**différentes**, produit cartésien, deux ou trois épreuves non indépendantes (615 : 3 au plus), seuil par la loi
binomiale (ln). Catégories `T_SPE` du thème « Probabilités » : seulement le domaine « Loi binomiale » (Calcul de
probabilités 1-5, Coefficients binomiaux 1-4, Espérance et variance 1-3, Reconnaître une loi 1-3, Schéma de
Bernoulli 1). ` ```probtree ` : profondeur et branches sans limite._

**Phase 0 (proposée)** : niveau `T_SPE` seul, un point par modèle, réponses en case (fraction irréductible ou décimal
exact, `acceptDecimal`) ou en case choix, jamais les deux dans une variation. Probabilités données en décimaux à un
chiffre ou en fractions d'urnes.

| #   | Point    | Titre                                                 | Catégorie (niveau)                                 | Nœud                                       |
| --- | -------- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| M1  | TSPE-612 | Univers d'une succession d'épreuves                   | Succession d'épreuves › Épreuves indépendantes (1) | Probas cond. › épreuves indép. successives |
| M2  | TSPE-501 | Probabilité d'une issue (x₁, …, xₙ)                   | Succession d'épreuves › Épreuves indépendantes (2) | idem                                       |
| M3  | TSPE-505 | Modéliser par des épreuves indépendantes              | Succession d'épreuves › Épreuves indépendantes (3) | idem                                       |
| M4  | TSPE-507 | Calculer en utilisant l'indépendance                  | Succession d'épreuves › Épreuves indépendantes (4) | Probas cond. › indépendance                |
| M5  | TSPE-613 | Arbre d'une succession : chemins, indépendance        | Succession d'épreuves › Arbres (1)                 | Probas cond. › épreuves indép. successives |
| M6  | TSPE-506 | Compléter l'arbre de trois épreuves                   | Succession d'épreuves › Arbres (2)                 | idem                                       |
| M7  | TSPE-615 | Deux ou trois tirages sans remise                     | Succession d'épreuves › Épreuves dépendantes (1)   | idem                                       |
| M8  | TSPE-617 | Probabilités totales (partition en trois, 3ᵉ épreuve) | Succession d'épreuves › Épreuves dépendantes (2)   | Probas cond. › probabilités totales        |
| M9  | TSPE-509 | Seuil par la loi binomiale                            | Loi binomiale › Calcul de probabilités (6)         | Loi binomiale › expression de la loi       |

Variations :

- **M1** v0 dé à k faces (4, 6, 8, 12), pièce, urne à c couleurs (2 à 5) : nombre d'issues k × 2 × c ; v1 n épreuves
  de Bernoulli (n de 3 à 10) : univers {0 ; 1}ⁿ, 2ⁿ issues ; v2 (choix) quelle écriture est une issue de
  {1, …, 6} × {P ; F} × {R ; V ; B} : (4 ; F ; V) ✔, {4 ; F ; V}, (F ; 4 ; V), (4 ; F).
- **M2** v0 trois épreuves différentes (dé équilibré, pièce truquée P(F) = 0,a, urne) : P((6 ; F ; R)) produit des
  trois ; v1 n tirages avec remise (n de 4 à 8), issue écrite en n-uplet (R ; R ; B ; R ; B) : pᵏ(1 − p)ⁿ⁻ᵏ.
- **M3** (choix) v0 laquelle de ces expériences est une succession d'épreuves indépendantes (avec remise ✔ ; sans
  remise ; tirage simultané ; tirer jusqu'au premier as sans remise) ; v1 une expérience donnée (un dé lancé n fois,
  on note « 6 » ou non) : la bonne modélisation (n épreuves identiques indépendantes, univers {S ; S̄}ⁿ, P(S) = 1/6) parmi
  trois fausses (épreuves dépendantes, univers {1, …, 6}, P(S) = 1/n).
- **M4** trois composants de fiabilités différentes (0,8 à 0,99) : v0 en série (produit) ; v1 en parallèle
  (1 − ∏(1 − pᵢ)) ; v2 trois épreuves différentes : exactement une réussie (trois chemins, probabilités différentes).
- **M5** v0 trois épreuves à a, b, c issues (2 à 4) : nombre de chemins de l'arbre (abc) et de branches
  (a + ab + abc) ; v1 (choix) arbre de trois niveaux dessiné : les épreuves sont-elles indépendantes ? (mêmes
  pondérations sous chaque nœud, ou non ; « oui » et « non » tirés à part égale).
- **M6** ` ```probtree ` à trous, trois niveaux : v0 trois épreuves indépendantes différentes (penalty, lancer franc,
  fléchette) : pondérations effacées à compléter ; v1 trois parties dépendantes (gagne la 1re avec p ; après une
  victoire, gagne la suivante avec p₁, après une défaite avec p₂) : branches effacées à compléter.
- **M7** urne de r rouges et b blanches (r + b de 5 à 10) : v0 trois tirages sans remise, P((R ; R ; B)) ; v1 deux
  tirages sans remise, P(même couleur) (deux chemins) ; v2 trois tirages sans remise, P(au moins une blanche) = 1 −
  P(RRR).
- **M8** v0 trois machines A₁, A₂, A₃ (parts et taux de défaut) : P(D) par la partition en trois ; v1 l'arbre des
  trois parties de M6 dessiné : P(gagner la 3ᵉ partie), somme de quatre chemins.
- **M9** X ~ ℬ(n ; p) : v0 plus petit n tel que P(X ⩾ 1) ⩾ s (s = 0,9, 0,95, 0,99 ; p de 0,05 à 0,3), par
  1 − (1 − p)ⁿ ⩾ s ⇔ n ⩾ ln(1 − s)/ln(1 − p), réponse entière, deux contextes (abstrait, contrôle de pièces) ; v1
  (choix) comparer deux jeux (n₁ essais à p₁, n₂ à p₂) : lequel donne la plus grande probabilité d'au moins un succès
  (écart imposé).

**Questions à David** :

- **Q1** Catégorie : domaine neuf « Succession d'épreuves » (titre de la rubrique du BO, aucune collision) — reco —, ou
  « Probabilités conditionnelles » comme la 1re spé (mêmes noms de sous-domaines, niveaux propres à `T_SPE`) ?
- **Q2** M9 au niveau 6 de « Loi binomiale › Calcul de probabilités » (à côté de 6c80b4ec, seuil par une table) — reco
  —, ou un sous-domaine neuf « Seuils » ?
- **Q3** M5 v1 en case choix « oui / non » (deux options) : acceptable, ou une troisième option (« on ne peut pas
  savoir ») ?

**Question d'accès** : personne ne gagne ni ne perd d'accès (brouillons ; visibles des élèves après `publier-lot`).
Aucune sous-notion neuve.

**Décisions (David, 2026-11-02, « tes recos ? » puis « je valide »)** : Q1 domaine neuf « Succession d'épreuves » ;
Q2 M9 au niveau 6 de « Loi binomiale › Calcul de probabilités » ; Q3 M5 v1 en case choix à **quatre options
justifiées** (oui / non, chacun avec le bon critère et un faux critère : « même nombre de branches », « pondérations
d'un même nœud différentes ») ; la bonne est l'un des deux bons critères selon le tirage.

**Écriture** : `docs/wip/questions/lot-tspe-5a-succession.py` → `scripts/questions/tspe-5a-succession/`. Specs 9 + 8 + 6 +
10 + 10 + 6 + 9 + 7 + 10 vertes, 6 300 tirages réussis, `create-questions` en simulation : 9 à créer. Corrigé après
relecture des tirages : variable `i` lue comme l'imaginaire (« Complex numbers not supported ») → `w`, `v` ; `$i$` nu
rendu `\imaginaryI` dans trois corrigés → indices écrits en toutes lettres ; décimaux de plus de 4 chiffres attendus
groupés (`0{,}034\,56` ; non groupés : `unoptimal_form`) ; M3 v1 : n = 6 donnait deux options identiques → `n != 6` ;
M5 v1 : `P_{A}(B)=0,4` réécrit « P_A B » par le nettoyage → phrase sans formule ; M6 v1 : les deux branches après une
défaite masquées (sinon on complétait à 1 sans lire l'énoncé).

**Piège ` ```probtree `** : une étiquette **sans `\`** est écrite en texte (`wrapTextLabel`) : « G_1 » sort brut,
sans indice → `\mathrm{G}_1` (droit, comme les étiquettes surlignées). Vu dans l'aperçu local ; défaut du composant
`ProbabilityTree.svelte`, signalé à David.

**Base locale** : 9 brouillons créés ; M5 v1 (arbre dessiné, choix juste accepté), M6 v1 (arbre à trous) et M8 v1
(arbre complet) vus dans l'aperçu (port 5177).

**PR des fichiers** : #2240 mergée le 2026-11-02 (CI verte).

**Création en prod** (David, 2026-11-02) : bd9b293f (M1), 7e357962 (M2), 303aeac2 (M3), e82450c7 (M4), eb12ac14 (M5),
883c9922 (M6), 5925e666 (M7), ecf4d46b (M8), 4ee9a359 (M9), brouillons [T_SPE], niveaux de la phase 0, sans nœud ni
tag (relu au MCP).

**Migration** `20261102173448_questions_tspe_lot5a_rangement_tags.sql` (gabarit du lot 4, préfixe `_qtl5a_`) : M4 sur
« indépendance », M8 sur « probabilités totales » (points 507, 617 sur la notion), M9 sur « Loi binomiale › expression
de la loi », les six autres sur « épreuves indépendantes successives ». Test
`tests/integration/questions-tspe-lot5a-rangement-tags.test.ts` : 10/10 ; **rouge** sans l'étape 4 (« lot incohérent :
nœuds 0/9 »). `security-auditor` (2026-11-02, recoupé en prod) : aucun finding. PR #2241, `check:migrations --pr` passé.

**Migration en prod** : #2241 mergée le 2026-11-02 (CI verte) ; `db:migrate` passé par David (seule migration en attente) ;
relu au MCP : les 9 modèles sur leur nœud, un point chacun, toujours brouillons. Page à cocher :
https://claude.ai/artifact/4pTuHyH4DZ1CfwXgqgtZeV.

**Publication** (2026-11-02) : relecture 9/9 « OK » sur la page à cocher ; `publier-lot` en simulation, 9 contrôles
passés ; `--publier` par David ; relu au MCP : 9/9 `published`. **Lot 5a clos.**

## Lot 5b : sommes de variables aléatoires, loi des grands nombres

_2026-11-02. Relevé MCP (prod) : 518, 521, 525 sur « Sommes et concentration › espérance et variance d'une somme » ;
532 sur « Sommes et concentration › loi des grands nombres ». Aucun des 4 n'a de modèle. Voisins publiés, à ne pas
répéter : 71cb8ab7 (V(X + Y), V(X − Y), **V(aX + bY) avec X, Y indépendantes**, σ(X + Y)), 7974722d (E(aX + bY)),
aced2e6c (V et σ de Sₙ, Mₙ), de8fa591 (E(Sₙ) = nμ, μ donnée), dbee4649 / 38001c3f (E, V de la loi binomiale),
1043c29e (V de Bernoulli), 0943e867, 91db0034, 95f73515 (Bienaymé-Tchebychev, concentration) ; 1re spé 0417223e
(linéarité de l'espérance), 006fce09 (écart moyenne / espérance) ; 2de 7953dcfc (« Loi des grands nombres »,
brouillon, fréquences). Catégories `T_SPE` : « Sommes de variables aléatoires › Espérance et variance » (2, 3),
« › Échantillons » (2, 3) ; « Concentration et loi des grands nombres › Inégalité de Bienaymé-Tchebychev » (2),
« › Inégalité de concentration » (2, 3). Aucune sous-notion neuve._

**Phase 0 (proposée)** : niveau `T_SPE` seul, un point par modèle, réponses en case (fraction irréductible ou décimal
exact, `acceptDecimal`) ou en case choix, jamais les deux dans une variation.

| #   | Point    | Titre                                | Catégorie (niveau)                                                   | Nœud                                       |
| --- | -------- | ------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| M1  | TSPE-518 | Loi de la somme de deux variables    | Sommes de variables aléatoires › Loi d'une somme (1)                 | Sommes et conc. › esp. et var. d'une somme |
| M2  | TSPE-521 | Variance de aX + b : V(aX) = a²V(X)  | Sommes de variables aléatoires › Espérance et variance (1)           | idem                                       |
| M3  | TSPE-525 | Écrire une variable comme somme      | Sommes de variables aléatoires › Décomposer en somme (1)             | idem                                       |
| M4  | TSPE-532 | Loi des grands nombres : interpréter | Concentration et loi des grands nombres › Loi des grands nombres (1) | Sommes et conc. › loi des grands nombres   |

Variations :

- **M1** v0 X et Y indépendantes données par leurs lois (deux petits tableaux, 2 ou 3 valeurs, probabilités décimales
  à un chiffre) : P(X + Y = s), somme des produits sur les couples (s atteint par 2 ou 3 couples) ; v1 un dé à 4 faces
  et un dé à 6 faces : P(S = s), fraction sur 24 ; v2 (choix) valeurs prises par X + Y : la bonne liste parmi l'union
  des valeurs, les couples, une liste où manque une somme.
- **M2** v0 V(X) donnée, a entier relatif (|a| de 2 à 6) : V(aX) (pièges aV(X), |a|V(X)) ; v1 V(aX + b) (b ne compte
  pas) ; v2 σ(aX + b) = |a|σ(X), a négatif ; v3 en contexte : gain Y = aX − b euros, V(X) donnée, V(Y).
- **M3** v0 (choix) n épreuves de Bernoulli, X nombre de succès : X = X₁ + ⋯ + Xₙ avec Xᵢ = 1 si la i-ème est un succès
  ✔ ; X = nX₁ ; X = X₁ × ⋯ × Xₙ ; X = (X₁ + ⋯ + Xₙ)/n ; v1 n dés lancés, S somme des faces : E(S) = 3,5n en écrivant
  S = D₁ + ⋯ + Dₙ ; v2 épreuves **différentes** : n₁ lancers de pièce (succès : Pile) puis n₂ lancers de dé (succès :
  6), N nombre total de succès = Y + Z : E(N) (Y, Z de lois binomiales différentes) ; v3 même expérience : V(N) =
  V(Y) + V(Z) (indépendance).
- **M4** (choix) v0 l'énoncé de la loi des grands nombres : P(|Mₙ − μ| ⩾ δ) → 0 ✔ ; Mₙ = μ pour n assez grand ;
  P(|Mₙ − μ| ⩾ δ) = 0 pour n assez grand ; V(Mₙ) → μ ; v1 en contexte (dé lancé n fois, fréquence des 6) : « la
  probabilité que la fréquence s'écarte de 1/6 d'au moins 0,01 tend vers 0 » ✔ ; sophisme du joueur (après une série
  sans 6, un 6 est plus probable) ; « la fréquence vaut exactement 1/6 pour n multiple de 6 » ; « le nombre de 6 est à
  moins de 1 de n/6 » ; v2 limite de P(|Mₙ − μ| ⩾ δ) quand n → +∞ : 0 ✔, 1, δ, V/δ².

**Questions à David** :

- **Q1** Sous-domaines neufs « Loi d'une somme » (M1) et « Décomposer en somme » (M3) — reco —, ou M1 et M3 aux niveaux
  1 et 4 de « Espérance et variance » ?
- **Q2** M4 dans un sous-domaine neuf « Loi des grands nombres » de « Concentration et loi des grands nombres » — reco ?

**Question d'accès** : personne ne gagne ni ne perd d'accès (brouillons ; visibles des élèves après `publier-lot`).

**Décisions (David, 2026-11-02, « tes recos ? » puis « je valide »)** : Q1 sous-domaines neufs « Loi d'une somme »
(M1) et « Décomposer en somme » (M3) ; Q2 sous-domaine neuf « Loi des grands nombres » (M4) ; défaut ` ```probtree `
ajouté à `docs/wip/outils-manquants.md` (n° 11).

**Écriture** : `docs/wip/questions/lot-tspe-5b-sommes.py` → `scripts/questions/tspe-5b-sommes/`. Specs 13 + 12 + 16 + 9
vertes, 7 000 tirages réussis, `create-questions` en simulation (prod) : 4 à créer. Corrigé après relecture des
tirages : `\sigma(X)` réécrit « σ X » par `cleanCoefficients` → `\sigma\left(X\right)` (71cb8ab7 et aced2e6c,
sans `cleanCoefficients`, gardent leurs parenthèses : vérifié); `(2)^2` → parenthèses
seulement si a < 0 ; M1 v1 : S = 2 et S = 10 écartés (« x de 1 à 1 »).

**Base locale** : 4 brouillons créés (91b21c5a, 2b8c65a4, c56290a7, 4ce1e314).

**PR des fichiers** : #2248 mergée le 2026-11-02 (CI verte).

**Création en prod** (David, 2026-11-02) : c413489d (M1), 32bf80ae (M2), e8e14e8f (M3), dc08795e (M4), brouillons
[T_SPE], niveaux de la phase 0, sans nœud ni tag (relu au MCP).

**Migration** `20261102185349_questions_tspe_lot5b_rangement_tags.sql` (gabarit du 5a, préfixe `_qtl5b_`) : M1, M2,
M3 sur « Sommes et concentration › espérance et variance d'une somme » (TSPE-518, 521, 525), M4 sur « loi des grands
nombres » (TSPE-532). Test `tests/integration/questions-tspe-lot5b-rangement-tags.test.ts` : 12/12 ; **rouge** sans
l'étape 4 (« lot incohérent : nœuds 0/4 »). Deux cas de plus que le 5a, sur remarque du `security-auditor` (non
bloquant, recoupé en prod) : rollback refusé si un tag a été retiré ; un tag sur un modèle non rangé est refusé par le
trigger (« n'est rangé dans aucun nœud »), la garde « déjà tagués » est donc inatteignable. PR #2252,
`check:migrations --pr` passé. Piège : la garde de doc veut `Doc-inchangée:` dans un **commit**, pas dans le corps de PR.

**Migration en prod** : #2252 mergée le 2026-11-02 (CI verte) ; `db:push` refusé (« inserted before » : 20261102192653 et
20261102192857 d'autres sessions passées après) → `--dry-run --include-all` (seule la 5b à pousser) puis `--include-all` ;
relu au MCP : 4/4 sur leur nœud, un point chacun, brouillons. Page à cocher :
https://claude.ai/artifact/D11yhkJtKpXxioeVu7tNh8.

**Publication** (2026-11-02) : relecture 4/4 « OK » sur la page à cocher ; `publier-lot` en simulation, 4 contrôles
passés ; `--publier` par David ; relu au MCP : 4/4 `published`. **Lot 5b clos ; sous-chantier `questions-tspe-proba` clos.**
