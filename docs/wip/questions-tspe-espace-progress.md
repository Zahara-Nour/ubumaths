# Chantier « questions-tspe-espace » — terminale spécialité, géométrie dans l'espace, calculs (lots 6a, 6b)

> Sous-chantier de [`questions-tspe`](questions-tspe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots 2 à 4 § 15-17). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base, le niveau est `T_SPE`.
> Réparti le 2026-11-02 (David : « accélérer en répartissant les lots sur plusieurs sessions ») en trois sessions
> parallèles : `questions-tspe-proba` (lots 5a, 5b), `questions-tspe-espace` (6a, 6b), `questions-tspe-restes`
> (7, puis 8 quand les deux autres sont finis). Lot 9 (espace sur figure) attend le chantier `solides`.

## Reprendre ici

_Mis à jour le 2026-11-02, fichiers du lot 6a écrits._

- **État** : phase 0 du 6a validée ; 9 modèles écrits (`scripts/questions/tspe-6a-orthogonalite-distances/`), specs vertes, essai en base locale ; PR des fichiers ouverte.
- **Prochaine action** : merge de la PR des fichiers, puis David lance `create-questions --publier` depuis le dépôt principal ; relever les `id`, migration nœud + tag.
- **En attente de David** : `create-questions --publier` après le merge.
- **Pièges en cours** : voir « Décisions communes et pièges » ci-dessous.
- **Worktree / branche** : `../ubumaths-wt-questions-tspe-espace`, `feat/questions-tspe-espace`.

---

## Lots

| Lot | Thème                                                        | Points                                      |
| --- | ------------------------------------------------------------ | ------------------------------------------- |
| 6a  | Vecteurs, orthogonalité et distances                         | 549, 555, 556, 347, 344, 355, 356, 625, 357 |
| 6b  | Plans, représentations paramétriques, équations cartésiennes | 358, 368, 566, 568                          |

Découpage 6a / 6b proposé à la phase 0 (David peut le changer). Pas de figure en perspective (B\*, lot 9, attend
`solides`) : tout en texte et formules, en repère.

## Points (classement du § 3 de l'index)

- **A** : 549 (translations) ; 555, 556 (bilinéarité, symétrie du produit scalaire), 347 (développement de
  ‖u + v‖²), 344 (base orthonormée), 355 (longueur par le produit scalaire), 356 (distance d'un point à une droite),
  625 (grandeurs en repère : longueur, angle, aire, volume), 357 (orthogonalité de deux droites), 358 (plan
  médiateur) ; 368 (reconnaître un plan par son équation), 566 (traduire par un système), 568 (interpréter les
  solutions du système).
- **Bornes** : lts-6 (systèmes jusqu'à 3 inconnues, par substitution), lts-7 (intersection de deux plans : traduire
  et décider ; déterminer la droite = 374, approfondissement), lts-8 (vérifier qu'un vecteur est normal à (ABC)).
- **Voisins** (déjà couverts) : 550, 332, 333, 345, 557, 346, 558, 559, 352, 353, 354, 562, 563, 360, 364, 365, 366,
  367, 565, 369, 370, 371, 567, 372, 375, 376. Points « = » laissés au lot 8 : 326-331, 342, 343, 348-351, 560, 561, 363.

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

## Lot 6a : vecteurs, orthogonalité et distances

_2026-11-02. Relevé MCP (prod, lecture seule) : nœuds des 9 points et modèles des sous-notions voisines._

**Nœuds des points** (branche « Géométrie ») : 549 sur « Espace › vecteurs de l'espace » (aucun modèle sur cette
sous-notion) ; 555, 556, 347, 344 sur « Orthogonalité et distances dans l'espace › produit scalaire dans l'espace »
(4 modèles : 1277a5b6, 7c8bd127, 119b9148, 62e446cb) ; 355 sur « … › angles » (ca36b9c4) ; 356 sur « … › projeté
orthogonal » (eae25eba, 95f04c3e, 31b49cdf) ; 357 sur « … › orthogonalité de droites et plans » (4 modèles) ; **625 sur
la notion** « Orthogonalité et distances dans l'espace » (qui a 6 sous-notions : le modèle va sur une sous-notion, le
tag sur la notion est admis). Aucune sous-notion neuve.

**Niveaux pris** (catégories T_SPE seules, aucun autre niveau scolaire dedans) : Produit scalaire 1, 2 ; Norme et
distance 1, 2 ; Projeté orthogonal 2, 3, 4 ; Orthogonalité 2 ; Coordonnées dans l'espace 1.

**Déjà couvert en partie** : d6938108 (332) a une variation « image par une translation » ; d192da3e v1 (367) fait le
plan médiateur (358, lot 6b).

**Phase 0 proposée** (niveau `T_SPE` seul, un point par modèle, repère orthonormé dès qu'il y a produit scalaire,
réponse en case **ou** en case choix, jamais les deux) :

| #   | Point    | Titre                                          | Variations                                                                                                                                                | Catégorie (niveau)                                        | Nœud                              |
| --- | -------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------- |
| M1  | TSPE-549 | Translations de l'espace                       | v0 image de C par la translation qui envoie A sur B ; v1 composée de deux translations (vecteur u + v), image d'un point                                  | Vecteurs, droites et plans de l'espace › Translations (1) | Espace › vecteurs de l'espace     |
| M2  | TSPE-555 | Bilinéarité du produit scalaire                | u·v, u·w donnés : v0 u·(av + bw) ; v1 (au)·(bv) ; v2 (u + v)·w avec u·w, v·w donnés                                                                       | Orthogonalité… › Produit scalaire (3)                     | produit scalaire dans l'espace    |
| M3  | TSPE-556 | Symétrie du produit scalaire                   | v0 ‖u‖, ‖v‖ donnés : (u + v)·(u − v) = ‖u‖² − ‖v‖² (les termes u·v et v·u s'annulent) ; v1 u·v donné, v·(ku)                                              | Orthogonalité… › Produit scalaire (4)                     | produit scalaire dans l'espace    |
| M4  | TSPE-347 | Développer ‖u + v‖²                            | ‖u‖, ‖v‖, u·v donnés (\|u·v\| ⩽ ‖u‖‖v‖, leçon C1) : v0 ‖u + v‖² ; v1 ‖u − v‖² ; v2 ‖u + v‖ (valeur exacte)                                                | Orthogonalité… › Produit scalaire (5)                     | produit scalaire dans l'espace    |
| M5  | TSPE-344 | La base est-elle orthonormée ?                 | trois vecteurs en coordonnées, case choix : oui / non, deux vecteurs non orthogonaux / non, un vecteur non unitaire (piège : orthogonale mais pas normée) | Orthogonalité… › Base orthonormée (1)                     | produit scalaire dans l'espace    |
| M6  | TSPE-355 | Calculer une longueur avec le produit scalaire | v0 pavé droit a × b × c : AG² = (AB + AD + AE)² ; v1 OA, OB et OA·OB donnés : AB² = OA² + OB² − 2 OA·OB ; réponse exacte                                  | Orthogonalité… › Norme et distance (3)                    | angles                            |
| M7  | TSPE-356 | Distance d'un point à une droite               | droite (point A, vecteur u), point M : projeté H = A + t u, t = AM·u / ‖u‖², puis MH ; t entier, réponse exacte                                           | Orthogonalité… › Projeté orthogonal (5)                   | projeté orthogonal                |
| M8  | TSPE-625 | Aire et volume en repère                       | v0 triangle ABC rectangle en A (à vérifier par AB·AC = 0) : aire ; v1 tétraèdre OABC, OA, OB, OC deux à deux orthogonaux : volume                         | Orthogonalité… › Grandeurs (1)                            | produit scalaire dans l'espace    |
| M9  | TSPE-357 | Deux droites orthogonales ?                    | v0 (AB) et (CD) par quatre points ; v1 deux droites par représentation paramétrique ; case choix oui / non (orthogonales ≠ sécantes)                      | Orthogonalité… › Orthogonalité (1)                        | orthogonalité de droites et plans |

**Décisions (David, 2026-11-02, « tes recos ? » puis « je valide »)** : Q1 à Q4 selon les recos (M1 écrit ; M3 par (u + v)·(u − v) et v·(ku) ; trois catégories neuves ; M8 aire et volume seulement).

**Questions posées** :

- **Q1** 549 : d6938108 a déjà une variation « image par une translation » (taguée 332). Reco : M1 quand même (image
  par la translation qui envoie A sur B, composée), plutôt que noter 549 « couvert par ».
- **Q2** M3 (symétrie) : un modèle isolé sur la symétrie est mince. Reco : (u + v)·(u − v), qui ne se simplifie que
  par la symétrie, plus v·(ku).
- **Q3** Trois catégories neuves (Translations, Base orthonormée, Grandeurs). Reco : oui ; sinon M5 en Produit
  scalaire (6) et M8 en Norme et distance (4).
- **Q4** M8 (625, grandeurs) : longueur et angle ont déjà leurs modèles (62e446cb, ca36b9c4). Reco : aire et volume
  seulement.

**Question d'accès** (migration nœud + tag, après la création) : personne ne gagne ni ne perd d'accès (brouillons ;
visibles des élèves après `publier-lot`).

**Écriture** : `docs/wip/questions/lot-tspe-espace-6a.py` → `scripts/questions/tspe-6a-orthogonalite-distances/`.
Specs 6 + 8 + 7 + 8 + 5 + 7 + 3 + 6 + 5 vertes, 3 600 tirages (200 par variation), 0 avertissement ;
`create-questions` en simulation : 9 à créer. M5 : les 12 cas (2 familles × signe × 3 cas) vérifiés par `assert` à
l'écriture. Corrigé après relecture des tirages et de l'aperçu : M9 v1, systèmes `cases` en ligne (`$…$`) absents de
l'énoncé → un `$$…$$` par droite ; M5, fractions illisibles dans les colonnes en ligne et primes de ı⃗′, ȷ⃗′ cachées
par la flèche → vecteurs u, v, w sur une ligne `$$…$$`, en `\dfrac`. Vus, laissés : « √10 = √10 » quand la racine
ne se simplifie pas (comme 62e446cb). Base locale : 9 brouillons ; M9 v1 (choix juste accepté) et M5 (choix faux
refusé, bonne réponse montrée) joués dans l'aperçu ; saisie MathLive non pilotable.
