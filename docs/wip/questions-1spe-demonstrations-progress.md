# Chantier « questions-1spe-demonstrations » — première spécialité, démonstrations du BO en modèles de questions

> Suite du chantier clos [`questions-1spe`](../archive/wip/questions-1spe-progress.md) (relevé § 1, classement § 3,
> décisions D1-D7 § 5 ; D4 y mettait les points P hors chantier : ce chantier rouvre **les démonstrations seulement**).
> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes et couverture :
> [1spe.md](../systeme/programmes/bornes/lycee/1spe.md) § Couverture. En base, le niveau est `1_SPE`.
> Ouvert le 2026-11-03 (David : « ouvre le chantier questions-1spe-demonstrations », après la proposition « P,
> démonstrations : possible en questions, sous une autre forme »).

## Reprendre ici

_Mis à jour le 2026-11-03, après #2334 (lot 3 rangé, page à cocher publiée)._

- **État** : lots 1 et 2 publiés. Lot 3 (308, 411, 322, 323) : 4 brouillons en prod, rangés et tagués
  (#2334, `db:migrate` fait, vérifié en base). Page à cocher : https://claude.ai/artifact/7Bb7HVkpfgdTTNfiDn4P1Y
- **Prochaine action** : lire les verdicts de la page (`ArtifactData` list `verdicts`), corriger ce qui est « à
  revoir » ; 4/4 OK → David publie (`publier-lot.ts --publier`), relire `published` en base (MCP).
- **En attente de David** : relecture de la page à cocher. Ensuite, reposer l'extension `signe:` du bloc `ranger`
  (Q2 b, **non tranchée**) : ce sera la fin des 14 démonstrations.
- **Pièges en cours** : `1/√2` est jugé `bad_form` (spec asservie). Migration copiée d'un lot précédent :
  transformer LIGNE À LIGNE (une regex multi-lignes a mangé le ROLLBACK commenté). Worktree sans lien Supabase :
  copier `supabase/.temp/{project-ref,linked-project.json,pooler-url,postgres-version}` du dépôt principal pour
  `db:migrate`. Ancienne branche distante `docs/questions-1spe-demonstrations` à supprimer.
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-demonstrations`, branche `feat/questions-1spe-demonstrations`.

---

## 1. Relevé : les démonstrations du BO (bornes `1spe.json`, 2026-11-03)

Les 52 points P sans modèle (couverture du 2026-11-03) se répartissent en **14 démonstrations** (rubrique
« Démonstrations » du BO ; le relevé en comptait d'abord 17, voir la correction sous le tableau), des exemples d'algorithmes et des approfondissements (« en aucun cas obligatoires »), et
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

**Correction du 2026-11-03 (lot 3)** : 300, 301 et 302 ne sont PAS des démonstrations. Au BO, ils sont dans
« Approfondissements possibles » (transcription `1_SPE.md`, l. 405-409 ; la rubrique Fonction exponentielle n'a pas
de « Démonstrations »). David : hors chantier, comme les autres approfondissements (D1 Q1).

**Hors chantier** (restent P) : exemples d'algorithmes (238-242, 279, 288, 298, 299, 309, 344, 359, 360, 380, 381,
427, 431), approfondissements (256-258, 300-302, 387, 324-326, 334, 335, 420, 345, 346, 361), points-compétences (205, 284,
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

**D1 (David, 2026-11-03, « je te suis » sur les recos)** : Q1 les 17 démonstrations seulement ; Q2 (a) démonstration
à trous (étape clé en case, ou justification en case choix à 4 propositions), sans outil neuf. (b) étapes à ranger :
**non tranché**, à reposer une fois les lots à trous faits ; Q3 2-3 variations, une par étape clé, valeurs tirées
quand la preuve s'y prête ; Q4 un modèle par point, tagué sur son point P, catégorie neuve « Démonstrations » par
domaine ; Q5 accès : personne de plus (brouillons ; migration de nœud et de tags seulement). Lots : 1 suites et
second degré, 2 dérivation, 3 exponentielle, trigo, produit scalaire.

## 4. Lot 1 : suites et second degré (2026-11-03)

Relevé prod (MCP, 2026-11-03) : nœuds Suites › Suites arithmétiques › terme général (232), Suites › Suites
géométriques › terme général (233), Suites › Suites arithmétiques › somme des termes (234), Suites › Suites
géométriques › somme des termes (235), Algèbre › Équations : second degré › discriminant (255) ; aucun point jumeau
(même nœud, même libellé) ; aucune catégorie « Démonstrations », tous niveaux confondus.

| Point | Modèle (fichier `scripts/questions/1spe-demonstrations-1/`) | Catégorie, niveau                                        | Variations                                                       |
| ----- | ----------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| 232   | `01-demontrer-terme-general-arithmetique`                   | Suites › Suites arithmétiques › Démonstrations, 1        | uₙ − u₀ (case), nombre de termes, télescopage (choix)            |
| 233   | `02-demontrer-terme-general-geometrique`                    | Suites › Suites géométriques › Démonstrations, 1         | uₙ/u₀ (case), u₃ de proche en proche, quotients non nuls (choix) |
| 234   | `03-demontrer-somme-des-entiers`                            | Suites › Sommes › Démonstrations, 1                      | colonne n + 1, 2S, pourquoi n(n + 1) (choix)                     |
| 235   | `04-demontrer-somme-geometrique`                            | Suites › Sommes › Démonstrations, 2                      | qS, S − qS, division par 1 − q (choix)                           |
| 255   | `05-demontrer-resolution-second-degre`                      | Fonctions › Polynôme du second degré › Démonstrations, 1 | b²/(4a²), numérateur b² − 4ac, cas Δ < 0 (choix)                 |

Script : `docs/wip/questions/lot-1spe-demonstrations-1.py`. Valeurs tirées pour 232 (u₀ 1..9, r 2..9) et 233 (u₀ 1..9,
q 2..5), lettres ailleurs. Vérifié : `create-questions` simulation verte, `validateLatex` + accolades sur 40 tirages
(214 formules, 0 problème), brouillons créés en base locale, aperçu admin du modèle 5 (case dans un numérateur) correct.

En prod (2026-11-03) : brouillons a81c4c9f (232), acaeb02a (233), 5fbb9a04 (234), b554a47f (235), 8865b98c (255), créés
par David ; migration `20261103115420_questions_1spe_demonstrations_1_rangement_tags` (#2302 ; audit sécurité sans
finding bloquant, son point faible « lot partiel » corrigé et testé ; 12 tests, rouges sans la migration) ; vérifié en
base : nœud et point de chacun, brouillons, `updated_at` intact. Page à cocher :
https://claude.ai/artifact/9ERT5tzmVmukkYbYk3ipJX

Relecture (2026-11-03) : 5/5 OK, aucun commentaire. Publié par David (`publier-lot.ts --publier`), 5/5 `published` relus
en base (MCP).

## 5. Lot 2 : dérivation (2026-11-03)

Relevé prod (MCP, 2026-11-03) : les 5 points sont sous Fonctions › Dérivation : tangente (275), dérivabilité en un
point (276), fonctions dérivées (277, 398), opérations sur les dérivées (278). **398 a un jumeau dans le même
programme** : 1SPE-392, son « à savoir », même nœud et même libellé. Le modèle ne prend que 398 (un point par
programme, ADR 0020). Aucune catégorie « Démonstrations » sous Dérivation ; les modèles voisins sont sous Fonctions ›
Dérivation › À savoir / Tangente / Dérivabilité en un point.

| Point | Modèle (fichier `scripts/questions/1spe-demonstrations-2/`) | Catégorie, niveau                          | Variations                                                                         |
| ----- | ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| 275   | `01-demontrer-equation-tangente`                            | Fonctions › Dérivation › Démonstrations, 4 | coefficient directeur f′(a) (choix), p par le point A (tiré), x − a                |
| 276   | `02-demontrer-racine-non-derivable-en-0`                    | Fonctions › Dérivation › Démonstrations, 3 | taux 1/√h, sa valeur pour h = 10⁻²ᵖ (tiré), conclusion (choix)                     |
| 277   | `03-demontrer-derivee-carre`                                | Fonctions › Dérivation › Démonstrations, 1 | (a + h)² − a² développé, taux 2a + h, limite (choix)                               |
| 398   | `04-demontrer-derivee-inverse`                              | Fonctions › Dérivation › Démonstrations, 2 | numérateur −h, taux −1/(a(a + h)), limite −1/a²                                    |
| 278   | `05-demontrer-derivee-produit`                              | Fonctions › Dérivation › Démonstrations, 5 | terme ajouté-retranché (choix), limite du 1er terme (choix), limite du taux (tiré) |

Script : `docs/wip/questions/lot-1spe-demonstrations-2.py`. Bornes respectées (« pas plus ») ; la continuité n'est pas
au programme de 1re, donc dans 278, « v(a + h) tend vers v(a) » est **admis** dans l'énoncé.

Pièges du lot :

- **`h` est une fonction générique du parseur** (f, g, h ; `parser/types.ts:131`) : `h(2a+h)` est lu comme h appliquée
  à 2a + h, et jugé FAUX. 277 demande donc une « expression développée ». En revanche, `a(a+h)` est bien lu comme un
  produit, et les fausses réponses sont refusées.
- Aucune réponse attendue n'écrit une fonction appliquée (u(a), v(a + h)) : ces étapes passent en case choix ou en
  valeurs tirées.
- `\frac{-1}{…}` reste `unoptimal_form` (`signs`) même avec `requiredForm: {pattern: 'u'}` : les specs l'asservissent.

Vérifié : `create-questions` simulation verte (66 specs). Sur 40 tirages par modèle, 4 086 formules, aucun
`{{…}}` resté dans le texte, accolades équilibrées. Les alertes de `validateLatex` ne concernent que des notations du
dépôt que le parseur ne lit pas : `A(x\,;\,y)`, les intervalles, `\mathbb{R}`, `(uv)'`. Brouillons créés en base
locale ; aperçu admin correct pour 276 (h = 0,000 001, attendu 1000) et 398 (case dans le numérateur).

En prod (2026-11-03) : brouillons 9e377c97 (275), f7938cd3 (276), b05ec37a (277), e2908d60 (398), 16ee6f33 (278),
créés par David. Relevé MCP : `draft`, {1_SPE}, sans nœud ni tag ; les 4 sous-notions sont actives et uniques.
Migration `20261103132133_questions_1spe_demonstrations_2_rangement_tags` (#2319). Test d'intégration à 13 cas, dont
« 392 non posé » : vert, et rouge sans la migration (6 cas rouges, la suite principale ne s'exécute pas). Audit
sécurité : aucun finding bloquant ; 3 notes non bloquantes (garde « tout ou rien » après les écritures, sûre dans
une seule transaction ; homonymes impossibles grâce aux index uniques ; garde « déjà tagué » = simple filet).

`db:migrate` du 2026-11-03 (après #2322, qui réparait les doublures de tests cassées par #2311) : vérifié en base, les 5
modèles sur leur sous-notion avec leur seul point (398 sans 392), `draft`, `updated_at` intact. Page à cocher :
https://claude.ai/artifact/Qk72A5QTYbfDJAwGB9ZN4Y

Relecture (2026-11-03) : 5/5 OK, sans commentaire. Publié par David, 5/5 `published` relus en base (MCP).

## 6. Lot 3 : trigonométrie et produit scalaire (2026-11-03)

Périmètre : 308, 411, 322, 323 (300-302 hors chantier, § 1). Recos validées par David (« oui »).

Relevé prod (MCP, 2026-11-03) : nœuds Fonctions › Fonctions trigonométriques › cosinus et sinus d'un réel (308, 411),
Géométrie › Produit scalaire › angles et longueurs (322), lieux de points (323) ; aucun point jumeau ; aucune
catégorie « Démonstrations » sous Fonctions trigonométriques ni Produit scalaire.

| Point | Modèle (fichier `scripts/questions/1spe-demonstrations-3/`) | Catégorie, niveau                                          | Variations                                                    |
| ----- | ----------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| 308   | `01-demontrer-cos-sin-pi-sur-4`                             | Fonctions › Fonctions trigonométriques › Démonstrations, 1 | triangle rectangle isocèle (choix), cos² = 1/2, √2/2          |
| 411   | `02-demontrer-cos-sin-pi-sur-3`                             | Fonctions › Fonctions trigonométriques › Démonstrations, 2 | triangle équilatéral (choix), cos = 1/2, sin = √3/2           |
| 322   | `03-demontrer-al-kashi`                                     | Géométrie › Produit scalaire › Démonstrations, 1           | Chasles (choix), développement (choix), BC² à 60° (tiré)      |
| 323   | `04-demontrer-cercle-de-diametre`                           | Géométrie › Produit scalaire › Démonstrations, 2           | MI² − IA² (choix), MI pour AB = 2d (tiré), conclusion (choix) |

Script : `docs/wip/questions/lot-1spe-demonstrations-3.py`. Aucune réponse attendue n'écrit un vecteur : ces étapes
passent en case choix. Juge : `0,5` est accepté pour 1/2 (`acceptDecimal`) ; `1/√2` est `bad_form` (forme), spec
asservie.

Vérifié : `create-questions` simulation verte (53 specs). Sur 40 tirages par modèle, 3 419 formules, aucun `{{…}}`
resté, accolades équilibrées ; les alertes de `validateLatex` ne portent que sur des notations d'affichage que le
parseur ne lit pas (`\overrightarrow`, `\widehat`, `A(1\,;0)`). Brouillons créés en base locale ; aperçu admin correct
pour 308 (choix) et 322 (vecteurs, normes, valeurs tirées). Bonne réponse des choix 308 et 411 raccourcie : seule
sans « Car » et la plus longue, elle se trahissait.

En prod (2026-11-03) : brouillons 66ecbb33 (308), 0931c87e (411), e8011f4e (322), dbdf02be (323), créés par David.
Relevé MCP : `draft`, {1_SPE}, sans nœud ni tag ; les 3 sous-notions sont actives et uniques. Migration
`20261103155449_questions_1spe_demonstrations_3_rangement_tags` (#2334), calquée sur celle du lot 2. Test d'intégration
à 12 cas : vert, et rouge sans la migration (6 cas rouges, la suite principale ne s'exécute pas).

Audit sécurité : aucun finding bloquant (diff identique au lot 2 hors données ; notes : branche « nœud
introuvable » sans test propre, garde « déjà tagué » = filet). CI : deux jobs tombés sur une panne du runner
(« Could not get pnpm cache folder path »), relancés, verts. `db:migrate` du 2026-11-03, joué depuis le worktree
(le `git pull` du dépôt principal était bloqué par une modification d'une autre session) : vérifié en base, les 4
modèles sur leur sous-notion avec leur seul point, `draft`, `updated_at` intact. Page à cocher :
https://claude.ai/artifact/7Bb7HVkpfgdTTNfiDn4P1Y
