# Chantier `idees-3e-espace` — idées de la rubrique « Espace » de 3e

## Reprendre ici

_Mis à jour le 2026-11-28, après #3282 (rangement de F1, `db:migrate` joué)._

- **État** : lot 1 en prod et relu. F1 (58f04074, 4-034, 7 variations) en brouillon en prod, rangé
  sous « Géométrie > Théorème de Pythagore > calcul de longueurs » et tagué 4-034 (vérifié en prod)
  · **Prochaine action** : relecture de F1 par David dans `/dev/modeles?point=4-034`, puis lecture
  des verdicts en base, corrections éventuelles, publication · **En attente de David** : la
  relecture · **Pièges en cours** : `--publier` en local écrit l'id local dans le fichier (à
  retirer avant tout commit) · **Worktree / branche** : aucun (retiré par `pr:merger`)

## Rubrique

« Espace » de 3e (codes 3G4, 6 exercices), réservée le 2026-11-27 dans
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md).

## Phase 0 (2026-11-27)

On reprend l'idée, jamais la forme. Une case par question, coup de pouce et trois erreurs prévues par
case, `testSpecs` sur chaque variation.

### F1 — Pythagore dans un solide (3G44) · recommandation : **nouveau modèle de 4e**

- **Chez eux** : sept cas mélangés, unité tirée de km à mm, résultat arrondi au dixième, saisi avec
  son unité.
- **Chez nous** : modèle « Calculer une longueur dans un solide avec Pythagore », point **4-034**,
  `grades` = 4, sous-notion « Théorème de Pythagore > calcul de longueurs » (à côté de 22d947f4, qui
  reste plan). Figure ` ```solide ` cotée en cm, case à un nombre arrondi au dixième (unité écrite
  après la case).
- **Variations** : v1 diagonale d'une face d'un cube (a de 3 à 12) ; v2 diagonale du cube, en deux
  temps (EG puis AG) ; v3 diagonale d'une face d'un pavé ; v4 diagonale du pavé ; v5 cylindre : du
  centre d'une base à un point du bord de l'autre (r de 2 à 8, h de 4 à 15) ; v6 génératrice d'un
  cône (r, h) ; v7 arête latérale d'une pyramide à base carrée (côté a, hauteur h : demi-diagonale
  a√2/2 puis Pythagore).
- **Erreurs prévues** (exemples, cube a = 5) : a² + a² oublié à la racine (50) ; a × 2 (10) ;
  diagonale du cube prise comme celle de la face (7,1) ; addition des longueurs (10).
- **Coup de pouce** : « Repère un triangle rectangle dont la longueur cherchée est l'hypoténuse. »
- Dépend de **Q1** (tracer la diagonale dans le dessin).
- **Outil livré** (n° 72, #3264, 2026-11-28) : `segments:` et `angles-droits:` du bloc ` ```solide `. Diagonale du cube : **[DF]** et triangle DHF (`angles-droits: DHF`), jamais [AG] (en cavalière, son dessin se couche sur l'arête [FG]). v5 (cylindre) : pas de segment possible, sans figure tracée ou retirée (phase 0 de l'outil). v7 : `points: O centre ABCD`, `segments: [SO], [OA]`, `angles-droits: SOA`.

### F2 — Rayon d'une sphère depuis une section (3G44 cas 8) · recommandation : **variation de 7bb95104**

- **Chez eux** : D à l'intérieur, à h du centre ; DB connu ; rayon AB par Pythagore.
- **Chez nous** : v5 de « Sections de solides » (3-020) : « Une boule est coupée par un plan à
  ${d}$ cm de son centre ; la section est un disque de rayon ${r}$ cm. Quel est le rayon de la
  boule ? » Arrondi au dixième. Erreurs : d + r ; r − d ; √(r² − d²).
- La section de pavé « parallèle à une arête » (3G41-1) est **hors bornes** (c4-4) : rien.

### F3 — Boule dans un cylindre (3G42 cas 4) · recommandation : **variation de 87f79961**

- **Chez eux** : boîte cylindrique de diamètre 2r et de hauteur 2r, boule de diamètre 2r : volume
  libre, arrondi au dixième.
- **Chez nous** : v6 de « Volume d'une boule » (3-021), valeur exacte en fonction de π :
  πr² × 2r − 4/3 πr³ = 2/3 πr³ (le prolongement d'Archimède du BO). r de 2 à 10. Erreurs : le volume
  de la boule seul ; celui du cylindre seul ; πr² × r − 4/3 πr³ (hauteur prise égale à r).
- Le cas « depuis l'aire de la sphère » (3G42 cas 3) est hors BO : rien.

### F4 — Repérage sur la sphère (3G40, 3G40-1) · recommandation : **rien**

- Absent du BO en vigueur (bornes générales de 3e). Il faudrait en plus un bloc neuf (sphère avec
  parallèles et méridiens, points à lire ou à placer). Hors programme, la fiche est gardée ; le
  modèle serait rangé **sans point** si David le veut (**Q2**).

### F5 — Volumes en unités mélangées (3G43) · recommandation : **variations de modèles de 5e et 4e**

- **Chez eux** : option « avec des conversions » : un même solide coté en dm, cm et mm.
- **Chez nous** : une variation à la fin de 0761124d (pavé, 5-050), 6a770d04 (pyramide, 4-029) et
  35002b15 (cône, 4-076) : dimensions en deux unités, volume demandé dans l'unité imposée.
  Erreurs : produit sans conversion ; conversion appliquée au volume par 10 au lieu de 1 000.
- Idée d'autres niveaux que la 3e : **Q3** (ici, ou laissée en « Idées en attente »).

### Questions à David

Page à cocher : https://claude.ai/artifact/3ejNDiSnEKUQntBmZcaosP (collection `verdicts`, une
entrée par fiche F1 à F5, R, Q1, Q3 ; Q2 est la fiche F4).

- **Q1** (outil) : pour F1, ajouter au bloc ` ```solide ` une ligne `segments: AG EG` (segment entre
  deux sommets ou points, en tirets s'il est caché) et le codage d'un angle droit ? Sans elle, F1
  part avec la figure du solide seul, la longueur cherchée nommée dans l'énoncé. Le chantier
  `solides-3d` fait évoluer ce bloc en ce moment (lots 7a droites, 7b plans) : recommandation,
  **noter l'outil dans `outils-manquants.md` pour `solides-3d`**, puis F1 une fois l'outil livré.
- **Q2** : F4 (repérage sur la sphère, hors programme) : rien, ou un modèle sans point ?
  Recommandation : rien.
- **Q3** : F5 (unités mélangées, 5e et 4e) : dans ce chantier, ou en « Idées en attente » ?
  Recommandation : dans ce chantier (trois variations).
- **Q4** (accès de la migration) : personne ne gagne d'accès, on range et on complète des modèles.

## Décisions de David (2026-11-27)

« Je valide » : toutes les recommandations de la page à cocher.

- **F1** : nouveau modèle de 4e, **après** l'outil n° 72 de `outils-manquants.md` (Q1 : l'outil
  d'abord, chantier `solides-3d`). Deuxième PR de ce chantier.
- **F2, F3, F5** : variations des modèles publiés, F5 dans ce chantier (Q3). Les cinq modèles sont
  réservés dans le tableau de répartition.
- **F4** : rien (Q2). **R** : rien.
- **Q4** : personne ne gagne d'accès.

## Lot 1 : variations de modèles publiés (2026-11-27)

Dossier `scripts/questions/idees-3e-espace-publies/` (export de la prod, variations ajoutées à la
fin), migration `20261127223236_questions_idees_3e_espace_publies_contenu.sql` et sa fixture.

| Modèle                                 | Variation ajoutée                                  | Plages                                |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------- |
| 7bb95104 Sections de solides           | v5 : rayon de la boule depuis d et r, au dixième   | d de 2 à 9, r de 3 à 12, d < r        |
| 87f79961 Volume d'une boule            | v6 : volume libre dans la boîte cylindrique, exact | r = 3, 6, 9, 12 (2r³/3 entier)        |
| 0761124d Volume d'un cube ou d'un pavé | v4 : longueur en dm, largeur et hauteur en cm      | L de 2 à 5 dm, l de 3 à 9, h de 2 à 8 |
| 6a770d04 Volume d'une pyramide         | v7 : côté en cm, hauteur en mm, volume en cm³      | a de 2 à 12, hauteur de 30 à 150 mm   |
| 35002b15 Volume d'un cône              | v6 : rayon en cm, hauteur en dm, valeur exacte     | r de 2 à 9, h de 1 à 3 dm             |

- Chaque variation : coup de pouce, trois erreurs prévues, specs (juste et erreurs). `question:specs`
  vert sur les cinq fichiers (1 400 tirages), test d'intégration de la migration vert.
- Écart avec la fiche F3 : r pris parmi 3, 6, 9, 12 (et non de 2 à 10) pour une valeur exacte
  entière devant π, comme les autres variations du modèle. Troisième erreur de F3 : volumes
  ajoutés (10r³/3 π) au lieu de « hauteur prise égale à r » (volume négatif, aucun élève ne le
  donnerait).
- `security-auditor` (2026-11-27) : aucun finding. Cinq UPDATE de `question_templates` (variations,
  specs, description) gardés par le contenu relevé en prod, rollback en commentaire ; personne ne
  gagne ni ne perd d'accès.

## Relecture (2026-11-27)

Séries de relecture enregistrées par David (`scripts/series/{3,4,5}-relecture-espace-publies.json`,
#3256). Relecture validée par David dans la conversation (« je valide ») ; aucun verdict en base.
Réservations des cinq modèles levées dans le tableau de répartition.

## Lot 2 : F1, modèle neuf de 4e (2026-11-28)

Script `docs/wip/questions/idees-3e-espace-neufs.py` → `scripts/questions/idees-3e-espace-neufs/`
(un fichier, `rangement` : « Géométrie > Théorème de Pythagore > calcul de longueurs », 4-034 ;
grades 4, niveau 2 à côté de 22d947f4).

- 7 variations (v0 à v6) : face d'un cube [BE] ; diagonale du cube [DF] par [HF] ; face d'un pavé
  [HF] ; diagonale du pavé [DF] ; cylindre $OM$ ; génératrice d'un cône ; arête latérale d'une
  pyramide régulière (`points: O centre ABCD`, `segments: [SO], [OA]`). Trois erreurs prévues par
  case, un coup de pouce par variation, résultat arrondi au dixième, jamais entier ni à la limite.
- Écarts avec la fiche : v1 ne demande que $DF$ (une case), $HF$ dans la correction. Cylindre : la
  figure montre le cylindre et ses centres, M et le triangle sont dans l'énoncé (l'outil ne trace
  rien sur un solide rond). Messages des erreurs écrits sous leur forme réécrite
  (`$\left[ DF \right]$`).
- Vu à l'écran (`/dev/modeles` en local, WebKit, `.captures/f1/`) : [AF] passait sur D en
  cavalière → [BE] ; pavés écrasés (p = 2 pour l = 11) → l ≤ 3p, l ≤ 3h ; cône en aiguille → r ≥ 3,
  h ≤ 3r ; pyramide plate → 2h ≥ a. Revu après correction : les 7 figures sont lisibles.
- `question:specs` 29/29, 350 tirages ; `sonde-cubes` 300 blocs, 0 problème ; `create-questions` en
  simulation vert. Réponse juste ou fausse non jouée à la main dans l'aperçu : les specs passent
  par le même juge.

## En prod (2026-11-28)

- Mise en prod 0.117.0 : #3264 (outil n° 72) et #3272 (F1) livrés.
- `create-questions --publier` par David : F1 = `58f04074-dcf6-448f-b862-dc1486988794`, `draft`,
  7 variations (relu en prod). Migration `20261128065817_questions_idees_3e_espace_neufs_rangement_tags`
  générée par `migration-rangement.ts` (nœud « Géométrie > Théorème de Pythagore > calcul de
  longueurs », point 4-034), fixture comprise.
- `security-auditor` (2026-11-28) : aucun finding bloquant ; gardes vérifiées sur l'état de la prod
  (modèle sans nœud ni tag, nœud et point uniques). Test `migrations-rangement-tags` vert.
- #3282 mergé, `db:migrate` joué le 2026-11-28 (accord de David) ; nœud et tag 4-034 vérifiés en prod.
