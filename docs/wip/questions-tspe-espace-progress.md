# Chantier « questions-tspe-espace » — terminale spécialité, géométrie dans l'espace, calculs (lots 6a, 6b)

> Sous-chantier de [`questions-tspe`](questions-tspe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots 2 à 4 § 15-17). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/tspe.json` → `["T_SPE"].points`. En base, le niveau est `T_SPE`.
> Réparti le 2026-11-02 (David : « accélérer en répartissant les lots sur plusieurs sessions ») en trois sessions
> parallèles : `questions-tspe-proba` (lots 5a, 5b), `questions-tspe-espace` (6a, 6b), `questions-tspe-restes`
> (7, puis 8 quand les deux autres sont finis). Lot 9 (espace sur figure) attend le chantier `solides`.

## Reprendre ici

_Mis à jour le 2026-11-02, après la publication des lots 6a et 6b._

- **État** : **sous-chantier clos.** Les 13 modèles (6a : 9, 6b : 4) sont `published` en prod, sur leur nœud avec leur point (relu au MCP).
- **Prochaine action** : aucune ici. La suite (lot 8 « à savoir », lot 9 « espace sur figure ») et le versement final se font dans le chantier index `questions-tspe` et dans `questions-tspe-restes`.
- **En attente de David** : rien.
- **Worktree / branche** : retirés.

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

**PR des fichiers** : #2239 mergée le 2026-11-02 (CI verte).

**Création en prod** (David, 2026-11-02) : 9 brouillons en [T_SPE], sans nœud ni tag — M1 158e5e1a, M2 f42d3f90,
M3 49b2182f, M4 2af3814b, M5 49fc94d2, M6 2edf8213, M7 4f056eb3, M8 aaa16821, M9 dcabc409. `--publier` lancé par
moi sur un simple « go » : refusé par le classifieur, David l'a lancé avec `!`.

**Migration nœud + tag** : `20261102181329_questions_tspe_lot6a_rangement_tags.sql` (copie du gabarit du lot 5a),
test `tests/integration/questions-tspe-lot6a-rangement-tags.test.ts` : 10 verts, rouge sans la migration (4 échecs,
5 sautés). Nœuds des 9 points revérifiés au MCP le même jour.

**Migration** : #2246 mergée le 2026-11-02 (CI verte, security-auditor sans finding), `db:migrate` passé (seule en attente), 9 modèles vérifiés au MCP sur leur nœud avec leur point.

## Lot 6b : plans, représentations paramétriques, équations cartésiennes

_2026-11-02. Relevé MCP (prod, lecture seule) : nœuds des 4 points, modèles de leurs sous-notions et voisins._

**Nœuds des points** (branche « Géométrie ») : 358 et 368 sur « Orthogonalité et distances dans l'espace › vecteur
normal et équation cartésienne » (4 modèles : d192da3e, 35697e01, 91c7b083, 2b240d8c) ; **566 sur la notion**
« Espace » (le modèle ira sur « Espace › vecteurs de l'espace », comme M1 du 6a) ; 568 sur « Espace › positions
relatives et intersections » (0808e518, 3bace561). Aucune sous-notion neuve.

**Niveaux pris** (catégories T_SPE seules) : Représentations… › Équation cartésienne d'un plan 1, 2 ; Positions
relatives 2 ; Intersections 2 ; Vecteurs, droites et plans › Coplanarité, décomposition 2.

**Déjà couvert en partie** : d192da3e v2 (tagué 367) calcule le `d` du plan médiateur (358) ; ac94a453 (333)
décompose w sur (u, v), deux inconnues ; 3bace561 v2 (567) décide la position de deux plans, 0808e518 (372) résout
droite ∩ plan. Aucun ne fait interpréter des solutions déjà obtenues (568) ni trois inconnues (566).

**Phase 0 proposée** (niveau `T_SPE` seul, un point par modèle, repère orthonormé, réponse en case **ou** en case
choix, jamais les deux) :

| #   | Point    | Titre                                  | Variations                                                                                                                                                                                                                                                                                                  | Catégorie (niveau)                                          | Nœud                                   |
| --- | -------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- |
| N1  | TSPE-358 | Lieux géométriques dans l'espace       | v0 A, B, M donnés : M est-il sur le plan médiateur de [AB] ? (MA² = MB², case choix oui / non) ; v1 équation complète du plan médiateur (normal AB, passe par le milieu) ; v2 lieu des M tels que MA·MB = 0 : sphère de diamètre [AB], rayon exact                                                          | Orthogonalité… › Lieux géométriques (1)                     | vecteur normal et équation cartésienne |
| N2  | TSPE-368 | Reconnaître un plan par son équation   | case choix : v0 nature de l'ensemble {M : équation} — plan / sphère / droite / point (équation linéaire déguisée, x² + y² + z² …, système) ; v1 z = k, x = k, y = k : plan parallèle à quel plan de coordonnées ; v2 2(x − 1) + 3(y + 2) = z : plan, case pour le `d` de la forme réduite                   | Représentations… › Équation cartésienne d'un plan (3)       | vecteur normal et équation cartésienne |
| N3  | TSPE-566 | Coordonnées d'un vecteur dans une base | v0 u, v, w (base, système triangulaire, par substitution, lts-6), t donné : a, b, c tels que t = au + bv + cw (trois cases) ; v1 « traduire » : quel système traduit t = au + bv + cw ? (case choix, leurres : coordonnées lues en ligne au lieu de colonne)                                                | Vecteurs, droites et plans › Coplanarité, décomposition (3) | vecteurs de l'espace                   |
| N4  | TSPE-568 | Interpréter les solutions d'un système | case choix : v0 droite ∩ plan, la substitution donne « kt = m », « 0t = m » ou « 0t = 0 » → un point / strictement parallèles / droite incluse ; v1 deux plans, ensemble des solutions donné (paramétré, vide, une équation) → droite / parallèles / confondus ; v2 trois plans, solution unique → un point | Représentations… › Positions relatives (3)                  | positions relatives et intersections   |

**Questions posées** :

- **Q1** 358 : d192da3e v2 fait déjà le `d` du plan médiateur (tagué 367). Reco : N1 quand même, sur le **lieu**
  (appartenance, équation complète, sphère de diamètre [AB]), plutôt que noter 358 « couvert par ».
- **Q2** Catégorie neuve « Lieux géométriques » pour N1. Reco : oui ; sinon Équation cartésienne d'un plan (4).
- **Q3** N3 v1 (« quel système traduit… ») : le BO dit « traduire par un système ». Reco : oui, en case choix.
- **Q4** N4 : énoncés qui **donnent** le résultat du calcul (l'élève interprète seulement), pour ne pas refaire
  0808e518 et 3bace561. Reco : oui.

**Question d'accès** (migration nœud + tag, après la création) : personne ne gagne ni ne perd d'accès (brouillons ;
visibles des élèves après `publier-lot`).

**Décisions (David, 2026-11-02, « tes recos ? » puis « je valide »)** : Q1 à Q4 selon les recos (N1 sur le lieu ;
catégorie neuve « Lieux géométriques » ; N3 v1 en case choix ; N4 donne le résultat du calcul).

**Écriture** : `docs/wip/questions/lot-tspe-espace-6b.py` → `scripts/questions/tspe-6b-plans-systemes/`. Specs 9 + 11

- 6 + 12 vertes, 2 200 tirages (200 par variation), 0 avertissement ; `create-questions` en simulation : 4 à créer.
  N1 v1 en `answerKind: equation` : une équation proportionnelle est acceptée (spec). Corrigé après relecture des
  tirages : « +(−2)(y+1) » et « (x0) » dans la correction de N1 v1 (`coef`/`terme` sur les facteurs, constante nulle
  gardée) ; « 0+3t » dans les triplets de N4 (`comp()`) ; « b = 0, donc b = 0 » dans N3 v0 (substitution écrite) ;
  « le système 2 » retiré de N3 v1 (le choix est mélangé à l'affichage). Base locale : 4 brouillons ; N4 v2 (choix juste
  accepté) et N3 v1 (système transposé refusé, bonne réponse montrée) joués dans l'aperçu.

**PR des fichiers** : #2254 mergée le 2026-11-02 (CI verte).

**Création en prod** (David, 2026-11-02) : 4 brouillons en [T_SPE], sans nœud ni tag — N1 8767110f, N2 86efd357,
N3 0027cea7, N4 833cf1f1 ; nœuds des 4 points revérifiés au MCP le même jour (358, 368 sur « vecteur normal et équation
cartésienne », 566 sur la notion « Espace », 568 sur « positions relatives et intersections »).

**Migration nœud + tag** : `20261102192653_questions_tspe_lot6b_rangement_tags.sql` (copie du gabarit du 6a, préfixe
`_qtl6b_`), test `tests/integration/questions-tspe-lot6b-rangement-tags.test.ts` : 10 verts, rouge sans la migration
(4 échecs, 5 sautés).

**Migration** : #2256 mergée le 2026-11-02 (CI verte, security-auditor sans finding, `check:migrations --pr` passé),
`db:migrate` passé (seule en attente) ; relu au MCP : les 4 modèles sur leur nœud avec leur point, `updated_at`
préservé, toujours brouillons.

## Publication des lots 6a et 6b (2026-11-02)

Page à cocher des 13 modèles (les deux lots sur une même page, fichiers copiés dans un dossier de travail) :
https://claude.ai/artifact/V3TXKaBX4mjdK6QYDYvK7a. Aucune alerte, 13 brouillons sur leur nœud. Relecture : **13/13 « OK »**
comptés en base, sans commentaire. `publier-lot` (simulation puis `--publier`) lancé par David dossier par dossier
(la simulation est refusée par le mode auto, comme l'écriture). Relu au MCP : **13/13 `published`**
(158e5e1a, f42d3f90, 49b2182f, 2af3814b, 49fc94d2, 2edf8213, 4f056eb3, aaa16821, dcabc409, 8767110f, 86efd357,
0027cea7, 833cf1f1). **Sous-chantier clos.**
