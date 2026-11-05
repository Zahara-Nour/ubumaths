# Chantier « questions-1spe-demonstrations » — première spécialité, démonstrations du BO en modèles de questions

> Suite du chantier clos [`questions-1spe`](../archive/wip/questions-1spe-progress.md) (relevé § 1, classement § 3,
> décisions D1-D7 § 5 ; D4 y mettait les points P hors chantier : ce chantier rouvre **les démonstrations seulement**).
> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes et couverture :
> [1spe.md](../systeme/programmes/bornes/lycee/1spe.md) § Couverture. En base, le niveau est `1_SPE`.
> Ouvert le 2026-11-03 (David : « ouvre le chantier questions-1spe-demonstrations », après la proposition « P,
> démonstrations : possible en questions, sous une autre forme »).

## Reprendre ici

_Mis à jour le 2026-11-05, lot 8 : brouillons en prod, migration nœud + tag en PR._

- **État** : démonstrations en prod (lots 1 à 4). Approfondissements (§ 9, D3) : lots 5, 6 et 7 publiés ; lot 8
  (géométrie, § 13, D6) : 6 brouillons créés en prod, migration `20261105195513` (nœud + tag, sous-notion neuve
  « parabole ») en PR.
- **Prochaine action** : CI verte → merge → `db:migrate` (4 conditions réunies) → vérif MCP → page à cocher. Ensuite
  lot 9 (probabilités : 345, 346, 361).
- **En attente de David** : vérification à l'œil en prod (ligne du 2026-11-03 de `docs/wip/verifications-manuelles.md`).
- **Pièges en cours** : écritures en prod : donner d'emblée la commande `!` à David. `create-questions` écrit l'`id`
  dans les JSON du dépôt d'où il tourne → les commiter (PR) puis `git restore` dans le dépôt principal. Point posé sur
  une notion → choisir sa sous-notion avec David. Variable `e` = Euler : jamais comme nom de variable. Job navigateur
  de la CI qui plante tests verts → `gh run rerun <run> --failed`. Port 5178.
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-demonstrations`, `feat/questions-1spe-approfondissements-8-db`.

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

Relecture (2026-11-03) : 4/4 OK, aucun commentaire. Publié par David (`publier-lot.ts --publier`), 4/4 `published`
relus en base (MCP).

## 7. Q2 b : étapes à ranger (2026-11-03)

**D2 (David, 2026-11-03, « je valide » puis « oui »)** : oui à Q2 b, sur les recos. (1) Réglage **`signe: aucun`**
du bloc `ranger` (pas de `⟹` : une étape ne découle pas toujours par implication) : étiquettes et places en
colonne, places numérotées, sans signe ; écran, PDF, cadres de réponse, catalogue ; message d'erreur « signe: écrire
<, > ou aucun ». (2) Les 14 démonstrations, chacune une variation « Remets les étapes de la démonstration dans
l'ordre » (4 à 6 étapes) ; une étape interchangeable passe dans l'énoncé (ex. les deux écritures de S, 1.03) ; si ce
n'est pas possible, la démonstration sort de la liste (le dire). (3) Variation ajoutée aux modèles existants (ADR
0020), pas de modèle neuf ; pas de migration. Découpage : PR 1 code, puis lot 4 contenu.

PR 1 (`feat/ranger-signe-aucun`) : 8 tests neufs, rouges avant le code (parseur, sérialisation du tirage, PDF,
cadres de réponse, écran : colonne numérotée, consigne lue, rien ne déborde à 360 px) ; verts après, suites
voisines vertes (348 + 60), `check:incremental` 0 erreur. PDF compilé par `scripts/fiches/compile-prod.mjs` (le
compilateur de la prod) : places pleine largeur, numérotées, espacées ; le rangement `<` inchangé.

PR 1 mergée (#2341, 2026-11-03). Revue `code-reviewer` (Sonnet) : aucun bloquant ; un mineur corrigé (correction
aussi large que la colonne en mode étapes). Vu à l'écran (page d'aide du bloc) : colonne numérotée, geste juste.
Conflit de fusion sur deux lignes « Vérifié » de la doc système, résolu en gardant `main` + nos ajouts.

## 8. Lot 4 : étapes à ranger (2026-11-03)

Contenu écrit : `questions-1spe-demonstrations/lot4_etapes.py` (énoncé, étapes dans l'ordre, corrigé) ;
variation ajoutée en DERNIER aux 14 JSON (indices 0-2 inchangés), 4 à 6 étapes, `signe: aucun`. Étapes
interchangeables évitées : passées dans l'énoncé (03 : les deux écritures de S ; 10 : « v(a+h) tend vers
v(a) » admis) ou fusionnées (13 : produit scalaire et cosinus dans la dernière étape ; 09 : limite de
a(a+h) et du taux). Specs calculées par le générateur (`generateInstanceWithFixedVariables`) : ordre juste
et 2e/3e étapes échangées ; `checkTemplate` vert sur les 14. Vu à l'écran en base locale (aperçu admin,
seed 100004 → variation 4) : 10 (produit) et 05 (second degré), formules lisibles, places numérotées.
Reste : migration de contenu (les 14 sont publiés), après la question d'accès et le `deploy:prod` de #2341.

Question d'accès (posée avant le SQL, 2026-11-03) : « qui pourra lire quoi, qu'il ne pouvait pas lire
avant ? » ; reco « personne de plus » ; réponse de David : « je te suis ».

Migration de contenu `20261103194133_questions_1spe_demonstrations_etapes_contenu.sql`, générée par
`lot4-contenu.py` (générateur `scissions_outils.generer`, 14 MODIFIER, 0 neuf, 0 tag). Instantané
`etat-prod-2026-11-03-etapes/` écrit par `etat_prod_releve.py` : relevé MCP (lecture seule ;
`releve-prod.ts` refusé par le classifieur), contenu = ancienne source, md5 jsonb comparés à la prod
(14/14, variations, specs et empreinte complète). Test `questions-1spe-demonstrations-etapes-contenu`
vert avec (12 verts, 16 sautés : modèles neufs), ROUGE sans (fichier remplacé par `select 1;`, restauré
d'une copie, md5 identique). `deploy:prod` d'abord refusé (CI de #2344 : porte des migrations, origin/main
injoignable en CI), relancé par `--relancer-ci`.

#2349 mergée (2026-11-03) ; `deploy:prod` 0.68.0 (#2341 en prod) ; `db:migrate` de
`20261103194133` depuis le dépôt principal (seule migration en attente, `--dry-run` d'abord) ; MCP : 14/14
à 4 variations, publiés, tags intacts.

## 9. Suite : les approfondissements (ouverte le 2026-11-04)

David, le 2026-11-04 : prolonger le chantier (« Prolonger ») vers les **approfondissements** (choisi parmi
algorithmes, approfondissements et points-compétences). Démonstrations : terminées (lots 1 à 4).

**Correction du relevé du § 1** : 240 (Tour de Hanoï), 241 (somme des n premiers carrés), 381 (somme des n premiers
cubes) et 242 (emprunt par annuités constantes) sont des **approfondissements** au BO (transcription `1_SPE.md`,
l. 265-269, rubrique Suites), pas des exemples d'algorithmes. Il y a donc **20** approfondissements, pas 16.

| Domaine           | Point | Approfondissement                                              | Forme pressentie                  |
| ----------------- | ----- | -------------------------------------------------------------- | --------------------------------- |
| Suites            | 240   | Tour de Hanoï                                                  | calcul (2ⁿ − 1 coups), récurrence |
| Suites            | 241   | Somme des n premiers carrés                                    | calcul avec la formule donnée     |
| Suites            | 381   | Somme des n premiers cubes                                     | calcul avec la formule donnée     |
| Suites            | 242   | Emprunt remboursé par annuités constantes                      | calcul (suite géométrique)        |
| Second degré      | 256   | Factoriser un polynôme de degré 3 qui a une racine connue      | calcul, valeurs tirées            |
| Second degré      | 387   | Résoudre l'équation de degré 3 associée                        | calcul, valeurs tirées            |
| Second degré      | 257   | xⁿ − 1 par x − 1, xⁿ − aⁿ par x − a                            | calcul / preuve à trous           |
| Second degré      | 258   | Deux réels de somme s et de produit p                          | calcul, valeurs tirées            |
| Exponentielle     | 300   | Unicité de f dérivable avec f′ = f, f(0) = 1                   | preuve (à trous, étapes à ranger) |
| Exponentielle     | 301   | exp(x + y) = exp(x) exp(y)                                     | preuve (à trous, étapes à ranger) |
| Exponentielle     | 302   | exp strictement positive et croissante                         | preuve (à trous, étapes à ranger) |
| Produit scalaire  | 324   | Loi des sinus                                                  | calcul dans un triangle (figure)  |
| Produit scalaire  | 325   | Concourance des hauteurs                                       | preuve vectorielle à trous        |
| Produit scalaire  | 326   | Concourance des médianes au centre de gravité                  | preuve vectorielle à trous        |
| Géométrie repérée | 334   | Points équidistants de l'axe des abscisses et d'un point       | calcul (équation de parabole)     |
| Géométrie repérée | 335   | Intersection d'un cercle et d'une droite parallèle à un axe    | calcul, valeurs tirées            |
| Géométrie repérée | 420   | Intersection d'une parabole et d'une droite parallèle à un axe | calcul, valeurs tirées            |
| Probabilités      | 345   | Succession de plusieurs épreuves indépendantes                 | calcul (arbre ` ```probtree `)    |
| Probabilités      | 346   | Marches aléatoires                                             | calcul sur des exemples           |
| Probabilités      | 361   | Fonction x ↦ E((X − x)²) du second degré                       | calcul / preuve à trous           |

Outils vus dans le code (2026-11-04, seulement leur présence, pas encore leurs limites) : `figure`,
`courbe`, arbre de probabilités (`probability-tree-parser.ts`), `ranger` avec `signe: aucun` (#2341),
case ouverte et case choix.

### Phase 0 — questions à David (posées le 2026-11-04)

- **Q1 — Périmètre.** Les 20 approfondissements du tableau ; les algorithmes et les points-compétences restent
  hors chantier. _Reco : oui._
- **Q2 — Forme.** Les preuves (300-302, 325, 326, et 257 et 361 en partie) sont traitées comme les
  démonstrations : à trous plus une variation « étapes à ranger » (D1, D2). Les autres points sont des
  **exercices d'application**, avec des valeurs tirées et 2 à 3 variations. Pour 241 et 381, la formule
  est donnée dans l'énoncé, puisque le BO ne demande pas de la connaître. _Reco : oui._
- **Q3 — Rangement.** Un modèle par point (ADR 0020), tagué sur son point P. Il irait dans une catégorie neuve
  **« Approfondissements »** dans chaque domaine, comme « Démonstrations », pour que le prof voie que c'est
  facultatif. _Reco : oui. Autre choix : sous la notion du résultat._
- **Q4 — Publication.** Publier comme les démonstrations : visibles des élèves de 1re spé, et c'est le prof qui
  choisit de les donner. _Reco : oui._
- **Q5 — Accès** (avant toute migration) : « qui pourra lire quoi, qu'il ne pouvait pas lire avant ? »
  _Reco : personne de plus au moment de la migration (brouillons, nœud et tags seulement). À la publication,
  les élèves de 1re spé voient les modèles, comme pour tout modèle publié._

Lots proposés après validation : (5) suites (240, 241, 381, 242) ; (6) algèbre (256, 387, 257, 258) ;
(7) exponentielle (300, 301, 302) ; (8) géométrie (324, 325, 326, 334, 335, 420) ; (9) probabilités
(345, 346, 361).

**D3 (David, 2026-11-04, « go » puis « Oui aux 5 recos »)** : Q1 les 20 approfondissements ; Q2 preuves (300-302,
325, 326, en partie 257 et 361) à trous + variation « étapes à ranger », les autres en exercices d'application à
valeurs tirées (2-3 variations), formule donnée dans l'énoncé pour 241 et 381 ; Q3 un modèle par point, tagué sur
son point P, catégorie neuve « Approfondissements » par domaine ; Q4 publiés comme les démonstrations ; Q5 accès :
personne de plus (brouillons ; migration de nœud et de tags seulement). Lots 5 à 9 dans l'ordre du § 9.

## 10. Lot 5 : approfondissements, suites (2026-11-04)

Relevé prod (MCP, 2026-11-04) : 240 sur Suites › Généralités sur les suites › explicite ou par récurrence ; 241 et
381 sur la **notion** Généralités sur les suites ; 242 sur la **notion** Modèles d'évolution (une seule sous-notion,
« seuil »). Aucun modèle sur les 4 points. Aucune catégorie « Approfondissements ».

**D4 (David, 2026-11-04, « tes recos ? » puis « Oui aux deux »)** : (1) deux sous-notions neuves, « sommes de
termes » sous Généralités sur les suites (241, 381) et « emprunt » sous Modèles d'évolution (242), posées par la
migration du lot ; les points restent sur leur notion ; (2) contenu tel que proposé, sans formule de l'annuité.

| Point | Modèle (`scripts/questions/1spe-approfondissements-5/`) | Catégorie, niveau                             | Variations                                                         |
| ----- | ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| 240   | `01-tour-de-hanoi`                                      | Suites › Apprivoiser › Approfondissements, 1  | hₖ₊₁ par la relation (k 3..7), raison de vₙ = hₙ + 1, hₙ (n 5..10) |
| 241   | `02-somme-des-carres`                                   | Suites › Sommes › Approfondissements, 1       | Sₙ (n 5..20), a² + ⋯ + b², Sₙ₊₁ − Sₙ                               |
| 381   | `03-somme-des-cubes`                                    | Suites › Sommes › Approfondissements, 2       | Tₙ (n 4..15), (1 + ⋯ + n) à compléter, a³ + ⋯ + b³                 |
| 242   | `04-emprunt-annuites-constantes`                        | Suites › Modélisation › Approfondissements, 1 | R₁, coefficient 1 + t de la relation, nature de vₖ (case choix)    |

Script : `docs/wip/questions/lot-1spe-approfondissements-5.py`. Emprunt : C ∈ {4000, …, 20000}, t 2..5 %, a = C/4,
donc R₁ entier. Vérifié : `create-questions` simulation verte (47 specs) ; `question:specs` 150 tirages par modèle,
`validateLatex` compris ; 2 060 formules de 40 aperçus, accolades équilibrées, 0 problème ; brouillons en base locale,
aperçu admin (flash-card) de Hanoï (variation 1) et de l'emprunt (variation 2 : « 1,03 » à la virgule). Piège : `2⁶ − 1`
non calculé = `bad_form` avec `constraintViolations: ['form']` (sans cette clé, la spec reste rouge alors que le
statut est le bon). Saisie MathLive par l'extension Chrome impossible : jouer en flash-card.

### Lot 5 en prod : brouillons, puis migration nœud + tag (2026-11-04)

David a lancé `create-questions --publier` après #2361. Relevé prod (MCP) : 4 brouillons {1_SPE}, sans nœud ni tag :
`77a5b60b` Hanoï, `96d19805` carrés, `9eac8754` cubes, `061e83b5` emprunt ; « sommes de termes » et « emprunt »
absentes (ni actives, ni archivées). Migration `20261103233226_questions_1spe_approfondissements_5_rangement_tags`
(gabarit `tspe_lot2` : 2 sous-notions neuves, Hanoï sur « explicite ou par récurrence »), test
`questions-1spe-approfondissements-5-rangement-tags` 11/11 vert, rouge sans la migration (6 rouges, la suite
principale ne s'exécute pas). Accès : Q5 de D3, personne.

Mergée (#2365, CI verte après les tests frères : copie figée de l'arbre, `LATER`, test du lot 7 de Tle ; la garde de
doc lit les commits, pas la description de PR). `db:migrate` le 2026-11-04, vérifié MCP : 4 modèles sur leur nœud,
un tag chacun, `draft`, `updated_at` inchangé. Garde des niveaux verte. Page à cocher :
https://claude.ai/artifact/CjbnjiD6DawhSe4zrQqKLU.

Relecture (2026-11-04) : 4/4 OK, aucun commentaire. Publié par David (`publier-lot.ts --publier`), 4/4 `published`
relus en base (MCP).

## 11. Lot 6 : approfondissements, algèbre (2026-11-04)

Relevé prod (MCP, 2026-11-04) : 256 et 387 sur Nombres complexes › Équations polynomiales › degré 3 et
factorisation ; 257 sur Algèbre › Calcul littéral › factorisation ; 258 sur Fonctions › Second degré › somme et
produit des racines. Les 4 sous-notions existent : **aucune neuve**. Aucun modèle sur les 4 points. Catégorie :
« Approfondissements » neuve dans Fonctions › Polynôme du second degré (où est la démonstration 255).

| Point | Modèle (`scripts/questions/1spe-approfondissements-6/`) | Niveau | Variations                                                                        |
| ----- | ------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| 256   | `01-factoriser-un-polynome-de-degre-3`                  | 1      | P(x) = (x − r)(x² + bx + c) : c, puis b par identification, factorisation (choix) |
| 387   | `02-resoudre-une-equation-de-degre-3`                   | 2      | autre solution (la plus grande), nombre de solutions si Δ < 0, si Δ = 0           |
| 257   | `03-factoriser-x-puissance-n-moins-a-puissance-n`       | 1      | exposant de xⁿ⁻¹ (case dans l'exposant), x³ − a³ : a², preuve xⁿ − 1 (ranger)     |
| 258   | `04-deux-reels-de-somme-et-produit-donnes`              | 1      | coefficient s de x² − sx + p, plus grand des deux, Δ < 0 (choix)                  |

Script : `docs/wip/questions/lot-1spe-approfondissements-6.py` ; positions des specs « ranger » calculées par
`docs/wip/questions/positions-ranger.ts` (générateur, graine 0 ; le script du lot 4 n'avait pas été commité).
Gardes : r, b, c non nuls (pas de « (x + 0) » ni « (c + 0)x »), s, u ≠ 0 pour 387. Vérifié : `question:specs`
150 tirages par modèle, 38 specs vertes, 0 `\textcolor` hors `$` ; 40 aperçus par modèle relus (signes,
coefficients nuls) ; `create-questions` simulation et brouillons en base locale ; aperçu admin du 257 : case dans
l'exposant et x³ − a³ bien rendus.

### Lot 6 en prod : brouillons, puis migration nœud + tag (2026-11-05)

David a lancé `create-questions --publier` après #2374 (refusé à Claude par le classifieur sur un « go »). Relevé
prod (MCP) : 4 brouillons {1_SPE}, sans nœud ni tag : `1b062bd5` degré 3 (factoriser), `d25bd762` degré 3
(résoudre), `aee1b98f` xⁿ − aⁿ, `6ace8b95` somme et produit ; points 256 et 387 sur « degré 3 et factorisation »,
257 sur « factorisation » (Calcul littéral), 258 sur « somme et produit des racines » ; aucun modèle déjà tagué sur
ces points. Migration `20261105060921_questions_1spe_approfondissements_6_rangement_tags` (gabarit `demonstrations_3`,
aucune sous-notion neuve), test `questions-1spe-approfondissements-6-rangement-tags` 12/12 vert, rouge sans la
migration (7 rouges, la suite principale ne s'exécute pas). Accès : Q5 de D3, personne.
`security-auditor` : aucun finding bloquant. Mergée (#2391, CI verte). `db:migrate` en attente : `20261105055721`
(automatismes-1spe) déjà en prod oblige à `--include-all`, qui passe aussi 055111 (CP-060) et 055243 (2de lot 12 b-2) ;
David le lance pour les trois (refusé au classifieur pour la session geometrie-validation).

Migration appliquée le 2026-11-05 par David (`--include-all`, avec 055111 et 055243), vérifiée MCP : 4 modèles sur
leur nœud, un tag chacun, `draft`, `updated_at` inchangé. Ids des modèles écrits dans les JSON du lot (#2395). Page
à cocher : https://claude.ai/artifact/SR49JgobeQAu37YCSSyazJ. Relecture (2026-11-05) : 4/4 OK, aucun commentaire.
Publié par David (`publier-lot.ts --publier`), 4/4 `published` relus en base (MCP).

## 12. Lot 7 : approfondissements, exponentielle (2026-11-05)

Relevé prod (MCP, 2026-11-05) : 300 sur la **notion** Fonctions › Fonction exponentielle ; 301 sur « propriétés
algébriques » ; 302 sur « variations ». Aucun modèle sur les 3 points. Sous-notions de la notion : courbe, croissance et
décroissance exponentielles, dérivée, équations et inéquations, fonctions x ↦ aˣ, propriétés algébriques, variations.
**D5 (David, 2026-11-05, « tes recos ? » puis « je te suis »)** : le modèle 300 va sur la sous-notion existante
« dérivée » (la preuve repose sur exp′ = exp ; aucune sous-notion neuve) ; 301 sur « propriétés algébriques », 302 sur
« variations ».

Chaîne des preuves (celle des manuels) : lemme exp(x)exp(−x) = 1 (dérivée nulle) → exp ne s'annule pas ; 300 :
(g/exp)′ = 0 et g/exp = 1 en 0 ; 301 : y fixé, h(x) = exp(x + y)/exp(y) vérifie h′ = h, h(0) = 1 → unicité ; 302 :
exp(x) = exp(x/2)² et exp(x/2) ≠ 0, puis exp′ = exp > 0. Chaque énoncé rappelle ce qui est admis ou déjà démontré.

| Point | Modèle (`scripts/questions/1spe-approfondissements-7/`) | Niveau | Variations                                                                  |
| ----- | ------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| 300   | `01-unicite-de-l-exponentielle`                         | 1      | exp(x)exp(−x) = ? (1), g/exp défini (choix), h′(x) = ? (0), étapes à ranger |
| 301   | `02-exponentielle-d-une-somme`                          | 2      | h défini (choix), h(0) = ? (1), h′ = h (choix), étapes à ranger             |
| 302   | `03-exponentielle-positive-et-croissante`               | 3      | exp(x) = (exp(?))² (x/2), exp(x) > 0 (choix), croissance (choix), à ranger  |

Script : `docs/wip/questions/lot-1spe-approfondissements-7.py` (positions « ranger » par `positions-ranger.ts`).
Ranger du 301 : « h′ = h » et « h(0) = 1 » en UNE étape (deux étapes interchangeables rendraient faux un ordre juste).
`0.5x` = `bad_form` au juge (`\frac{1}{2}x` accepté) : spec de forme refusée. Vérifié : `question:specs` 150 tirages par
variation, 39 specs vertes, 0 `\textcolor` hors `$` ; aperçus relus ; `create-questions` simulation prod (3 à créer) ;
brouillons en base locale (copie hors dépôt), aperçu admin vu à l'écran : choix du 301, case dans `exp(?)`, choix et
ranger du 302.

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/1spe-approfondissements-7 --publier`

### Lot 7 en prod : brouillons, puis migration nœud + tag (2026-11-05)

David a lancé `create-questions --publier` après #2396. Relevé prod (MCP) : 3 brouillons {1_SPE}, sans nœud ni tag :
`57e21851` unicité (300), `98acee83` exp(x + y) (301), `14e1838e` positive et croissante (302) ; aucun modèle déjà
tagué sur ces points. Ids écrits dans les JSON du lot (cette PR), `git restore` fait dans le dépôt principal. Migration
`20261105123948_questions_1spe_approfondissements_7_rangement_tags` (gabarit lot 6, aucune sous-notion neuve ; 300 sur
« dérivée », D5, son point restant sur la notion), test `questions-1spe-approfondissements-7-rangement-tags` 12/12 vert,
rouge sans la migration (6 rouges, la suite principale ne s'exécute pas). Accès : Q5 de D3, personne.

Mergée (#2397, CI verte après relance du job navigateur planté, 2097 tests verts). `security-auditor` : aucun finding.
`db:migrate` le 2026-11-05 (seule migration en attente, sans `--include-all`), vérifié MCP : 3 modèles sur leur nœud,
un tag chacun, `draft`, `updated_at` inchangé. Page à cocher : https://claude.ai/artifact/LEJtGYjAorBSHC7wwCzyx1.

Branches distantes `docs/questions-1spe-demonstrations` et `feat/questions-1spe-demonstrations` supprimées le
2026-11-05 (accord de David).

Relecture (2026-11-05) : 3/3 OK, aucun commentaire. Publié par David (`publier-lot.ts --publier`), 3/3 `published`
relus en base (MCP).

## 13. Lot 8 : approfondissements, géométrie (2026-11-05)

Relevé prod (MCP, 2026-11-05) : 324 sur Géométrie › Produit scalaire › angles et longueurs ; 325 sur la **notion**
Produit scalaire ; 326 sur la **notion** Vecteurs ; 334, 335 et 420 sur la **notion** Géométrie repérée. Aucun modèle
sur les 6 points. Pas de sous-notion « parabole » sous Géométrie repérée (celle de Fonctions › Second degré n'est pas
sous la notion des points).

**D6 (David, 2026-11-05, « je te suis »)** : 324 sur « angles et longueurs » ; 325 sur Produit scalaire › « propriétés » ;
326 sur Vecteurs › « combinaison linéaire » ; 334 et 420 sur une sous-notion **neuve « parabole »** sous Géométrie
repérée (posée par la migration du lot) ; 335 sur « équation de cercle ». Une seule PR pour les 6 modèles.

| Point | Modèle (`scripts/questions/1spe-approfondissements-8/`) | Niveau | Variations                                                                     |
| ----- | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| 324   | `01-loi-des-sinus`                                      | 1      | AC (30°, 45° : a√2), AC (45°, 60° : k√3), sin B̂ = b/(2a) ; loi rappelée        |
| 325   | `02-concourance-des-hauteurs`                           | 2      | HA·BC + HB·CA + HC·AB = ? (0), HA·BC = 0 (choix), conclusion (choix), à ranger |
| 326   | `03-medianes-et-centre-de-gravite`                      | 2      | GB + GC = ?·GA′ (2), A, G, A′ alignés (choix), AG = ? AA′ (2/3), à ranger      |
| 334   | `04-points-equidistants-de-l-axe-et-d-un-point`         | 2      | point de x = a (b/2), 2by = (x − a)² + ? (b²), la parabole (choix)             |
| 335   | `05-cercle-et-droite-parallele-a-un-axe`                | 1      | plus grande abscisse (y = k), plus petite ordonnée (x = k), nombre de points   |
| 420   | `06-parabole-et-droite-parallele-a-un-axe`              | 1      | ordonnée (x = k), plus grande abscisse (y = k), nombre de points               |

Script : `docs/wip/questions/lot-1spe-approfondissements-8.py`. Preuve des hauteurs par la relation d'Euler
HA·BC + HB·CA + HC·AB = 0 (Chasles) ; médianes par GA + GB + GC = 0 (G admis). Étapes à ranger enchaînées (chacune
s'appuie sur la précédente). Cercle de rayon 5 et d = ±3, ±4 : solutions entières. Nombre de points communs :
`1+sign(…)`. Piège : la variable `e` est la constante d'Euler (spec rouge « 1 point » avant renommage en `t`).
Vérifié : `question:specs` 150 tirages par variation, 62 specs vertes, 0 `\textcolor` hors `$` ; 439 formules
distinctes des aperçus, `validateLatex` + accolades : 0 problème ; aperçus relus ; `create-questions` simulation
prod (6 à créer) ; brouillons en base locale (copie hors dépôt), aperçu admin du 325 vu à l'écran (vecteurs,
case choix).

Commande pour David, après le merge (depuis le dépôt principal, à jour) :
`! pnpm tsx scripts/create-questions.ts --dir scripts/questions/1spe-approfondissements-8 --publier`

Mergée (#2401, CI verte du premier coup).

### Lot 8 en prod : brouillons, puis migration nœud + tag (2026-11-05)

David a lancé `create-questions --publier` après #2401. Relevé prod (MCP) : 6 brouillons {1_SPE}, sans nœud ni tag :
`4664114e` loi des sinus (324), `d33f98d5` hauteurs (325), `d4db2207` médianes (326), `64f54fc1` équidistants (334),
`a98fd3cf` cercle (335), `8cbfcf4b` parabole (420) ; aucun modèle déjà tagué sur ces points ; pas de sous-notion
« parabole » sous Géométrie repérée (ni active, ni archivée). Ids écrits dans les JSON du lot (cette PR), `git restore`
fait dans le dépôt principal. Migration `20261105195513_questions_1spe_approfondissements_8_rangement_tags` (gabarit
lot 5 : sous-notion neuve, tout ou rien), test `questions-1spe-approfondissements-8-rangement-tags` 11/11 vert, rouge
sans la migration (6 rouges, la suite principale ne s'exécute pas). Accès : Q5 de D3, personne.
