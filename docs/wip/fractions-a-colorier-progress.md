---
status: phase 0
---

# Chantier `fractions-a-colorier`

## Reprendre ici

_Mis à jour le 2026-10-29, après #1974._

- **État** : PR 1 (#1958) et PR 2 (#1974) mergées, rien en prod ; PR 3 (`unites:`) en phase 0 (§ 9).
- **Prochaine action** : coder la PR 3 une fois les 4 questions du § 9 tranchées.
- **En attente de David** : les 4 questions du § 9.
- **Pièges en cours** : réponse de l'élève = rangs coloriés `1, 4, 6`, attendue `3/8` (lue du bloc) ; fraction > 1 refusée aujourd'hui avec « `unites:`, pas encore disponible » (message à changer en PR 3) ; corrigé PDF des blocs à placer sans appelant (`generatePartageTypst(…, { solved: true })` prêt).
- **Après ce chantier** : chantier `solides` (assemblages de cubes, perspective, patrons ; 6e → 3e), ordre
  validé par David le 2026-10-29.
- **Worktree / branche** : `ubumaths-wt-fractions-a-colorier`, `feat/fractions-a-colorier-unites`.

---

## 1. Le besoin

Ouvert le 2026-10-29 (« je te suis » sur la reco : fractions à colorier d'abord, puis `solides`). Noté par
les sessions « questions » : `questions-ce1` § 3 C2, `questions-cm2` § 4 point 4, `questions-4` C2 (schéma
de fraction, 074), `questions-6` C5 (schéma en barres, 142).

Points du programme (relevé MCP du 2026-10-29, **aucun modèle** sur les douze) :

| Représenter (colorier les parts)          | Interpréter (quelle part est coloriée ?) |
| ----------------------------------------- | ---------------------------------------- |
| CE1-095 : ½ ⅓ ¼ ⅕ ⅙ ⅛ 1/10                | CE1-096 : mêmes fractions                |
| CE1-097 : fraction ≤ 1                    | CE1-098 : fraction ≤ 1                   |
| CM1-144 : fraction donnée (dén. ≤ 20)     | CM1-145                                  |
| CM1-149 : fraction décimale (/10, /100)   | CM1-150                                  |
| CM2-131 : fraction donnée (dén. ≤ 60)     | CM2-132                                  |
| CM2-136 : fraction décimale (/10 à /1000) | CM2-137                                  |

## 2. Le BO (cycle-2.pdf, page 12 ; CM1 / CM2 nombres)

- Figures du CE1 : **bande** partagée en n (½, ⅓, ⅙ ; ⅔, ⅗ en parts contiguës) ; **carré en 4 carrés** ;
  **carré coupé par ses diagonales** (triangles) ; **rectangle en grille** (2 × 4 pour ⅜) ; **disque en
  secteurs** (¼, ⅜) ; ⅜ en bande de 8 avec des parts **non contiguës**.
- « Différentes moitiés d'une feuille » : partages en parts de formes différentes — hors outil (parts
  inégales de forme, le geste ne les dessine pas).
- CE1 : fractions ≤ 1, dénominateurs 2, 3, 4, 5, 6, 8, 10. CM1 : dén. ≤ 20, fractions > 1 (somme d'un
  entier et d'une fraction < 1), décimales /10 et /100. CM2 : dén. ≤ 60, décimales jusqu'à /1000.

## 3. L'existant (lu le 2026-10-29)

- **Aucun bloc ne dessine une figure partagée** (rien dans `src/lib/ubumark`, `components/markdown/nodes`,
  `geometry-core`) ; 096 / 098 attendaient le bloc `figure` (questions-ce1 § 9) et n'ont jamais été faits.
- **Patron « à placer » établi** (`reponses-a-placer`, clos) : une ligne dans le bloc (`placer:`,
  `construire:`), le générateur pose `case: N`, la case est jugée comme une case ordinaire sur la valeur
  posée, réponse attendue lue du bloc (`buildAnswerOf`), jamais écrite dans `blanks[]` ; corrigé avec la
  figure juste ; PDF = figure vide à remplir au crayon ; nom accessible sans la réponse. Composants
  frères : `RangerPlacer`, `HorlogePlacer`, `BarresPlacer`, `NumberLinePlacer`.

## 4. Phase 0 — comportements proposés

### Écriture par le prof (un bloc neuf ```partage)

````text
```partage
forme: bande 8
gris: 3
```
````

- `forme:` — `bande N` (N parts en ligne, 2 à 12) · `grille L×C` (rectangle en L lignes et C colonnes,
  jusqu'à 10 × 10 : les centièmes) · `disque N` (N secteurs, 2 à 12) · `carre-diagonales` (4 triangles).
- **Interpréter** : `gris: 3` (les 3 premières parts) ou `gris: 1, 4, 6` (parts choisies, non contiguës).
  Affichage seul ; la réponse est une case ordinaire de l'énoncé (« $[_]$ de la bande est coloriée »).
- **Représenter** : `colorier: 3/8` — l'élève colorie ; une case, posée par le générateur.
- Variables permises (`forme: bande {{d}}`, `colorier: {{n}}/{{d}}`), lues sur l'énoncé résolu.

### Nominal

- Toucher une part la colorie, la toucher encore l'efface. Couleur d'accent unique.
- Jugé : **la part coloriée vaut la fraction** (nombre de parts coloriées ÷ nombre de parts). Quelles parts,
  peu importe : 3 parts quelconques de 8 pour ⅜. Bande de 4 avec `colorier: 1/2` → 2 parts justes.
- Corrigé : « Tu as colorié 2 parts sur 8 ; il fallait en colorier 3 (⅜). » et une figure juste à côté.
- PDF : la figure vide, l'enfant colorie au crayon (corrigé : la figure juste).
- Accessibilité : chaque part est un bouton à bascule, « Part 3 sur 8, coloriée » ; Tab, Espace, Entrée.

### Limites

- Grille 10 × 10 : 100 parts, cellules d'environ 28 px sur un téléphone de 320 px.
- Fraction que le partage ne permet pas (`colorier: 1/3` sur une bande de 8) → message au prof.
- Fraction > 1 (CM1, CM2) : plusieurs figures (`unites: 2`) — proposé en PR 3.
- Millièmes (CM2-136) : non dessinables (1000 parts) → refus, réponse en écriture.

### Erreurs (messages au prof)

- Forme inconnue, nombre de parts hors bornes, `gris:` et `colorier:` ensemble, part de `gris:` hors
  figure, fraction mal écrite, fraction > 1 sans `unites:`, fraction qui ne tombe pas juste sur le partage.

### Découpage proposé

1. **PR 1** — bloc ```partage affiché (`gris:`) : écran, PDF, éditeur riche, accessibilité → débloque les
   6 points « interpréter ».
2. **PR 2** — `colorier:` (case, geste, corrigé, PDF) → les 6 points « représenter ».
3. **PR 3** — fractions > 1 (`unites:`).

## 5. Questions à David

1. **Nom du bloc** : ```partage ? (Reco : oui, c'est le mot du BO.)
2. **Formes de départ** : bande, grille (dont 10 × 10), disque, carré coupé par ses diagonales ? Hexagone
   plus tard ? (Reco : ces quatre, rien d'autre tant qu'un modèle ne le demande pas.)
3. **Jugement** : juste dès que la part coloriée vaut la fraction (2 parts sur 4 pour ½) ? (Reco : oui ; le
   prof qui veut 1 part sur 2 donne une bande de 2.)
4. **Geste** : toucher seulement, ou aussi glisser pour colorier plusieurs parts d'un coup (utile en
   10 × 10 ; la première part touchée décide colorier ou effacer) ? (Reco : les deux.)
5. **Découpage** en trois PR (§ 4) ? (Reco : oui, PR 1 affiche d'abord.)

## 6. Décisions (David, 2026-10-29 : « je te suis » sur les cinq recos)

1. Bloc ```partage.
2. Quatre formes : `bande N`, `grille L×C` (jusqu'à 10 × 10), `disque N`, `carre-diagonales` ; pas d'hexagone
   tant qu'un modèle ne le demande pas.
3. Jugé sur la valeur : la part coloriée vaut la fraction (2 sur 4 juste pour ½).
4. Geste : toucher et glisser (la première part touchée décide colorier ou effacer).
5. Trois PR : affichage (`gris:`), `colorier:`, `unites:`.

Précisions de la PR 1 (choix d'exécution, dans le cadre validé) : numérotation des parts — bande de gauche à
droite, grille ligne par ligne depuis le coin haut gauche, disque depuis midi dans le sens des aiguilles,
carré coupé par ses diagonales : haut, droite, bas, gauche ; `gris:` absent = figure sans part coloriée ;
`colorier:` encore inconnu en PR 1 (clé inconnue → message), il arrive en PR 2.

## 7. PR 1 — bloc ```partage affiché (2026-10-29)

Agent `frontend-developer` sur le patron de l'horloge (`fa62ae0ea`) : type, parseur, scène partagée écran / PDF
(`utils/partage-scene.ts`), `Partage.svelte`, `partage-typst.ts`, branchements (listes, fermeture, lignes
protégées, éditeur riche, `answer-frames`, `check-ubumark`), fiche du catalogue `/aide-ecriture/blocs/partage`.
Rendu vérifié en Playwright (serveur 5178, compte prof local) : disque, grille 10 × 10, carré, bande, à 1200 et
360 px.

Revue `code-reviewer` (Sonnet), aucun bloquant ; corrigés : une seule part isolée n'était pas exprimable →
`gris: 4,` (virgule finale) ; contraste `--color-primary` / fond ≈ 2,3:1 → `--color-fig-orange` (≥ 3:1).

**Tranché (David, 2026-10-29 : « je te suis »)** : nom accessible = la forme seule (« Bande partagée en parts égales »), sans nombre de parts ni de parts coloriées.
Question posée : le nom accessible dit « Bande partagée en 8 parts égales, 3 coloriées » — il donne la
réponse d'une question « interpréter ». L'horloge dit seulement « Horloge à aiguilles ». Reco : même règle (« Figure
partagée en parts égales », sans la réponse).

- 2026-10-29 : #1958 mergée (CI verte, intégration comprise).

## 8. PR 2 — `colorier:`, l'élève colorie (2026-10-29)

Agent `frontend-developer` sur le patron de l'horloge à placer (`a244bd665`) : `utils/partage-colorier.ts`
(réponse, jugement, phrases), `PartageColorier.svelte`, `BuildKind` `'partage'` (« figure à colorier »),
branchements `build-answer`, `assign-blank-indices`, `instance-generator`, `expected-result`,
`template-validator`, `answer-validator`, `FillBlanksInput`, `BuildAnswer` ; fiche du catalogue, docs
`ubumark.md` et `questions.md`. Rendu vu en Playwright (5178) : bande 3/8, grille 10 × 10 à 37/100, à 1200 et
360 px (cellules ≈ 28 px), correction avec figure de l'élève et figure juste.

Choix d'exécution (dans le cadre validé, calqués sur horloge / ranger) :

- réponse de l'élève = ses rangs coloriés triés (`1, 4, 6`), vide = rien répondu ; attendue = `3/8` ;
  `colorier: 1/2` sur une bande de 4 → `2/4` ; juste si le nombre de parts coloriées est le bon ;
- `colorier: 0/N` refusé (« rien à colorier ») ; fraction > 1 refusée (« `unites:`, pas encore disponible ») ;
  `case: N` sans `colorier:` refusé ;
- figure agrandie de 15 % à l'écran (grille 10 × 10 touchable), PDF inchangé ; bouton « Tout effacer »,
  masqué en copie corrigée ; corrigé : « Tu as colorié 7 parts sur 100 ; il fallait en colorier 37 (37/100). »,
  « Tu n'as rien colorié. » pour une case vide.

Point ouvert : aucun corrigé PDF n'imprime les blocs à placer (`serie-automatismes.ts`) ;
`generatePartageTypst(node, { solved: true })` existe, testé, sans appelant.

Revue `code-reviewer` (Opus), aucun bloquant ; corrigé : le glissé rapide sautait des parts (segment parcouru à
petits pas), clic droit et second doigt ignorés. Mineur laissé : après un essai faux non verrouillé, la phrase
« Tu as colorié N parts » suit les parts en direct.

- 2026-10-29 : #1974 mergée (CI verte, intégration comprise, après le correctif d'horodatage #1972 sur `main`).

## 9. PR 3 — `unites:`, fractions > 1 (phase 0, 2026-10-29)

Worktree `ubumaths-wt-fractions-a-colorier`, branche `feat/fractions-a-colorier-unites`.

````text
```partage
forme: bande 4
unites: 3
colorier: 7/4
```
````

### Nominal

- `unites: N` dessine N figures identiques (la même `forme:`), côte à côte, qui passent à la ligne sur
  téléphone. Sans `unites:`, une seule figure, comme aujourd'hui.
- Numérotation continue : bande de 4 × 3 → parts 1 à 4 (figure 1), 5 à 8 (figure 2), 9 à 12 (figure 3).
  `gris: 7` = la figure 1 pleine et 3 parts de la figure 2 ; `gris: 1, 2, 5, 9` marche aussi.
- `colorier: 7/4` → 7 parts à colorier sur l'ensemble des figures ; jugé sur le nombre de parts
  coloriées (décision 3), quelle que soit la figure.
- Corrigé : « Tu as colorié 5 parts ; il fallait en colorier 7 (7/4, chaque figure a 4 parts). » et les
  figures justes (unités pleines d'abord).
- PDF : les N figures vides en ligne.
- Accessibilité : « Figure 2, part 3 sur 4, coloriée » ; nom du groupe : la forme seule (règle de la PR 1).

### Limites

- `unites:` de 1 à 5 ; `unites:` plus grand que nécessaire est permis (figures en trop à laisser vides).
- Grille 10 × 10 avec plusieurs unités : 100 cellules par figure, figures l'une sous l'autre sur téléphone.

### Erreurs (messages au prof)

- Fraction > 1 sans `unites:` → « 7/4 dépasse 1 : ajoute unites: 2 » (le nombre qu'il faut).
- `unites:` trop petit (`unites: 1` pour 7/4, `gris: 9` sur 2 bandes de 4) → le nombre qu'il faut.
- `unites:` hors bornes ou illisible.

### Questions à David

1. Numérotation continue d'une figure à l'autre (`gris: 7` déborde sur la figure 2) ? (Reco : oui.)
2. `unites:` plus grand que nécessaire permis (figure en trop) ? (Reco : oui, c'est un piège utile.)
3. Plafond `unites: 5` ? (Reco : oui ; CM1 « 2 + 3/4 » en demande 3.)
4. Jugé sur le seul nombre de parts, même si l'élève ne remplit pas une unité entière d'abord ? (Reco :
   oui, c'est la décision 3 ; exiger les unités pleines d'abord serait une règle neuve.)

**Tranché (David, 2026-10-29 : « go » sur les quatre recos)** : numérotation continue ; figures en trop
permises ; `unites:` de 1 à 5 ; jugé sur le seul nombre de parts.

### Fait (2026-10-29)

Codé en session principale, sans agent : `unites:` dans le parseur (`Figures`, messages « ajoute unites: 2 »,
« écris unites: 3 (ou plus) », plafond), `spec.units`, `partageSpecTotal`, `buildPartageScenes` (une scène par
figure, rangs à la suite ; `buildPartageScene` retiré), `partageFigureLabel`, un SVG par figure à l'écran
(`flex-wrap`) et au PDF (`box` séparées de 0,6 cm), attendue `7/4` (parts / parts d'une figure, rangs bornés à
5 figures dans `isColoringCorrect`), phrase « Tu as colorié 5 parts ; il fallait en colorier 7 (7/4, chaque
figure a 4 parts). ». Catalogue : clé `unites`, exemple « Plus grand que 1 », erreur « une seule figure ».
Tests : `partage-unites.test.ts` (24), composants (5), génération (1), compilation Typst réelle (disque × 3).
Vu en Playwright (5178, prof local) : catalogue à 1200 et 360 px, 7 parts coloriées sur trois bandes, pas de
défilement horizontal. Choix d'exécution : un glissé reste dans la figure où il commence.
