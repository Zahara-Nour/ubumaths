# Chantier `idees-3e-espace` — idées de la rubrique « Espace » de 3e

## Reprendre ici

_Mis à jour le 2026-11-27, phase 0 posée._

- **État** : relevé fait ([idees-3e-espace-releve.md](idees-3e-espace-releve.md)), fiches F1 à F5
  et questions Q1 à Q4 posées à David · **Prochaine action** : réponses de David (page à cocher),
  puis gros lot · **En attente de David** : Q1 à Q4 · **Pièges en cours** : F1 est un modèle de 4e
  (point 4-034), pas de 3e · **Worktree / branche** : `../ubumaths-wt-idees-3e-espace`,
  `feat/idees-3e-espace`

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
