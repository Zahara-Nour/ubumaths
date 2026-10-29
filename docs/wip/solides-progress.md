---
status: phase 0
---

# Chantier `solides` — assemblages de cubes, perspective cavalière, patrons, sections

## Reprendre ici

_Mis à jour le 2026-10-30, à l'ouverture du chantier._

- **État** : phase 0 écrite (§ 3 et 4), **en attente de David**.
- **Prochaine action** : réponses aux questions du § 5, puis lot 1 (` ```cubes `, affichage) en TDD.
- **En attente de David** : Q1 à Q5 (§ 5).
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-solides` · `feat/solides`.

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
