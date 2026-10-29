---
status: phase 0
---

# Chantier `fractions-a-colorier`

## Reprendre ici

_Mis à jour le 2026-10-29, phase 0 validée, PR 1 en cours._

- **État** : PR 1 (bloc ```partage affiché, `gris:`) codée, revue Sonnet faite (2 points corrigés : `gris: 4,` pour une seule part, teinte `--color-fig-orange` à ≥ 3:1), PR ouverte.
- **Prochaine action** : finir la PR 1, puis PR 2 (`colorier:`), puis PR 3 (`unites:`).
- **En attente de David** : nom accessible de la figure (§ 7) — le dire sans la réponse, comme l'horloge (reco), ou garder « 3 coloriées » ?
- **Après ce chantier** : chantier `solides` (assemblages de cubes, perspective, patrons ; 6e → 3e), ordre
  validé par David le 2026-10-29.
- **Worktree / branche** : `../ubumaths-wt-fractions-a-colorier` · `feat/fractions-a-colorier`.

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

**Question ouverte (David)** : le nom accessible dit « Bande partagée en 8 parts égales, 3 coloriées » — il donne la
réponse d'une question « interpréter ». L'horloge dit seulement « Horloge à aiguilles ». Reco : même règle (« Figure
partagée en parts égales », sans la réponse).
