---
status: en cours
---

# Chantier `solides` — assemblages de cubes, perspective cavalière, patrons, sections

## Reprendre ici

_Mis à jour le 2026-10-30, lot 2 en PR._

- **État** : lot 2 (gestes `dessiner:` / `retrouver:`, § 7) codé, revu (code-reviewer Opus : 1 défaut corrigé), PR ouverte sur `feat/solides-gestes` ; lot 1 mergé (#2003), rien en prod.
- **Prochaine action** : PR du lot 2 verte → merge → vérification manuelle à noter (`verifications-manuelles.md` : colorier une vue, retrouver des hauteurs, au téléphone) ; puis lot 3, ` ```solide ` affichage — spécification d'abord, comme les § 6 et 7.
- **En attente de David** : rien.
- **Pièges en cours** : lancer AUSSI `src/lib/theme` avant de pousser ; tests navigateur instables quand la machine est chargée (WebSocket fermée, `wrapDynamicImport`) → relancer par petits lots ; la fiche `/aide-ecriture/blocs/cubes` est réservée au prof, et Chrome n'ouvre pas `127.0.0.1` → aperçu par capture du navigateur de test ; corrigé PDF (`solved`) prêt mais pas branché (comme ```partage).
- **Worktree / branche** : `../ubumaths-wt-solides`, `feat/solides-gestes`.

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
