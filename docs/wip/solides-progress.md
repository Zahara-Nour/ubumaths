---
status: en cours
---

# Chantier `solides` — assemblages de cubes, perspective cavalière, patrons, sections

## Reprendre ici

_Mis à jour le 2026-10-30, après #2027 (spécification du lot 4 écrite)._

- **État** : lots 1 (#2003), 2 (#2023) et 3 (#2027, ` ```solide ` affichage) **mergés**, rien en prod ;
  spécification du lot 4 (` ```patron ` affichage) écrite au § 9, **pas encore validée**.
- **Prochaine action** : réponses de David aux Q13-Q18 (§ 9), puis TDD du lot 4 (pliage d'abord).
- **En attente de David** : Q13-Q18 du § 9 (grille `X`/`.`, noms des sommets répétés, pavé, plis, cône,
  `SOLIDE_MAX_RATIO` 20 → 10).
- **Pièges en cours** : lancer AUSSI `src/lib/theme` avant de pousser ; tests navigateur instables → relancer
  par petits lots ; aperçu d'un bloc : script tsx + capture Playwright (scratchpad), Chrome n'ouvre pas
  `127.0.0.1` ; corrigé PDF `solved` prêt, pas branché ; `EspaceSpec` = union : narrower par `kind`.
- **Worktree / branche** : `../ubumaths-wt-solides`, `feat/solides-patron`.

---

## 1. Origine

Suite de `fractions-a-colorier` (ordre validé le 2026-10-29) : assemblages de cubes (6e), puis perspective
cavalière et patrons (5e, 4e, 3e). Les sessions « questions » ont noté le manque : `questions-6` § 3 C2 (154,
155, 181, 208, 209, 153), `questions-5` § 3 C2 (144, 048, 049 ; aides 050, 108, 053), `questions-4` (027, 028 :
« un seul bloc solides avec la 6e »), `questions-3` (020), cours moyen (images fixes : CM1-109, 115 ; CM2-098,
100, 102, 105). Rien n'existe en 3D : le CP (#1777) dessine ses solides à la main dans un ` ```figure `
(cavalière 45°, réduction 1/2, ellipses en lignes brisées, tirets faits main).

**Ce chantier livre les outils (blocs et gestes)** ; les modèles de questions restent aux sessions « questions »
(comme pour ` ```partage `).

## 2. Points du programme visés (prod, 2026-10-30 : tous à 0 modèle)

| Niveau | Points                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CM1    | 109 nommer, 110 décrire, 111-113 faces, 114 construire (non évaluable), 115 reconnaître un patron du cube, 116 construire un patron du cube, 119 problèmes d'assemblages |
| CM2    | 098 nommer, 099 décrire, 100 / 102 reconnaître un patron du cube / du pavé, 101 construire un patron du cube, 105 problèmes d'assemblages                                |
| 6e     | 153 cm³, 154 comparer des volumes, 155 volume par dénombrement, 181 vues d'un assemblage, 208 retrouver l'assemblage, 209 dénombrer les cubes                            |
| 5e     | 144 reconnaître cube / pavé en cavalière, 048 représentations en cavalière, 049 cavalière ↔ patron ; volumes 050, 053, 108                                               |
| 4e     | 027 reconnaître pyramide, cône ; 028 représentations (cavalière, patrons, vues) ; 029 volume de la pyramide                                                              |
| 3e     | 020 sections (pavé ‖ face, cylindre ‖ ou ⊥ axe, boule)                                                                                                                   |

Hors chantier : figures de l'espace en repère de T spé (Q5 de `questions-tspe`) — à reprendre à la fin si le
dessin en cavalière s'y prête.

## 3. Ce que je propose de construire

Une **scène commune** (`utils/cavaliere-scene.ts`, calcul pur, partagée écran / PDF) : projection cavalière
(fuyantes à 45°, réduction 1/2 — celle du CP), arêtes cachées en tirets, ellipses calculées. Trois blocs
l'utilisent :

### ` ```cubes ` — assemblage de cubes (lots 1 et 2)

```cubes
hauteurs:
  2 1 1
  1 0 1
vue: perspective
```

- `hauteurs:` = la grille vue de dessus, une ligne par rangée (la **première ligne est au fond**, la dernière
  devant), chaque nombre = cubes empilés sur cette case (0 = vide). Variables admises (`{{a}}`).
- `vue:` = `perspective` (défaut), `dessus`, `face`, `droite`, `gauche` : une vue est une grille de carrés.
- Perspective : trois gris (dessus clair, devant moyen, côté foncé) pour lire le relief ; contours noirs.
- **Nominal** : la grille ci-dessus dessine 6 cubes ; `vue: face` dessine 3 colonnes de hauteurs 2, 1, 1.
- **Limite** : cube caché derrière une pile (il compte, il ne se voit pas : c'est l'objet de 6-209) ; une
  case à 0 au milieu (trou) ; grille 1×1 ; grille au plus 6×6, hauteur au plus 6.
- **Erreurs au prof** (dans `errors`, rien de dessiné) : lignes de longueurs différentes, nombre non entier ou
  négatif, grille trop grande, assemblage vide.
- Pas de cube en surplomb (une pile pose toujours sur le sol) : c'est ce que dit une grille de hauteurs.
- Dans un choix d'une case choix : petite taille, comme l'horloge (QCM « quelle est la vue de dessus ? »).

**Gestes (lot 2)** :

- `dessiner: face` (ou `dessus`, `droite`, `gauche`) : l'assemblage en perspective **et** une grille vide à
  côté ; l'élève colorie les carreaux (le geste de ` ```partage `, `colorier:`). Juste si les carreaux
  coloriés sont exactement la vue.
- `retrouver: dessus, face, droite` : les vues sont dessinées, l'élève écrit une hauteur dans chaque case de
  la vue de dessus. **Juste si son assemblage donne les mêmes vues** (plusieurs réponses justes possibles —
  Q3).
- Dénombrer, volume, comparer (209, 155, 154, 153) : case nombre ou case choix, qui existent.

### ` ```solide ` — solide en perspective cavalière (lots 3 et 6)

```solide
forme: pave 4 2 3
sommets: A B C D E F G H
marquer: face ABCD
```

- `forme:` `cube a`, `pave l p h`, `prisme triangle …` (base triangle, puis autres polygones), `cylindre r h`,
  `pyramide carree a h` (et rectangle, triangle), `cone r h`, `boule r`.
- `sommets:` noms optionnels, dans un ordre documenté ; `marquer:` une face (teintée), une arête (épaisse),
  un sommet (point) — le CP l'a fait à la main pour CP-051.
- `cachees: non` pour les dessiner en plein (cas « reconnaître la bonne perspective »).
- Lot 6 : `section:` (pavé parallèlement à une face, cylindre ‖ ou ⊥ à l'axe, boule) : plan et section
  teintés ; la question porte sur la nature de la section (case choix).
- **Erreurs au prof** : forme inconnue, dimension manquante ou nulle, nombre de noms de sommets faux.

### ` ```patron ` — patron d'un solide (lots 4 et 5)

```patron
solide: cube
forme: 7
```

- Cube : les 11 patrons numérotés + des **faux patrons** nommés (`faux 1`…) pour « est-ce un patron ? » ;
  pavé (`l p h`, même dispositions), prisme droit, cylindre (rectangle + 2 disques), pyramide.
- Sommets nommés (5-049 : « quel point vient sur A ? »), faces numérotées ou teintées.
- **Gestes (lot 5)** : `designer: face` — l'élève touche une face (« la face opposée à la face grise ») ;
  `completer:` — une face manque, des emplacements en pointillés, l'élève choisit où la poser (CM1-116,
  CM2-101 « construire un patron du cube » en version écran).

### Ordre des lots (une PR chacun)

1. ` ```cubes ` affichage (perspective + 4 vues), PDF compris.
2. Gestes des cubes : `dessiner:`, `retrouver:`.
3. ` ```solide ` affichage (7 solides, sommets, `marquer:`), PDF compris.
4. ` ```patron ` affichage (cube 11 + faux, pavé, prisme, cylindre, pyramide).
5. Gestes des patrons : `designer:`, `completer:`.
6. Sections (`section:` sur ` ```solide `).

## 4. Hors chantier (proposé)

- **Compléter une perspective à la main** (tracer les arêtes manquantes, pleines ou en tirets) : geste de tracé
  sur la figure, qui relève de `figure-a-completer` (Q4).
- CM1-114 (construire un solide en vrai) : non évaluable.
- Les modèles de questions : sessions « questions ».

## 5. Questions à David

1. **Perspective des assemblages de cubes** : cavalière (comme tous les solides et le CP ; la face avant est un
   vrai carré, la « vue de face » se lit directement) ou isométrique (papier pointé, fréquente dans les
   manuels de 6e) ? _Reco : cavalière, une seule convention partout._
2. **Un bloc ou trois ?** `questions-4` disait « un seul bloc solides ». Je propose **trois mots de clôture**
   (` ```cubes `, ` ```solide `, ` ```patron `) sur un **nœud commun à genres** (comme ` ```barres ` /
   ` ```histogramme ` partagent `stat-chart`) et une scène cavalière commune ; à consigner dans un ADR.
   _Reco : trois mots, un nœud, un ADR._
3. **Retrouver un assemblage** (6-208) : juger « mêmes vues que celles données » (toute réponse cohérente
   acceptée), ou exiger l'assemblage exact du générateur ? _Reco : mêmes vues._
4. **Compléter une perspective à la main** : hors chantier (futur, avec `figure-a-completer`) ? _Reco : hors._
5. **Ordre des lots** (§ 3) : d'accord, ou les patrons du cube (cours moyen, 4 points) avant le ` ```solide ` ?

**Réponse de David (2026-10-30)** : « je te suis » — les cinq recommandations sont retenues : cavalière
partout (Q1), trois mots / un nœud `espace` / un ADR (Q2, [ADR 0034](../adr/0034-solides-trois-blocs-un-noeud-une-scene-cavaliere.md)),
« mêmes vues » (Q3), perspective à compléter hors chantier (Q4), ordre des lots du § 3 (Q5).

## 6. Lot 1 — ` ```cubes `, affichage (spécification)

Modèle de code : la PR #1958 (` ```partage `, affichage), fichier pour fichier.

**Nœud** `EspaceNode` (`types/espace.ts`) : `type: 'espace'`, `source`, `spec: EspaceSpec | null`,
`errors: string[]`. `EspaceSpec` = union à genres ; au lot 1 seul `{ kind: 'cubes'; heights: number[][];
view: 'perspective' | 'dessus' | 'face' | 'droite' | 'gauche' }`. Clé inconnue → erreur.

**Lecture de `hauteurs:`** : lignes en retrait sous la clé (ou sur la même ligne, rangées séparées par `/` :
`hauteurs: 2 1 1 / 1 0 1`), nombres séparés par des espaces. Première rangée = **au fond**, dernière =
**devant** ; colonnes de gauche à droite. Rangées et colonnes **entièrement vides au bord** retirées
(une variable à 0 ne décale pas le dessin) ; un trou intérieur reste.

**Scène** (`utils/espace-scene.ts`, calcul pur) : repère SVG (y vers le bas), arête du cube = 1 cm à
l'écran comme au PDF ; fuyante = 0,5 × arête à 45° vers le **haut à droite**. Faces vues : devant, dessus,
droite ; une face collée à un cube voisin n'est pas émise. Ordre de dessin (peintre) : du fond vers le
devant, puis de gauche à droite, puis de bas en haut. Chaque face = un polygone avec son genre (`devant`,
`dessus`, `cote`) : trois teintes (dessus la plus claire, côté la plus foncée), contours noirs, aucune
couleur d'accent.

**Vues** (carrés de 1 cm, contours, sans relief) : dessus = cases non vides, rangée du fond en haut ;
face = par colonne, la plus haute pile ; droite = par rangée, la plus haute pile, **le devant à gauche** ;
gauche = le devant à droite.

| Cas                                       | Attendu                                                               |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `2 1 1 / 1 0 1`, perspective              | 6 cubes dessinés, le trou devant-milieu visible                       |
| idem, `vue: face`                         | 3 colonnes : 2, 1, 1 (le max de chaque colonne)                       |
| idem, `vue: dessus`                       | 5 carrés, le trou en bas au milieu                                    |
| idem, `vue: droite` / `gauche`            | 2 colonnes : devant 1, fond 2 / fond 2, devant 1                      |
| pile derrière une pile plus haute         | cachée (elle compte, ne se voit pas : 6-209)                          |
| `0 0 / 0 3`                               | une pile de 3, rien d'autre (bords vides retirés)                     |
| 1×1 de hauteur 1                          | un cube                                                               |
| lignes de longueurs différentes           | erreur « Ligne N : chaque rangée doit avoir le même nombre de cases » |
| `-1`, `1.5`, `x`                          | erreur « … une hauteur est un nombre entier de 0 à 6 »                |
| plus de 6 rangées / colonnes, hauteur > 6 | erreur (bornes 6 × 6 × 6)                                             |
| tout à 0, `hauteurs:` absente             | erreur « assemblage vide » / « hauteurs: manquante »                  |
| `vue: dessous`                            | erreur, vues permises listées                                         |
| variables `{{a}}`                         | lues sur l'énoncé résolu (comme ` ```partage `)                       |

**Rendu** : `Espace.svelte` (aiguillage par genre, `Cubes.svelte` pour le dessin) ; nom accessible
« Assemblage de cubes en perspective » / « Vue de face d'un assemblage de cubes » — **jamais le nombre de
cubes**. Erreur : messages au prof, cadre neutre « Solide indisponible » à l'élève. Dans un choix d'une case
choix : `--espace-taille: 3cm` comme l'horloge. **PDF** : Typst natif, mêmes polygones, gris imprimables.
**Éditeur riche** : aller-retour en bloc de code `cubes`. Catalogue de blocs (`block-catalog/cubes.ts`) et
`pnpm check:ubumark` comme pour ` ```partage `.

## 7. Lot 2 — gestes des cubes, `dessiner:` et `retrouver:` (spécification)

Modèle de code : la PR #1974 (` ```partage ` `colorier:`), fichier pour fichier : `spec` étendue, une case
`case: N` posée par le générateur, `construire: 'cubes'`, `type: 'text'`, réponse attendue calculée
(`buildAnswerOf`), juge à part dans `validateSingleBlank` / `validateBlankValue`, copie corrigée par
`BuildAnswer`, geste libre hors question (cours, aperçu).

### `dessiner:` — colorier une vue

```cubes
hauteurs: 2 1 1 / 1 0 1
dessiner: face
```

- Dessin : l'assemblage en perspective, à côté un **quadrillage vide** titré « Vue de face » (`dessus`,
  `droite`, `gauche` de même). Toucher un carreau le colorie, le retoucher l'efface.
- **Quadrillage** = la boîte de la vue juste **agrandie d'un carreau de chaque côté** (face de
  `2 1 1 / 1 0 1` : 3 × 2 → 5 × 4). **Jugé à une translation près** : juste si les carreaux coloriés ont
  exactement la forme de la vue, où qu'elle soit dans le quadrillage. _(Q6)_
- Réponse de la case : le quadrillage, rangées de haut en bas séparées par `/`, `1` = colorié
  (`00000/01000/01110/00000`) ; `''` = rien colorié. Elle se suffit (le juge n'a pas le bloc) et la
  correction redessine le quadrillage de l'élève. Attendue : la vue juste, même écriture, sans marge
  (`100/111`).
- Correction : quadrillage de l'élève verrouillé, phrase « Ce n'est pas la vue de face de l'assemblage. »
  (vide : « Tu n'as rien colorié. »), la vue juste dessous.

### `retrouver:` — retrouver l'assemblage d'après ses vues (6-208)

```cubes
hauteurs: 2 1 1 / 1 0 1
retrouver: face, droite
```

- Dessin : **pas de perspective** (elle donnerait la réponse). Les vues listées, titrées (« Vue de face »,
  « Vue de droite »), et la **vue de dessus en grille de saisie** : une case à nombre (1 à 6) sur chaque
  carreau de la vue de dessus, les cases vides de l'assemblage laissées blanches. La vue de dessus est donc
  toujours donnée _(Q7)_ ; `retrouver:` liste les autres (une ou plusieurs parmi `face`, `droite`, `gauche`).
- Réponse de la case : les hauteurs, écriture du bloc (`2 1 1 / 1 0 1`), `-` pour une case non remplie.
  Attendue : `face, droite : 2 1 1 / 1 0 1` (les vues jugées, puis l'assemblage du générateur).
- **Juste si l'assemblage de l'élève a les mêmes vues** (dessus, et celles listées) que celui du bloc —
  plusieurs réponses justes possibles (Q3). Exemple : bloc `2 1 / 1 2`, `retrouver: face, droite` (face
  2 2, droite 2 2) : `1 2 / 2 1` et `2 2 / 2 2` sont justes aussi ; `2 2 / 1 1` est faux (vue de droite).
  Le juge calcule les vues, il ne compare jamais aux hauteurs du bloc.
- Correction : une phrase par vue fausse (« Ton assemblage n'a pas la même vue de face. ») ; case vide :
  « Tu n'as pas rempli toutes les cases. » ; une solution dessous (l'assemblage du bloc), avec « Il y a
  d'autres réponses justes. » quand c'est vrai.

### Communs aux deux gestes

| Cas                                                                | Attendu                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| `dessiner: face` sur `2 1 1 / 1 0 1`, élève colorie la vue décalée | juste (translation)                                    |
| idem, vue de droite coloriée à la place                            | faux, « Ce n'est pas la vue de face de l'assemblage. » |
| idem, un carreau de trop                                           | faux                                                   |
| `retrouver: face, droite`, autre assemblage aux mêmes vues         | juste                                                  |
| `retrouver:`, une case laissée vide                                | faux, « Tu n'as pas rempli toutes les cases. »         |
| variables `{{a}}` dans `hauteurs:`                                 | réponse attendue sur l'énoncé résolu                   |
| `dessiner:` et `retrouver:` ensemble ; avec `vue:`                 | erreur au prof                                         |
| `dessiner: perspective` / `dessous` ; `retrouver: dessus` ou vide  | erreur, valeurs permises listées                       |
| `case:` écrite par le prof, réponse écrite dans `blanks[]`         | refusé (comme `colorier:`)                             |
| bloc dans une liste, une case choix, un tableau                    | refusé (premier niveau seulement)                      |

- **Hors question** (cours, aperçu de l'éditeur) : le geste est libre, rien n'est jugé.
- **PDF** : `dessiner:` → perspective + quadrillage vide à colorier au crayon ; corrigé : la vue
  coloriée. `retrouver:` → vues + grille de dessus vide ; corrigé : les hauteurs du bloc.
- **Accessibilité** : carreaux du quadrillage = boutons (« Carreau rangée 2, colonne 3, colorié ») ; cases
  à nombre étiquetées par rangée et colonne. Toujours jamais le nombre de cubes.
- Catalogue (`block-catalog/cubes.ts`) : deux exemples de plus ; `docs/systeme/ubumark.md` et
  `questions.md` mis à jour.

### Questions à David (lot 2)

6. **Quadrillage de `dessiner:`** : agrandi d'un carreau de chaque côté et jugé à une translation près
   (l'élève place sa vue où il veut, comme sur papier), ou quadrillage exactement à la taille de la vue
   (plus simple, mais il donne la taille de la vue) ? _Reco : agrandi, translation._
7. **`retrouver:`** : la vue de dessus toujours donnée, servant de grille de saisie (l'élève écrit une
   hauteur par carreau), ou aussi le cas « sans vue de dessus » (grille 6 × 6 à remplir, bien plus dur) ?
   _Reco : dessus toujours donnée._

**Réponse de David (2026-10-30)** : « je te suis » — quadrillage agrandi d'un carreau, jugé à une translation
près (Q6) ; vue de dessus toujours donnée, grille de saisie de `retrouver:` (Q7). Spécification validée.

## 8. Lot 3 — ` ```solide `, affichage (spécification)

Modèle de code : le lot 1 (#2003), fichier pour fichier ; nouveau genre `solide` du nœud `espace`
(ADR 0034), aiguillé dans le parseur, `Espace.svelte` (→ `Solide.svelte`) et `espace-typst.ts`.

```solide
forme: pave 4 2 3
sommets: A B C D E F G H
marquer: face ABCD, arete AE, sommet G
cotes: cm
```

**`forme:`** (obligatoire) — un mot puis ses dimensions (nombres > 0, virgule ou point) :

| Forme                             | Dessin                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `cube a`                          | face avant a × a en vraie grandeur, fuyante a                                          |
| `pave l p h`                      | face avant l (longueur) × h (hauteur), fuyante p (largeur)                             |
| `prisme triangle b h L`           | base avant : triangle isocèle de base b et hauteur h, pointe en haut ; fuyante L       |
| `prisme triangle-rectangle a b L` | base avant : triangle rectangle en bas à gauche, côtés a (horizontal) et b ; fuyante L |
| `pyramide carree a h`             | base horizontale a × a (en fuyante), sommet au-dessus du centre, hauteur h             |
| `pyramide rectangle l p h`        | idem, base l × p                                                                       |
| `pyramide triangle a h`           | base horizontale : triangle équilatéral de côté a                                      |
| `cylindre r h`                    | debout ; bases en ellipses « à plat » (horizontales), comme le CP                      |
| `cone r h`                        | debout, base en ellipse à plat, sommet au-dessus du centre                             |
| `boule r`                         | cercle + équateur en ellipse à plat                                                    |

- **Arêtes cachées en tirets**, calculées (polyèdre convexe : une arête est cachée quand ses deux faces
  tournent le dos à l'œil) ; cylindre, cône, boule : la moitié arrière de l'ellipse du bas en tirets
  (cône : entre les vrais points de tangence des génératrices, pas aux bouts de l'ellipse).
  `cachees: non` → tout en trait plein (« reconnaître la bonne perspective »).
- **Pas de teinte** de faces (traits noirs sur blanc, comme les manuels) ; seule une face marquée est
  teintée, en gris translucide : les arêtes cachées restent visibles à travers.
- **`sommets:`** (facultatif) — des noms (une lettre, éventuellement `'` ou un chiffre : `A'`, `O1`), dans
  l'ordre documenté, posés à l'extérieur du sommet :
  - cube, pavé : ABCD la face du **bas** (A devant gauche, B devant droite, C fond droite, D fond
    gauche), EFGH au-dessus (E sur A…) ; 8 noms.
  - prisme : ABC la base avant (A en bas à gauche, puis sens inverse des aiguilles), DEF la base arrière
    (D derrière A) ; 6 noms.
  - pyramide : le sommet d'abord, puis la base comme celle du pavé (SABCD, SABC) ; 4 ou 5 noms.
  - cône : S puis O (centre de la base) ; cylindre : O (bas) puis O' (haut) ; boule : O. Un centre nommé
    est dessiné (point).
- **`marquer:`** (facultatif, plusieurs séparés par des virgules) : `face ABCD` (teintée), `arete AE`
  (épaisse), `sommet G` (point). Les faces se désignent aussi **sans noms** par leur place, pour
  cube / pavé / prisme : `face devant | derriere | dessus | dessous | gauche | droite` (le CP le faisait
  à la main, CP-051). Nom ou place qui n'est pas une face / arête du solide → erreur.
- **`cotes:`** (facultatif) : `cotes: cm` (ou `mm`, `m`, `oui` sans unité) écrit les dimensions de
  `forme:` sur le dessin — pavé : longueur sous l'arête du bas avant, hauteur à droite de l'arête
  verticale avant droite, largeur le long de la fuyante du bas à droite ; cylindre, cône : un rayon tracé
  sur la base (tirets s'il est caché) et la hauteur (cône : hauteur intérieure en tirets) ; boule : un
  rayon. Nombres à la française (`4,5 cm`).
- **Échelle** : les dimensions sont des **proportions** ; le dessin est mis à l'échelle pour que son plus
  grand côté mesure 4 cm (à l'écran et au PDF). Un pavé 8 × 5 × 3 et un cube 2 ont la même taille ; ce
  sont les cotes qui disent les longueurs.

| Cas                                                       | Attendu                                                          |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| `pave 4 2 3`                                              | 9 arêtes pleines, 3 en tirets (celles qui partent de D)          |
| `cube 2`, `sommets: A … H`, `marquer: face EFGH`          | dessus teinté, 8 noms bien placés                                |
| `pyramide carree 4 3`                                     | 3 arêtes en tirets, celles de D (DA, DC, SD)                     |
| `pyramide triangle 4 3`                                   | arête du fond cachée seulement si elle l'est vraiment (calculée) |
| `cylindre 2 5`, `cotes: cm`                               | demi-ellipse arrière du bas en tirets, « 2 cm », « 5 cm »        |
| `cone 2 4`                                                | génératrices tangentes à l'ellipse, arc arrière en tirets        |
| `boule 3`, `sommets: O`                                   | cercle, équateur (arrière en tirets), centre O                   |
| `cachees: non`                                            | aucun tiret                                                      |
| `pave 10 1 1` (rapport 10)                                | dessiné ; au-delà d'un rapport 20 entre dimensions → erreur      |
| forme inconnue, `pave 4 2`, `cube 0`, `cube -1`, `cube x` | erreur, formes ou dimensions attendues listées                   |
| 7 noms pour un pavé ; deux fois le même nom               | erreur « un pavé a 8 sommets : 8 noms attendus »                 |
| `marquer: face ABD` / `arete AC` (diagonale) / `sommet Z` | erreur « ABD n'est pas une face du pavé »…                       |
| `marquer: face ABCD` sans `sommets:`                      | erreur « nomme les sommets (`sommets:`) pour marquer ABCD »      |
| `cotes: km`                                               | erreur, unités permises listées                                  |
| variables `{{a}}`                                         | lues sur l'énoncé résolu (comme ` ```cubes `)                    |

- **Nom accessible** : « Solide en perspective cavalière », **jamais le nom du solide** (ce serait la
  réponse de CM1-109 / 4-027) ; les noms de sommets marqués et les cotes y sont ajoutés (« face ABCD
  marquée »), car ils sont dans l'énoncé.
- **Erreur** : messages au prof, « Solide indisponible » à l'élève et au PDF (comme ` ```cubes `).
- **Case choix** : `--espace-taille: 3cm` (plus grand côté), comme les assemblages.
- **Scène** : `espace-scene.ts` gagne les traits (plein / tirets / épais), les points et les étiquettes ;
  la géométrie des solides (sommets 3D, faces, projection, visibilité) dans `utils/espace-solides.ts`,
  calcul pur, partagé écran / PDF. **PDF** : Typst natif (`line`, `polygon`, `dash: "dashed"`).
- **Éditeur riche** (aller-retour ` ```solide `), catalogue `block-catalog/solide.ts`, `pnpm check:ubumark`,
  `docs/systeme/ubumark.md`.
- **Hors lot 3** : tracer un segment intérieur (diagonale [AG], hauteur d'une pyramide nommée) ; prisme à
  base quelconque ; solide couché ou vu d'un autre angle ; sections (lot 6).

### Questions à David (lot 3)

8. **Échelle** : dimensions = proportions, dessin ramené à 4 cm de plus grand côté (les cotes disent les
   longueurs), ou vraie grandeur en cm (un pavé 10 × 6 × 4 déborde) ? _Reco : proportions, 4 cm._
9. **`cotes:`** dans ce lot (les volumes 5-050, 5-108, 4-029 en ont besoin), ou plus tard ? _Reco : dans ce
   lot._
10. **Ordre des sommets du pavé** : ABCD la face du bas, EFGH au-dessus (E sur A) — la convention la plus
    courante des manuels et du brevet —, ou ABCD la face avant, EFGH la face arrière ? _Reco : ABCD en bas._
11. **Cylindre, cône, boule** : ellipses « à plat » (horizontales, comme le CP et les manuels, pas la
    cavalière stricte qui les pencherait), ou cavalière stricte ? _Reco : à plat._
12. **Prismes** du lot : triangle isocèle et triangle rectangle, base en face avant (vraie grandeur) ; les
    autres bases plus tard ? _Reco : oui._

**Réponse de David (2026-10-30)** : « je te suis » — proportions, plus grand côté 4 cm (Q8) ; `cotes:` dans
ce lot (Q9) ; ABCD la face du bas, E sur A (Q10) ; ellipses à plat (Q11) ; prismes à base triangle isocèle
et triangle rectangle, en face avant (Q12). Spécification validée.

### Lot 3 livré (#2027, 2026-10-30)

- ` ```solide ` : 10 formes, `sommets:`, `marquer:`, `cotes:`, `cachees:` ; scène `utils/espace-solides.ts`,
  parseur `parser/solide-parser.ts`, `Solide.svelte`, PDF `curve` Typst ; fiche `block-catalog/solide.ts`.
- Revue (Opus) : 6 findings, corrigés dans la PR — dimension infinie (fiche PDF cassée) → bornes 1000 et
  3 décimales ; cône plat (h ≤ 0,5 r) refusé ; cotes du cylindre séparées ; « 2 cm » loin de C ; `O'` passé
  en chaîne à Typst. Reste : chevauchement des noms aux rapports élevés (question à David, ci-dessus).
- Écart à la spec : placement des noms par le plus grand angle libre entre arêtes (pas « vers l'extérieur
  du centre ») ; cote de hauteur du pavé à gauche, du cylindre à gauche.

## 9. Lot 4 — ` ```patron `, affichage (spécification)

Modèle de code : le lot 3 (#2027), fichier pour fichier ; nouveau genre `patron` du nœud `espace`
(ADR 0034), aiguillé dans le parseur, `Espace.svelte` (→ `Patron.svelte`) et `espace-typst.ts`.
Le lot 5 (gestes `designer:`, `completer:`) s'appuiera sur le **pliage** calculé ici.

```patron
solide: cube
forme: 7
sommets: A B C D E F G H
faces: numeros
```

**`solide:`** (obligatoire), mêmes mots et mêmes dimensions que `forme:` de ` ```solide ` :
`cube` (sans dimension), `pave l p h`, `prisme triangle b h L`, `prisme triangle-rectangle a b L`,
`pyramide carree a h`, `pyramide rectangle l p h`, `pyramide triangle a h`, `cylindre r h`.
Le cône et la boule n'ont pas de patron dans ce lot (§ Hors lot 4).

**`forme:`** — la disposition des faces :

| Solide         | `forme:`                                                                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cube, pavé     | `1` à `11` : les 11 patrons du cube, catalogue figé et dessiné dans l'aide (1-6 : « 1-4-1 », 7-9 : « 2-3-1 », 10 : « 2-2-2 », 11 : « 3-3 ») ; défaut `1` (croix) |
| cube, pavé     | `faux 1` à `faux 8` : faux patrons classiques, catalogue figé (un carré 2 × 2, 5 en ligne, deux rabats du même côté qui se recouvrent, 3 + 3 alignés…)           |
| cube seulement | une **grille** en retrait sous la clé (comme `hauteurs:`), `X` = une face, `.` = vide (ci-dessous)                                                               |
| prisme         | `1` : les deux triangles sur le même rectangle (défaut) ; `2` : sur deux rectangles différents                                                                   |
| pyramide       | `1` seulement (étoile : les triangles autour de la base)                                                                                                         |
| cylindre       | `1` seulement : rectangle h × 2πr, un disque collé au milieu de chaque grand côté                                                                                |

```patron
solide: cube
forme:
  . X . .
  X X X X
  . . X .
```

- **Grille** : le bloc **plie** la grille (calcul pur). Pas de `faux:` → la grille doit être un vrai patron du
  cube, sinon erreur (« cette grille ne se plie pas en cube : deux faces se recouvrent ») ; `faux: oui` → la
  grille ne doit **pas** se plier en cube, sinon erreur (« cette grille est un vrai patron du cube »). Le prof
  ne peut pas se tromper sans le savoir. 1 à 10 cases, au plus 6 × 6, cases reliées par un côté.
- **`tourner:`** `90`, `180`, `270` (quart de tour dans le sens des aiguilles) et **`retourner: oui`** (symétrie) :
  le même patron autrement posé (« reconnaître » ne se réduit pas à une image apprise).
- **Pavé** : le patron numéroté du cube, chaque carré devenant le rectangle de son rôle une fois plié
  (dessous / dessus l × p, devant / derrière l × h, côtés p × h). Le dessin est **un arbre de faces** posé
  de proche en proche le long des arêtes communes ; deux faces qui se chevauchent → erreur.

**`dessous:`** (facultatif, cube et pavé) — le numéro de la case (ordre de lecture : de gauche à droite, de haut
en bas) qui devient la face ABCD ; défaut `1`. Sur le dessin, cette face a A en bas à gauche, B en bas à droite,
C en haut à droite, D en haut à gauche ; le patron se plie **vers le lecteur** (faces relevées). Pour le pavé,
ses côtés horizontaux mesurent l, ses côtés verticaux p ; tout le reste s'en déduit.

**`sommets:`** (facultatif) — **les noms des sommets du solide**, dans l'ordre de ` ```solide ` (cube, pavé :
ABCDEFGH ; prisme ABC DEF ; pyramide S puis la base ; cylindre O, O'). Chaque coin du patron porte le nom du
sommet sur lequel il vient une fois plié : **un même nom revient plusieurs fois** (c'est l'objet de 5-049,
« mettre en relation la perspective et le patron »). Un `.` à la place d'un nom le cache partout ; un `?`
le remplace partout par « ? » (question « quelle lettre à la place de ? »).

```patron
solide: pave 4 2 3
forme: 3
sommets: A B C D E ? G H
```

**`faces:`** (facultatif) — `numeros` : chaque face porte son numéro (ordre de lecture), pour « quelle face
est opposée à la face 2 ? ». **`marquer:`** (facultatif, plusieurs séparés par des virgules) : `face 3`
(teintée, gris clair comme ` ```solide `), `face dessous | dessus | devant | derriere | gauche | droite`
(cube, pavé, prisme : le rôle une fois plié), `sommet A` (point sur chaque coin nommé A).

**`cotes:`** (facultatif) — `cm`, `mm`, `m`, `oui` (comme ` ```solide `) : chaque **longueur différente** écrite
une fois, sur une arête du bord (pavé : l, p, h ; prisme : les côtés du triangle et L ; pyramide : le côté de
la base et la hauteur du triangle **non écrite** — elle n'est pas une dimension du solide ; cylindre : r sur un
disque et h ; **la longueur du rectangle n'est jamais écrite**, c'est la question classique 2πr).

**Dessin** : contour en trait plein, plis en **trait fin plein**, pas de languettes, pas de teinte (sauf face
marquée). **Échelle** : proportions, plus grand côté du dessin = **6 cm** (un patron du cube 4 × 3 → carrés
de 1,5 cm) ; dans un choix de case choix, `--espace-taille: 3cm`.

| Cas                                                        | Attendu                                                                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cube`, `forme: 1` à `11`                                  | les 11 dessins du catalogue, tous plient en cube (test : pliage de chacun)  |
| `cube`, `faux 1` à `faux 8`                                | aucun ne plie en cube (test : pliage refusé, raison donnée)                 |
| grille vraie sans `faux:` ; grille fausse avec `faux: oui` | dessinées                                                                   |
| grille fausse sans `faux:` ; vraie avec `faux: oui`        | erreur, raison dite au prof                                                 |
| grille non reliée, 11 cases, 7 × 7                         | erreur                                                                      |
| `cube`, `forme: 1`, `sommets: A … H`                       | 14 coins nommés, les 8 lettres présentes, chacune là où elle vient          |
| `sommets: A B C D E ? G H`                                 | « ? » partout où vient F                                                    |
| `pave 4 2 3`, `forme: 7`, `dessous: 2`                     | rectangles 4 × 2, 4 × 3, 2 × 3 posés sans chevauchement                     |
| `faces: numeros`, `marquer: face 3`                        | numéros 1 à 6, face 3 grise                                                 |
| `pyramide carree 4 3`                                      | carré + 4 triangles isocèles de hauteur √13 ; S quatre fois                 |
| `prisme triangle 3 2 5`, `forme: 2`                        | 3 rectangles × 5, triangles sur deux rectangles différents                  |
| `cylindre 1 3`, `cotes: cm`                                | rectangle 2π × 3 (proportions), deux disques de rayon 1, « 1 cm », « 3 cm » |
| `tourner: 90`, `retourner: oui`                            | même patron, tourné / retourné ; noms et numéros suivent                    |
| `solide: cone 2 3`, `forme: 12`, `faux 1` pour un prisme   | erreur, solides / formes permis listés                                      |
| `dessous: 7`, 9 noms pour un pavé, `marquer: face 9`       | erreur                                                                      |
| variables `{{n}}`                                          | lues sur l'énoncé résolu (comme ` ```cubes `)                               |

- **Nom accessible** : « Assemblage de polygones à plier » — **jamais « patron »** ni le nom du solide (ce
  serait la réponse de « est-ce un patron du cube ? », CM1-115, CM2-100 / 102) ; noms et numéros ajoutés.
- **Erreur** : messages au prof, « Solide indisponible » à l'élève et au PDF.
- **Code** : pliage et catalogue dans `utils/espace-patrons.ts` (calcul pur : faces, arêtes communes, pliage
  → rôle de chaque face et sommet de chaque coin), parseur `parser/patron-parser.ts`, `Patron.svelte`, PDF
  Typst natif ; fiche `block-catalog/patron.ts`, éditeur riche, `pnpm check:ubumark`, `docs/systeme/ubumark.md`.
- **Hors lot 4** : patron du cône (secteur + disque, 3e / 4e-028, à la demande), pyramide inscrite dans un
  cube (3e : « identifier les patrons de pyramides inscrites dans un cube »), prisme à base quelconque, faux
  patrons des autres solides, autres dispositions de la pyramide et du cylindre ; gestes (lot 5).

### Questions à David (lot 4)

13. **Grille `X` / `.`** en plus des 11 numéros, avec vérification du pliage (le prof dessine n'importe quel
    patron ou faux patron, le bloc refuse une grille qui ne dit pas ce que le prof annonce) ? _Reco : oui ; le
    pliage sert de toute façon au lot 5._
14. **Noms des sommets** : les 8 noms du solide, répétés sur le patron (`?` pour poser la question), ou un nom
    différent par coin du patron (14 pour le cube, « quel point vient sur A ? ») ? _Reco : noms du solide
    répétés — une seule convention avec ` ```solide `, et la question « quel point vient sur A » se pose avec
    `?`._
15. **Pavé** : les 11 dispositions du cube, faces mises aux bonnes dimensions par le pliage ? Et des faux
    patrons du pavé « aux mauvaises dimensions » (bonne disposition, un rectangle faux) : dans ce lot ou plus
    tard ? _Reco : 11 dispositions + `faux 1-8` dans ce lot ; mauvaises dimensions plus tard._
16. **Plis** : trait fin plein (manuels de collège) ou tirets ? _Reco : trait fin plein._
17. **Cône** hors lot (patron = secteur + disque, rare avant la 3e) ? _Reco : hors lot._
18. _(reportée de #2027)_ **`SOLIDE_MAX_RATIO`** du ` ```solide ` : 20 → 10 ? À 20, les noms d'un pavé
    20 × 1 × 1 se chevauchent. _Reco : 10 (rapport plus grand inutile en classe), correctif glissé dans ce lot._

**Réponse de David (2026-10-30)** : « je suis tes recos » — grille `X` / `.` avec pliage vérifié (Q13) ; noms
du solide répétés, `?` pour questionner (Q14) ; pavé : 11 dispositions + `faux 1-8`, mauvaises dimensions plus
tard (Q15) ; plis en trait fin plein (Q16) ; cône hors lot (Q17) ; `SOLIDE_MAX_RATIO` 20 → 10 dans ce lot (Q18).
Spécification validée.

### Lot 4 livré (PR à venir, 2026-10-30)

- ` ```patron ` : cube (11 patrons, 8 faux, grille `X`/`.` pliée et vérifiée), pavé, prismes (2 dispositions),
  pyramides (étoile), cylindre ; `sommets:` (noms du solide répétés, `?`), `faces: numeros`, `marquer:`,
  `cotes:`, `tourner:`, `retourner:`, `dessous:`. Calcul `utils/espace-patrons.ts` : **dépliage** du polyèdre
  de ` ```solide ` (le solide roule sur la grille) ; `parser/patron-parser.ts`, `Patron.svelte`, PDF Typst,
  fiche `block-catalog/patron.ts` (les 19 dispositions dessinées). `SOLIDE_MAX_RATIO` 20 → 10 (Q18).
- Revue (Opus) : pliage juste (35 hexominos : exactement les 11 du catalogue se plient ; orientation de toutes
  les faces vérifiée) ; **2 fuites de réponse corrigées** — noms sur un faux patron (« F/A » au même coin) →
  `sommets:` refusé sur un faux ; nom accessible de `marquer: face dessus` → lu « face N », place refusée sur
  un faux. `faux: non` accepté partout.
- **Écarts à la spec** : `-` (et non `.`) pour un sommet sans nom, comme ` ```solide ` ; faces numérotées
  **avant** `tourner:` (noms et numéros suivent le dessin) ; nom accessible sans les noms des sommets (comme
  ` ```solide `) ; prisme isocèle : cotes base, L et hauteur du triangle en tirets (pas les côtés obliques,
  qui ne sont pas des dimensions) ; une cote portée seulement par des plis (base de la pyramide) s'écrit dans
  la plus grande face.
- **Trouvé en passant (hors chantier)** : un bloc spécial ouvert sur la ligne d'un élément de liste
  (`- ```cubes`, aussi ` ```horloge `, ` ```partage `…) est lu vide (« bloc non fermé ») ; la forme
  « - texte » puis le bloc en retrait marche. Le test de compilation du lot 3 (`- ```solide`) passe donc
  par le cadre « Solide indisponible ». À signaler à David.
