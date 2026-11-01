---
status: phase 0
---

# Chantier `cercle-trotteuse` — trotteuse de l'horloge et point à placer sur le cercle trigonométrique

## Reprendre ici

_Mis à jour le 2026-11-01, PR 1 (trotteuse) codée, pas encore de PR ouverte._

- **État** : PR 1 codée et commitée sur la branche (§ 7) : tests verts (serveur 13 383, client 861),
  `check:incremental` 0, `types:cliquet` tenu, `docs:check-a-jour` OK. **Pas encore vu dans l'appli** (port
  5176 pris par une autre session).
- **Prochaine action** : voir la trotteuse en vrai (port libre ≥ 5177, `/aide-ecriture/blocs/horloge`, lire +
  placer), puis `code-reviewer` (Sonnet), ouvrir la PR, CI, merge. Ensuite PR 2 (cercle trigo, § 4, § 6).
- **En attente de David** : rien.
- **Pièges en cours** : un geste ne doit jamais donner la réponse (énoncé masqué : `placer: ? s` pour une heure à
  secondes) ; client vitest : « Orchestrator not found » = bug de Vitest, relancer par dossier.
- **Worktree / branche** : `../ubumaths-wt-cercle-trotteuse` · `feat/cercle-trotteuse`.

---

## 1. Origine

Restes du chantier clos `reponses-a-placer` (journal `docs/archive/wip/reponses-a-placer-progress.md`, § 13-16
pour l'horloge à placer), notés le 2026-11-01 dans « Écarts connus » de `docs/systeme/questions.md` :

- **Trotteuse** : le bloc ` ```horloge ` n'a pas de secondes, ni à lire ni à placer. Points : CM2-082, 083, 084,
  153 (`questions-cm2` C1) ; BO CM2 : « Positionner les aiguilles d'une horloge correspondant à une heure donnée
  en heure, minute et seconde », « durées … en heure, minute et seconde » ; 6e : lire l'heure (h, min, s).
- **Point à placer sur le cercle trigonométrique** : 1re spé 306, BO « Placer un point sur le cercle
  trigonométrique » (`questions-1spe` C, D5 : devait passer dans la phase 0 des aiguilles, jamais fait).

**Ce chantier livre les gestes** ; les modèles de questions restent aux sessions « questions ».

## 2. Existant (lu le 2026-11-01)

- **Horloge** : `heure:` lit `9 h` ou `9 h 25` (`TIME_REGEX`, `horloge-parser.ts`), pas de secondes ;
  `horloge-scene.ts` (petite aiguille qui avance avec les minutes) ; horloge à placer : `placer: 9 h 25`,
  `horloge-placer.ts` (réponse `'47 25'` = crans petite / grande, 60 crans, `readHands`, `isPlacedTimeCorrect`,
  `trueHourTick`, `handsMistakes`), `HorlogePlacer.svelte` (étiquettes « petite / grande aiguille », toucher,
  ◀ ▶, flèches, `role="slider"`), case `type: 'text'`, PDF cadran sans aiguilles, 6 cm.
- **Cercle trigo** (` ```trig `, `trig-circle-parser.ts`, `TrigCircle.svelte`) : `preset` (quarters, sixths,
  thirds, all, custom), `angles:`, `points: M = 2*pi/3` (nommés, valeur cachée, 8 au plus), `equation:`,
  `mode: points | arc | interactive`, `display`, `mesures: principales`. `mode: interactive` = un point à
  glisser **pour explorer** (affiche l'angle en degrés, au dixième) : rien de jugé, pas d'aimant, souris
  seule (pas de toucher, pas de clavier).
- **Patron le plus proche pour le trigo** : le repère à placer (` ```courbe `, `placer: A=(2 ; 3) ; B=(-1 ; 2)`,
  `courbe-placer.ts`, `CourbePlacer.svelte`) : points nommés, une case par point, étiquettes pour choisir le
  point actif.

## 3. Phase 0 — trotteuse (PR 1)

### Écriture par le prof (proposée)

````text
Place les aiguilles pour qu'il soit {{h}} h {{m}} min {{s}} s.
```horloge
placer: {{h}} h {{m}} min {{s}} s
```
````

Même forme dans `heure:` pour lire (`heure: 9 h 25 min 40 s`). Les écritures actuelles (`9 h`, `9 h 25`)
restent valables ; `9 h 25 min` accepté aussi.

### Nominal

1. **Lire** : des secondes écrites → la trotteuse est dessinée (fine, couleur d'accent, petit contrepoids) ;
   sans secondes, pas de trotteuse (rien ne change pour les modèles existants).
2. La grande aiguille reste **pile sur sa minute** (elle ne glisse pas avec les secondes), la petite avance
   avec les minutes comme aujourd'hui (Q2).
3. **Placer** : avec des secondes dans `placer:`, trois aiguilles en attente sur le 12 et trois étiquettes
   « petite aiguille / grande aiguille / trotteuse » ; mêmes gestes que l'horloge à placer.
4. Jugé : trotteuse sur la **seconde exacte**, grande sur la minute exacte, petite comme aujourd'hui
   (secteur, ou cran de sa vraie place).
5. Faux : « Tu as placé les aiguilles sur 5 h 45 min 10 s. » + le cadran juste ; trotteuse et grande
   aiguille échangées → « La trotteuse montre les secondes. ».
6. Réponse stockée `'47 25 40'` ; réponse attendue `'9 h 25 min 40 s'` (cadran de 12).
7. PDF : cadran sans aiguilles (l'enfant dessine les trois) ; copie corrigée : cadran de l'élève figé ou juste.

### Limites et erreurs (messages au prof)

- Secondes hors de 0-59 → refus (« les secondes vont de 0 à 59 ») ; secondes sans minutes (`9 h 40 s`) → refus.
- Plusieurs cadrans (`heure: … ; …`) : les secondes peuvent être sur l'un et pas l'autre (durées CM2-084).
- `graduations: heures` ou `aucune` avec des secondes à placer : permis (c'est plus dur, choix du prof).

## 4. Phase 0 — point à placer sur le cercle trigonométrique (PR 2)

### Écriture par le prof (proposée)

````text
Place sur le cercle le point M associé à {{a}}.
```trig
placer: M = {{a}}
```
````

Plusieurs points : `placer: M = 2*pi/3 ; N = -pi/4` (une case par point). Angles écrits comme ailleurs dans le
bloc (`pi/3`, `-5*pi/4`, `13*pi/6`, `90°`).

### Nominal

1. Le cercle s'affiche avec ses **repères** (axes, 0, π/2, π, 3π/2 = préréglage `quarters`) et des
   **graduations sans étiquettes** tous les π/12 (Q5) ; aucun point posé au départ.
2. Sous le cercle : une étiquette par point (`M`, `N`…), l'actif en surbrillance ; toucher le cercle pose le
   point actif au cran le plus proche ; glisser un point posé le reprend ; ◀ ▶ et flèches : d'un cran.
3. Aimant : **24 crans** (multiples de π/12) — couvre π/6, π/4, π/3 et leurs associés (Q5).
4. Jugé : le cran de l'élève = l'angle attendu **modulo 2π** (`13*pi/6` ↔ π/6, `-pi/4` ↔ 7π/4).
5. Faux : « Ton point M est sur 3π/4. » (mesure principale, dans ]−π ; π]) + le cercle juste à côté.
6. Réponse stockée : le cran par point (`'8'`, `-` pas posé) ; réponse attendue : la mesure principale écrite
   (`\frac{2\pi}{3}`).
7. PDF : le cercle sans le point ; l'élève fait sa croix. Copie corrigée : cercle de l'élève figé, ou juste.
8. Nom accessible « Cercle trigonométrique » ; ni l'angle attendu ni le cran dans le DOM avant la pose.

### Limites et erreurs (messages au prof)

- Angle attendu hors des crans (`pi/5`) → refus (« un point à placer tombe sur un multiple de π/12 »).
- `placer:` avec `mode: interactive`, `equation:`, `display: table` → refus. Avec `angles:`, `preset` ou
  `points:` : refus si l'un **montre l'angle attendu** (la réponse serait écrite sur le cercle) ; sinon permis.
- Un nom à la fois dans `points:` et `placer:` → refus. 8 points à placer au plus.
- Téléphone : un cran de π/12 = 15°, soit ≈ 8 mm d'arc pour un rayon de 3 cm → assez large au doigt (taille
  du cercle à l'écran à mesurer en PR 2) ; ◀ ▶ compensent.

## 5. Questions à David

**Trotteuse**

1. **Écriture** : `9 h 25 min 40 s` (reco) ; ou plus court `9 h 25 40` ?
2. **Grande aiguille avec des secondes** : pile sur la minute (reco : lecture nette, même juge que le placer) ;
   ou elle avance avec les secondes, comme une vraie horloge (à 9 h 25 min 40 s, aux deux tiers vers 26) ?
3. **Trotteuse à l'affichage** : dessinée seulement quand des secondes sont écrites (reco) ; ou un réglage
   `trotteuse: oui` ?
4. **Jugement** : trotteuse à la seconde exacte, sans tolérance (reco, aimant de 60 crans) ?

**Cercle trigo**

5. **Crans** : 24 crans de π/12 (reco), graduations sans étiquettes visibles ; ou pas de graduations (l'élève
   ne voit que les axes) ; ou un réglage `crans: 8 | 12 | 24` ?
6. **Repères affichés** : axes + 0, π/2, π, 3π/2 étiquetés (reco) ; ou les axes seuls ?
7. **Phrase de correction** : mesure principale ]−π ; π] (reco, celle du programme) ; ou dans [0 ; 2π[ ?
8. **Plusieurs points dans un bloc** (`placer: M = … ; N = …`) dès la PR 2 (reco, le patron du repère le fait
   déjà) ; ou un seul point d'abord ?

**Les deux**

9. **Ordre** : trotteuse d'abord (petite, prolonge un geste en prod), puis cercle (reco) ?

## 6. Décisions (David, 2026-11-01 : « Oui, les 9 recos »)

1. Écriture `9 h 25 min 40 s` (`9 h`, `9 h 25`, `9 h 25 min` restent valables).
2. Avec des secondes, la grande aiguille reste **pile sur sa minute**.
3. Trotteuse dessinée **seulement quand des secondes sont écrites** (pas de réglage).
4. Trotteuse jugée à la **seconde exacte**, sans tolérance (60 crans).
5. Cercle : **24 crans de π/12**, graduations sans étiquettes.
6. Repères : axes + 0, π/2, π, 3π/2 étiquetés.
7. Phrase de correction en **mesure principale** ]−π ; π].
8. **Plusieurs points** par cercle dès la PR 2.
9. Ordre : **trotteuse (PR 1)**, puis cercle (PR 2).

## 7. PR 1 — trotteuse (2026-11-01)

- Types : `HorlogeTime.seconds?` (absent = pas de trotteuse) ; `HORLOGE_MASKED_WITH_SECONDS = '? s'`.
- Parseur : `9 h 25 min`, `9 h 25 min 40 s` (`9 h 40 s` refusé, jamais lu 9 h 4 min 0 s) ; secondes 0-59 ;
  secondes + `minutes: cachées` refusé ; `maskedPlacerValue`, `isMaskedPlacerValue`. Ancien test « `9 h 30 min`
  illisible » remplacé par `9 h 40 s` (décision 1).
- Scène : `secondAngle`, `secondHand`, `secondTail` (contrepoids) ; grande aiguille pile sur sa minute. Typst :
  trotteuse noire, fine.
- Juge `horloge-placer.ts` : réponse `'47 25 40'`, `handsOfAnswer(answer, withSecond)`, `timeText`
  `9 h 25 min 40 s`, seconde exacte ; phrases : trotteuse pas posée, grande et trotteuse inversées.
- Écran : `HorlogePlacer.svelte` (3e étiquette « trotteuse », ordre de pose grande → petite → trotteuse, ◀ ▶
  « d'une seconde ») ; `Horloge.svelte` dessine la trotteuse ; trotteuse couleur du texte (une seule couleur
  d'accent, la petite aiguille).
- Masquage : `masked-statement.ts` → `placer: ? s` ; garde `findUnmaskedAnswers` l'accepte.
- Page d'aide (`block-catalog/horloge.ts`) : réglages + exemple « Avec la trotteuse ». Doc : `ubumark.md`,
  `questions.md`.
- Tests : `horloge-trotteuse.test.ts` (21, rouges d'abord : 19/21), générateur (+1), `HorlogePlacer.svelte.test.ts` (+5).
