# Chantier « réponses à placer » — l'élève répond en plaçant un objet

## Reprendre ici

_Mis à jour le 2026-10-28, après les décisions du § 22._

- **État** : droite, horloge, barres (#1908) et plafond de l'axe (#1915) mergés, pas en prod. Étiquettes à ranger : phase 0 (§ 21) tranchée (§ 22, toutes les recos). PR en cours, tests rouges d'abord.
- **Prochaine action** : bloc ```ranger (parseur, mélange, case, écran glisser/toucher, PDF, page d'aide).
- **En attente de David** : rien.
- **Pièges en cours** : `BuildKind` patron commun (`generator/build-answer.ts`, `buildCaseCount`) ; `isPlaceKind` = droite + horloge ; patron le plus proche = case choix (ADR 0033, `choix-parser.ts`, `questions/choice-case.ts`) ; les 5 modèles « ranger » ne sont PAS réécrits ici.
- **Worktree / branche** : `ubumaths-wt-reponses-a-placer` · `feat/reponses-a-placer`.

---

## 1. Le besoin

Un type de réponse qui n'existe pas encore : l'élève **place** un objet (point, étiquette,
aiguille, hauteur de barre) et la réponse jugée est sa **position**. Formes notées dans le
chantier « questions » : point sur une droite graduée, étiquettes à ranger, aiguilles.

Points du programme qui l'attendent :

- **CP-008** — placer des nombres sur une demi-droite graduée de un en un (borne : graduée de un
  en un uniquement). Verdict du conseil (`geometrie-validation`), suivi par David le 2026-10-25.
- **CP-072** — présenter des données en diagramme en barres (hauteur des barres ; caractère à 2-5
  valeurs, moins de 40 individus).
- **CP-058** — vérifier un alignement à la règle : à réexaminer (placer, case « figure », ou ni l'un
  ni l'autre).
- Horloge : placer les aiguilles (aujourd'hui CP-047 se joue en QCM entre cadrans).

## 2. Questions de la phase 0 (à poser à David, pas tranchées)

1. Par quel geste commencer ? (recommandation à donner après lecture de l'existant)
2. Le geste à l'écran : glisser, toucher une graduation, ou les deux ? Sur téléphone ?
3. Ce qui est jugé : la position exacte (graduation) ; une tolérance ?
4. Écriture par le prof : une ligne dans le bloc existant (comme `construire:`), ou un bloc neuf ?
5. Correction et PDF : comment montrer la position juste ; que donne la fiche imprimée ?

## 3. Phase 0 — l'existant (lu le 2026-10-26)

- **Patron déjà établi : « à construire »** (`collection`, `monnaie`, `construire: N`). Une ligne dans le
  bloc existant ; le générateur pose `case: N` ; **une** case `math` jugée comme une case ordinaire (la
  valeur posée) ; correction « Ta collection vaut 32. » + construction juste à côté ; copie corrigée
  `BuildAnswer.svelte` ; PDF = plan vide en pointillés où l'enfant dessine ; nom accessible sans la réponse.
- **Droite graduée** (` ```line `) : `start`, `end`, `step`, `major`, `labels`, `hidden`, `points`,
  `segments`. Purement affichée aujourd'hui.
- **Code mort à rebrancher** : `question-inputs/NumberLineInput.svelte` a déjà un mode `place-point`
  (toucher / glisser, aimant sur les graduations, flèches ← → Début Fin). Aucun composant ne l'importe,
  aucun générateur ne produit la case `graphical` + `graphicalConfig` (questions.md § écarts).
  Défaut vu : la réponse est un décimal (`0.3333333333` pour un tiers) → à écrire en fraction.
- **Horloge** : dessin seul ; CP-047 se joue en QCM entre cadrans. **Barres** : bloc `barres` (stat-chart),
  dessin seul. **Étiquettes à ranger** : `OrderingInput.svelte`, mort aussi, glisser-déposer HTML5
  (ne marche pas au doigt).
- **Portée** : droite graduée = CP-008, CE1-010, CE2-010, CM1/CM2 (entiers, fractions, décimaux :
  ~12 points) ; aiguilles = CP-047, CE1-060, CE2-058, CM1-093, CM2-083 ; barres = CP-072, CE1-088,
  CE2-082, CM1-135, CM2-121.

## 4. Phase 0 — comportements proposés (premier geste : le point sur la droite)

Écriture par le prof (calquée sur `construire:`) :

````text
Place le nombre {{a}} sur la droite.
```line
start: 0
end: 20
step: 1
labels: 0, 10, 20
placer: {{a}}
```
````

**Nominal**

1. L'élève touche la droite : un point apparaît sur la graduation la plus proche (aimant). Il le glisse
   pour corriger, ou le retouche ailleurs. Au clavier : ← → d'une graduation.
2. Il valide : la case vaut la graduation choisie, jugée comme une case ordinaire (7 attendu, 7 posé → juste).
3. Juste : point vert. Faux : « Tu as placé le point sur 9. » + la droite juste à côté (point sur 7).
4. Copie corrigée et verso de flash-card : la droite verrouillée avec le point de l'élève ou le point juste.
5. PDF : la droite sans point ; l'enfant fait une croix au crayon.
6. Nom accessible « Droite graduée » ; jamais la valeur attendue, ni dite ni dans le DOM.

**Limites**

- Rien posé → réponse vide (comme « Tu n'as rien posé. »).
- Graduation qui porte déjà une étiquette (0, 10) : permise (c'est une vraie réponse possible).
- Pas fractionnaire (`step: 1/4`, CM1) : réponse écrite `3/4`, jamais `0.75` ni `0.333…`.
- Téléphone : la droite tient dans la largeur ; graduations trop serrées au doigt (≈ 30 graduations
  et plus sur 360 px) → boutons ◀ ▶ sous la droite pour ajuster d'un cran.

**Erreurs (messages situés pour le prof)**

- `placer:` hors de `start`…`end`, ou pas sur une graduation → refus au parseur.
- `placer:` avec `points:` déjà présents : à trancher (Q4).
- Bloc avec `placer:` hors d'une question (cours, aperçu) : le même geste, rien de jugé.

## 5. Questions à David (phase 0)

1. **Ordre des gestes** — recommandation : (a) point sur la droite d'abord (code à moitié écrit, ~12 points
   du CP au CM2), (b) aiguilles ensuite, (c) barres en dernier ; étiquettes à ranger hors chantier
   (CP-007 se fait déjà en case texte). D'accord ?
2. **Écriture** — une ligne `placer:` dans le bloc existant, comme `construire:` (recommandé), plutôt
   qu'un bloc neuf ?
3. **Ce qui est jugé** — la graduation exacte, sans tolérance (l'aimant rend la tolérance inutile) ?
4. **Plusieurs nombres sur une même droite** (« place 3, 7 et 12 ») : `placer: A=3 ; B=7 ; C=12`, une
   case par point (note partielle naturelle) ; ou un seul point par droite au départ ?
5. **Téléphone** : boutons ◀ ▶ en plus du toucher, ou toucher seul ?
6. **PDF** : la droite sans point (l'enfant fait sa croix) — ça te va ?

## 6. Décisions (David, 2026-10-26 : « go sur tes recos »)

1. Ordre : **droite graduée** → aiguilles → barres ; étiquettes à ranger hors chantier (décision revue le
   2026-10-28 : réintégrées, § Reprendre ici).
2. Écriture : ligne **`placer:`** dans le bloc ` ```line ` (patron `construire:`).
3. Jugé : la **graduation exacte**, sans tolérance (aimant).
4. **PR 1 : un seul point par droite** (`placer: 7`) ; PR 2 : plusieurs (`placer: A=3 ; B=7`, une case par
   point) — syntaxe de la PR 1 choisie pour s'étendre sans casse.
5. Boutons **◀ ▶ toujours visibles** sous la droite (d'un cran), en plus du toucher et du clavier.
6. PDF : la droite **sans point**, l'enfant fait sa croix.

## 7. PR 1 — droite à placer, un point (2026-10-26)

- Parseur : `placer:` et `case:` dans ` ```line ` (refus : hors droite, hors graduation, `log`, avec
  `points:`, illisible ; `case:` sans `placer:`) ; `findLinesToPlace`, `hasLineToPlace`.
- Calcul pur `ubumark/utils/number-line-placer.ts` : réponse `placerAnswer` (entier, décimal à point,
  sinon `\frac{p}{q}`), commune à la réponse attendue et à l'élève.
- Générateur : `BuildKind` gagne `'line'` (patron « à construire » repris) ; lecture commune
  `generator/build-answer.ts` ; messages au prof « droite graduée » (`buildKindName`).
- Écran : `NumberLinePlacer.svelte` (toucher/glisser, ◀ ▶, clavier, `role="slider"`), point bleu
  sur la droite ; faux → « Tu as placé le point sur 9. » + droite juste (point vert) ; copie corrigée
  par `BuildAnswer` ; Entrée sur une droite vide → focus sur la droite.
- Vu en vrai (port 5177, admin local, aperçu d'un brouillon local `e8d7b0e3…`) : poser, valider,
  carte de correction OK.
- **Limite trouvée** : sur téléphone (375 px), la droite (viewBox 600 × 120) rétrécit entière : chiffres
  minuscules, graduations à ~12 px. Vaut pour tout bloc ```line. Les boutons ◀ ▶ compensent la précision,
  pas la lisibilité. Question posée à David.

## 8. Décisions (David, 2026-10-26, après #1846 : « ok pour tes recos »)

1. **Téléphone** : PR à part, **avant la PR 2**. Dessiner la droite ```line à la largeur réelle du
   conteneur (chiffres, points, traits à taille fixe ; seul l'écart entre graduations se resserre), au
   lieu de réduire la viewBox 600 × 120. PDF inchangé. L'aperçu du modèle avertit le prof si les
   graduations tombent sous ~20 px sur un écran de téléphone. Pas de défilement horizontal (il se battrait
   avec le glisser). Vaut pour toutes les droites graduées.
2. **Droite à placer (ou collection / monnaie à construire) dans un QCM** : rien à coder. L'ADR 0033
   fait du QCM une case choix, et `multiple_choice` disparaît après la migration ; le trou n'existe que
   pour l'ancien type. À la migration : un test qui mêle ```choix et une droite à placer (deux cases jugées).

## 9. PR « téléphone » — droite à la largeur réelle (2026-10-26)

Branche `feat/reponses-a-placer-telephone`. `NumberLine.svelte` dessine la droite en px à la largeur
du conteneur (plus de viewBox 600 réduite) ; `valueToX` / `xToValue` / `computeGraduations` /
`computeLineExtents` prennent la largeur (défaut 600 : PDF et `NumberLineInput`, code mort hors tests,
inchangés). `phoneGapWarning` (droites à placer seulement, après revue : une droite d'affichage garde ses graduations fines) : avertissement d'auteur si l'écart minimal entre graduations, sur un
conteneur de 320 px, passe sous 20 px (0 à 20 au pas de 1 → 12 px : avertie). Droite de correction :
`showErrors={false}` (pas d'avertissement en double). Tests : `number-line-largeur.test.ts`,
`NumberLine-largeur.svelte.test.ts` (320 / 700 px, chiffres de même taille, geste à 320 px).

## 10. Décisions PR 2 (David, 2026-10-27 : « ok go » sur les recos)

Plusieurs points sur une même droite : `placer: A=3 ; B=7 ; C=12`.

1. **Geste** : rangée d'étiquettes A B C sous la droite (à côté de ◀ ▶), une active (A au départ).
   Toucher la droite pose le point actif ; l'étiquette suivante non placée devient active. Toucher /
   glisser un point posé le reprend. ◀ ▶ et flèches : le point actif.
2. **Séparateur `;`** (pas `,` : « 3,5 » à la française serait mal lu).
3. **Correction** : « Tu as placé B sur 9. » par point faux, « Tu n'as pas placé C. » ; la droite juste
   avec **tous** les points, en vert.
4. **Au plus 6 points.** Noms : une lettre majuscule, distincts ; obligatoires dès 2 points. Deux points
   sur la même graduation : permis (vraie erreur possible).
5. Une case par point (note partielle) ; PDF : la droite sans point.

## 11. PR 2 — plusieurs points (2026-10-27)

Branche `feat/reponses-a-placer-2`. Tests rouges d'abord : `number-line-placer-plusieurs.test.ts`
(parseur), `generation-placer.test.ts` (une case par point).

- Parseur : `placer` devient `NumberLineTarget[]` (`name`, `value`) ; refus : > 6 points, nom ≠ lettre
  majuscule, nom en double, point sans nom dès 2, `;` en trop. Générateur : une case par point,
  `buildBlanks[…].point`, `buildAnswerOf(kind, source, point)`. Écran : étiquettes A B C (`aria-pressed`),
  point actif, passage au suivant non posé ; noms côte à côte sur une même graduation. Saisie : la droite
  est « vide » tant qu'un point manque (Entrée → focus). Copie corrigée : une ligne `build` par droite,
  `answers` point par point.
- Revue (Opus) : aucun bug de correction ; corrigés avec tests rouges d'abord : point actif hors bornes
  quand le prof retire des points (aperçu), pose impossible au doigt sur un point déjà posé, point actif
  au remontage = premier non posé.
- Vu en vrai (port 5177, `teacher@local.test`, `/aide-ecriture/blocs/droite-graduee`, 1100 px) : A sur
  3, B et C sur 9, noms côte à côte, étiquettes. **Trouvé, hors PR** : sur cette page à 375 px, TOUTES
  les droites (affichage compris) restent à 600 px, rognées : la colonne de la grille ne rétrécit pas
  (`min-width: auto`). À corriger dans la page d'aide (petite PR à part).

- Essai de David sur le MacBook (tunnel SSH, 2026-10-27) : trois points, A et B sur la même
  graduation, étiquettes, ◀ ▶ : OK. Vu aussi : l'avertissement orange est rogné à gauche et à
  droite sur la page d'aide, même sur ordinateur (même défaut de colonne que les droites à 375 px).
- Méthode de test sur un autre appareil écrite : `docs/pratiques/tester-sur-un-autre-appareil.md`
  (fonctions `tunnel` / `untunnel` du MacBook, Tailscale Serve pour l'iPhone).
- Essai de David sur l'iPhone (Tailscale Serve, 2026-10-27) : recette réussie de bout en bout
  (Mac mini renommé `serveur` avant l'activation, nom public des certificats). Droite à placer au
  doigt : marche. Remarque de David : pour mettre deux points sur la même graduation quand tous
  sont posés, toucher reprend l'autre point → flèches ou glisser (règle « toucher un point posé le
  reprend » gardée, à confirmer par David).
- Glisser au doigt sur l'iPhone (2026-10-27), deux défauts corrigés (branche
  `fix/placer-glisser-iphone`) : l'appui long ouvrait la loupe et une sélection de texte
  (`user-select: none`, `-webkit-touch-callout: none`) ; le glisser n'était pas immédiat, Safari
  attendant de savoir si le doigt défile (`touchstart` non passif, `preventDefault` quand le doigt
  est sur un point posé ; ailleurs la page défile). Vu OK par David sur l'iPhone. Reste : le glisser
  qui suit la pose d'un point absent attend encore un peu (relâcher et reprendre).
- Correction dans une vraie question sur l'iPhone (2026-10-27, aperçu admin, onglet Entraînement) :
  « Tu as placé B sur 9. » OK, mais la droite juste coupée sous « Correction ». Cause hors du
  bloc : `CorrectionCard` (et `CustomFlashCard`, même code) se plafonne à 80 % de l'écran en se
  mesurant elle-même → ne se voit plus trop haute, coupe sa fin au lieu de défiler ; corrigé en
  mesurant la fiche (`bind:ref`, `min-h-full shrink-0`), branche `fix/correction-telephone`. Même
  PR : l'avertissement « téléphone » n'est plus montré dans les onglets de l'aperçu qui imitent
  l'élève (`provideAuthoringAdvice`), gardé dans l'éditeur et la page d'aide (choix de David).

## 12. PR « page d'aide : droites et avertissement rognés » (2026-10-27)

Branche `fix/aide-ecriture-colonne`. Deux causes, dans `BlockHelpPage` et `BlockTryIt` (rien dans le
bloc) : (1) la boîte de rendu est un flex centré, son enfant garde `min-width: auto` → la droite
mesure son conteneur, qui fait la largeur de départ de la droite (600 px) : elle ne rétrécit
jamais, centrée, rognée des deux côtés (même à 1100 px, boîte de 469 px) ; enveloppant `min-w-0`.
(2) grilles sans `grid-cols-1` → colonne `auto` qui ne rétrécit pas à 375 px. Mesuré
(Playwright, port 5177) : avant, 9 rendus sur 11 rognés à 375 et à 1100 px ; après, aucun ;
avertissement orange entier aux deux largeurs.

## 13. Phase 0 — aiguilles (2026-10-27)

### Existant

- Bloc ```horloge (#1707) : `heure:` obligatoire (1 à 4 cadrans), `chiffres:`, `graduations:`,
  `minutes: visibles | cachées`, `cadran: 12 | 24`, `taille:` (4 cm par défaut). Scène commune
  `utils/horloge-scene.ts` (petite aiguille qui avance avec les minutes). Dessin seul.
- Points du programme : CP-047 (heures entières ≤ 12), CE1-060 (heures < 24, demies, quarts),
  CE2-058 (heures et minutes), CM1-093 (heures et minutes), CM2-083 (heures, minutes, **secondes**).
  CP-047 se joue aujourd'hui en QCM entre cadrans.
- Patron à reprendre : `placer:` de la droite (`BuildKind`, `build-answer.ts`, une case par cible,
  étiquettes pour choisir l'objet actif, ◀ ▶, clavier, `role="slider"`, PDF sans réponse).

### Écriture par le prof (proposée)

````text
Place les aiguilles pour qu'il soit {{h}} h {{m}}.
```horloge
placer: {{h}} h {{m}}
chiffres: tous
```
````

`placer:` remplace `heure:` (un seul cadran). Même lecture d'heure que `heure:` (`9 h`, `9 h 25`,
heures 0 à 23).

### Nominal

1. Le cadran s'affiche avec les deux aiguilles **en attente** sur le 12 (grisées, en pointillés) :
   rien n'est encore posé, et la position de départ ne dit rien de la réponse.
2. Sous le cadran : deux étiquettes **« petite aiguille » / « grande aiguille »** (une active, la
   grande au départ) et ◀ ▶. Toucher le cadran tourne l'aiguille active vers le point touché ;
   glisser une aiguille la saisit ; ◀ ▶ et flèches la font avancer d'un cran.
3. Aimant : la grande aiguille s'arrête sur les **minutes** (60 crans) ; la petite aussi sur 60 crans
   (elle doit pouvoir se mettre « entre le 9 et le 10 »).
4. Les deux aiguilles **sont indépendantes** (pas de remontoir) : c'est l'apprentissage visé — l'erreur
   type « petite aiguille sur le 9 à 9 h 45 » doit rester possible.
5. Jugé : grande aiguille sur la minute exacte ; petite aiguille dans le **bon secteur** — pile sur
   l'heure si minutes = 0, strictement entre h et h+1 sinon (voir Q3).
6. Faux : « Tu as placé les aiguilles sur 5 h 45. » (heure lue sur le cadran de l'élève) + le cadran
   juste à côté. Aiguilles inversées → phrase en plus : « La petite aiguille montre les heures. »
7. PDF : le cadran **sans aiguilles** ; l'enfant les dessine. Copie corrigée / verso de flash-card :
   le cadran de l'élève figé, ou le cadran juste.
8. Nom accessible « Horloge à aiguilles » ; jamais l'heure attendue, ni dite ni dans le DOM.

### Limites

- Heure ≥ 13 (CE1 : « 14 h ») : jugée sur le cadran de 12 (14 h = 2 h) ; `cadran: 24` reste permis.
- Une aiguille pas posée → « Tu n'as pas placé la petite aiguille. » ; 12 h : il faut toucher les deux
  aiguilles sur le 12 (elles ne sont pas posées tant qu'elles sont en attente).
- Téléphone : à 4 cm, une minute ≈ 7 px de cercle → trop fin au doigt ; ◀ ▶ compensent. Cadran à
  placer plus grand par défaut (6 cm ?).

### Erreurs (messages au prof)

- `placer:` avec `heure:` → refus ; `placer:` avec `minutes: cachées` → refus ; heure illisible → refus
  (mêmes messages que `heure:`).
- `légendes:` : une seule permise.

### Questions à David

1. **Aiguilles indépendantes** (reco) ou une seule à tourner, la petite suivant (remontoir) ?
2. **Choix de l'aiguille** : étiquettes « petite / grande » + toucher (reco, patron des points A B C) ;
   ou saisir l'aiguille la plus proche du doigt sans étiquettes ?
3. **Jugement de la petite aiguille** : bon secteur (pile sur h si minutes = 0, entre h et h+1 sinon) (reco) ;
   ou position exacte au cran près (9 h 25 → 2 crans après le 9) ; ou à ±1 cran ?
4. **Secondes (CM2-083)** : hors chantier (le bloc n'a pas de trotteuse) (reco), ou trotteuse à ajouter ?
5. **Départ** : aiguilles en attente sur le 12, grisées (reco), ou pas d'aiguille du tout tant que
   l'élève n'a pas touché ?
6. **Taille** : cadran à placer à 6 cm par défaut (reco), ou 4 cm comme les autres ?

## 14. Décisions aiguilles (David, 2026-10-27 : « je valide » les recos)

1. Aiguilles **indépendantes** (pas de remontoir).
2. Étiquettes **« petite aiguille » / « grande aiguille »** + toucher ; glisser une aiguille posée la reprend.
3. Petite aiguille jugée sur le **secteur** : pile sur h si minutes = 0, strictement entre h et h+1 sinon.
   Grande aiguille : la minute exacte.
4. **Secondes (CM2-083) hors chantier** (pas de trotteuse) — reste noté.
5. Départ : aiguilles **en attente sur le 12, grisées** ; une aiguille en attente n'est pas posée.
6. Cadran à placer : **6 cm** par défaut (`taille:` garde la main).

## 15. PR « aiguilles » — horloge à placer (2026-10-27)

Branche `feat/reponses-a-placer-aiguilles`, worktree `ubumaths-wt-reponses-a-placer`. Tests rouges
d'abord : `horloge-placer.test.ts` (parseur, lecture, juge, phrases, PDF),
`generation-horloge-placer.test.ts` (case, réponse, juge), puis `HorlogePlacer.svelte.test.ts`.

- Parseur : `placer: 9 h 25` à la place de `heure:` ; `spec.placer`, `spec.times` vide (un rendu qui
  l'ignore ne dessine pas la réponse), `caseIndex`. Refus : avec `heure:`, avec `minutes: cachées`,
  `;`, plus d'une légende ; `case:` sans `placer:`. `findHorlogesToPlace`, `hasHorlogeToPlace`.
- Calcul pur `utils/horloge-placer.ts` : réponse `'47 25'` (crans petite, grande ; `-` pas posée),
  `readHands` (secteur), `isPlacedTimeCorrect`, `timeText` (`9 h 05`, cadran de 12),
  `handsMistakes` (rien placé, aiguille pas posée, inversées, « sur 5 h 45 », pile / entre à tort).
- Générateur : `BuildKind` gagne `'horloge'` ; case `type: 'text'`, réponse attendue `timeText` ;
  juge à part dans `validateSingleBlank` et `validateBlankValue`.
- Écran : `HorlogePlacer.svelte` (étiquettes, toucher, reprise d'une aiguille posée, ◀ ▶, flèches,
  `role="slider"`) ; `Horloge.svelte` le prend hors question ; `FillBlanksInput`, `BuildAnswer`.
  PDF : cadran sans aiguilles, 6 cm. Page d'aide : réglage `placer`, exemple, erreur type.
- Vu en vrai (port 5177, `teacher@local.test`, `/aide-ecriture/blocs/horloge`, Playwright) : pose
  9 h 25, petite aiguille entre le 9 et le 10. Corrigé : à 375 px, ◀ étiquettes ▶ tenaient sur trois
  lignes → étiquettes, puis ◀ ▶ dessous ; aiguilles en attente plus légères (faisaient une tache).

## 16. Revue Opus de la PR aiguilles (2026-10-27)

- Corrigé : inversion type non nommée (grande sur le 9, petite sur le 5 à 9 h 25) ; légende acceptée
  et imprimée mais absente à l'écran.
- **Q16 (à David)** : avec 60 crans, la vraie place de la petite aiguille tombe sur le cran de l'heure
  à 1-5 minutes (9 h 05 : 45,4 → 45, « pile sur le 9 », refusé) et sur l'heure suivante à 54-59 minutes
  (9 h 55 : 49,6 → 50, refusé) ; le cadran de correction la dessine pourtant là. Reco : accepter aussi le
  cran le plus proche de la vraie place (`round(5h + m/12)`) ; l'erreur type (pile sur le 9 à 9 h 45,
  vraie place 48,75) reste refusée.
- **Q16 validée par David (« je valide »)** : `isPlacedTimeCorrect` accepte aussi `trueHourTick`
  (cran le plus proche de la vraie place) ; tests 9 h 05, 9 h 55, 12 h 05, et 9 h 45 pile sur le 9 refusé.

## 17. Phase 0 — barres (2026-10-27)

### Existant

- Bloc ```barres (genre de `stat-chart`) : lignes `Football = 12` (20 barres au plus), ou série brute
  `données: 12 ; 15 ; 12` (le bloc compte) ; `titre:`, `axes:`, `valeurs: oui`, `afficher: fréquences`,
  `couleur:`, `taille:`. Axe vertical gradué tout seul (pas visé ≈ 40 px). Dessin seul.
- Programme : CP-072 (qualitatif 2 à 5 valeurs, < 40 individus), CE1-088 (< 100, axe gradué de un en
  un), CE2-082 (qualitatif ou quantitatif discret, échelle adaptée), CM1-135 et CM2-121 (recueillir puis
  produire, échelle des axes adaptée aux données).

### Écriture par le prof (proposée)

````text
Construis le diagramme du sport préféré.
```barres
axes: Sport ; Effectif
axe: 0 à 20, de 2 en 2
Football = 12
Natation = {{n}}
Danse = 7
placer: Natation ; Danse
```
````

`placer:` nomme les barres que l'élève construit (`placer: toutes` : toutes) ; les autres sont dessinées.
`axe:` fixe l'axe vertical (obligatoire avec `placer:` : calculé sur les données, il trahirait la plus
grande barre).

### Nominal

1. Les barres à construire sont vides (pointillé au pied de leur colonne) ; les autres, dessinées.
2. Toucher la colonne d'une barre la choisit et monte son haut à la hauteur du doigt ; glisser l'ajuste ;
   boutons ▲ ▼ (un cran, la barre choisie), flèches du clavier. Aimant : l'unité (12 entre deux
   graduations de 2 en 2 : permis, c'est lire l'échelle).
3. Une case par barre à construire (note partielle), réponse = la hauteur (`12`), juge ordinaire.
4. Faux : « Ta barre Danse monte à 9. » par barre fausse, « Tu n'as pas construit la barre Danse. » ;
   le diagramme juste à côté.
5. Avec `données:` (série brute) : l'élève compte puis construit (CP-072, CM1-135 « recueillir »).
6. PDF : axes gradués, noms des catégories, barres à construire absentes ; l'enfant les dessine.
7. Nom accessible sans les effectifs attendus.

### Limites et erreurs (messages au prof)

- Refus avec `placer:` : sans `axe:` ; `valeurs: oui` ; `afficher: fréquences` ; pourcentages ; une
  barre attendue hors de l'axe ou non entière ; un nom de `placer:` absent des données.
- Effectif 0 attendu : permis (▼ jusqu'à 0, la barre est alors « construite »).
- Choisir soi-même l'échelle (CM1, CM2 « échelle adaptée ») : hors de cette PR.

### Questions à David

1. **Écriture** : `placer: Natation ; Danse` (barres nommées, les autres dessinées) et `placer: toutes` (reco) ?
2. **Axe imposé** : `axe: 0 à 20, de 2 en 2` obligatoire avec `placer:` (reco), ou calculé tout seul
   (il trahit la plus grande barre) ?
3. **Aimant à l'unité** même quand l'axe va de 2 en 2 (reco), ou sur les seules graduations ?
4. **Choix de l'échelle par l'élève** (CM1-CM2) : hors de cette PR (reco) ?
5. **Données brutes** (`données:`) permises avec `placer:` (reco : l'élève compte puis construit) ?
6. **Correction** : une phrase par barre fausse + le diagramme juste (reco) ?

## 18. Décisions barres (David, 2026-10-27 : « je te suis » sur les recos)

1. Écriture : **`placer: Natation ; Danse`** (barres nommées, les autres dessinées) et **`placer: toutes`**.
2. **`axe: 0 à 20, de 2 en 2` obligatoire** avec `placer:` (calculé, il trahirait la plus grande barre).
3. **Aimant à l'unité**, même sur un axe de 2 en 2 (7 entre 6 et 8 : lire l'échelle).
4. **Choix de l'échelle par l'élève (CM1-CM2) hors de cette PR** — reste noté.
5. **`données:` (série brute) permis** avec `placer:` : l'élève compte puis construit.
6. Correction : **une phrase par barre fausse** (« Ta barre Danse monte à 9. », « Tu n'as pas construit
   la barre Danse. ») **+ le diagramme juste** à côté ; une case par barre (note partielle).

## 19. PR « barres » — diagramme en barres à construire (2026-10-28)

Branche `feat/reponses-a-placer-barres`, worktree `ubumaths-wt-reponses-a-placer`. Tests rouges
d'abord : `stat-chart/barres-placer.test.ts` (parseur `axe:` / `placer:` / `case:`, repérage, scène sans
les effectifs attendus, calcul pur), `generation-barres-placer.test.ts` (une case par barre, réponse =
l'effectif, copie corrigée : un diagramme, une réponse par barre).

- Parseur : `axe:` (`spec.axis`, `{ max, step }`, depuis 0, au plus 40 graduations, barre trop haute
  refusée), `placer:` (`spec.toPlace`, rangs dans `data`), `case:` (`caseIndex`). Refus de `placer:` :
  sans `axe:`, `valeurs: oui`, pourcentages, deux séries, nom absent ou en double. Effectif décimal :
  déjà refusé à sa ligne (vérification prévue = code mort, retirée). `findBarsToPlace`, `hasBarsToPlace`.
- Scène : `writtenAxis`, barres `toPlace` (description « Danse à construire »). PDF : barres à construire
  absentes. Calcul pur `utils/barres-placer.ts` (`barValueAt` aimant à l'unité, `barMistake`).
- Générateur : `BuildKind` `'barres'`, `buildCaseCount` commun (droite, barres) au générateur et à la
  copie corrigée ; case `math`, réponse = l'effectif. `isPlaceKind` reste droite + horloge : une barre se
  construit (« Tu n'as rien posé. »).
- Écran : `BarresPlacer.svelte` (pris par `StatChart` hors question), `FillBlanksInput`, `BuildAnswer`.
- Vu en vrai (port 5177, `teacher@local.test`, `/aide-ecriture/blocs/statistiques`, Playwright, 1100 et
  375 px) : Danse montée à 7 au doigt. Corrigé : à 375 px le dessin était rogné → la zone défile, comme
  `StatChart` (tous les diagrammes de cette page font 300 px et défilent à 375).
- Revue (Opus) : rien de bloquant sur la correction ni la numérotation. Corrigés, tests rouges d'abord :
  `indicateurs:` + `placer:` refusé (l'effectif total imprimé sur le PDF donnait la barre) ; `placer:`
  cherche le nom exact d'abord (`Lundi` / `lundi`), ambigu sinon. **Q19 (à David)** : grand axe
  (`axe: 0 à 4000, de 100 en 100`) : aimant et ▲ ▼ à l'unité = impossible à viser au doigt. Reco :
  aimant et ▲ ▼ au pas de l'axe quand le pas dépasse 1… mais CE1-088 veut 7 entre 6 et 8 (§ 18.3) ;
  autre reco : plafonner `axe:` avec `placer:` (au plus 100 ?).

## 20. Décision Q19 (David, 2026-10-28 : « je suis ta reco »)

A : avec `placer:`, `axe:` va au plus jusqu'à 100 (CE1-088 : moins de 100 individus) ; l'aimant et ▲ ▼
restent à l'unité. PR `fix/barres-axe-plafond`, test rouge d'abord.

## 21. Phase 0 — étiquettes à ranger (2026-10-28)

### Existant

- 5 modèles « ranger » en prod, tous en cases tapées `$$? < ? < ?$$` (une case par place, note partielle) :
  CP 78a6ba79 « Ranger des nombres » (4), CE1 0e60a71e « Ranger cinq nombres » (5), CM2 7d258acc « Ranger cinq
  grands nombres » (5, brouillon), 6e 83c835bb « Ranger des fractions » (06, 3) et c360d588 « Ranger des nombres
  mixtes » (07, 3). L'élève **recopie** chaque nombre (07 v3 : `7/4` tapé pour `1 + 3/4` → « mauvaise forme »).
- Le désordre affiché est fait à la main : variable `p`/`o` et `{{if:…}}` imbriqués, 4 à 6 permutations.
- Patron le plus proche : la case choix (ADR 0033), bloc ```choix (liste `- …`, ubumark par choix, mélange au
  tirage, réponse = indices d'origine `"0;2"`, `questions/choice-case.ts`).

### Écriture par le prof (proposée)

````text
Range ces nombres dans l'ordre croissant.
```ranger
signe: <
- $\frac{2}{7}$
- $\frac{3}{7}$
- $\frac{6}{7}$
```
````

Le prof écrit les étiquettes **dans le bon ordre** ; le tirage les mélange. `signe: <` (défaut) ou `signe: >`
(décroissant). Chaque étiquette est de l'ubumark (formules, variables). Plus de `p` ni de `{{if:…}}`.

### Nominal

1. Écran : les étiquettes mélangées en haut ; en dessous, les places vides séparées du signe
   (`□ < □ < □`).
2. Geste : glisser une étiquette sur une place ; au doigt ou à la souris, aussi **toucher l'étiquette puis la
   place**. Place déjà prise : les deux étiquettes s'échangent. Toucher une étiquette posée la renvoie en haut.
   Clavier : Tab, Entrée, flèches.
3. Une case par place (note partielle, comme les modèles actuels) ; réponse = l'étiquette posée (indice
   d'origine), jugée par l'étiquette, pas par sa valeur : plus de « mauvaise forme ».
4. Faux : le rangement juste à côté, les places fausses marquées.
5. Mélange : jamais déjà rangé (ni dans un sens ni dans l'autre) ; graine de l'instance, comme le choix.
6. PDF : les étiquettes (mélangées) puis `□ < □ < □` ; l'enfant écrit.
7. Nom accessible : « étiquette 2 sur 3 : deux septièmes », sans trahir l'ordre.

### Limites et erreurs (messages au prof)

- 2 à 8 étiquettes ; deux étiquettes au texte identique : refus (laquelle va où ?).
- Valeurs égales sous deux écritures (`1/2` et `2/4`) : l'outil ne calcule pas ; le prof les évite.
- Étiquette vide, `signe:` inconnu, `case:` écrite à la main : refus.

### Questions à David

1. **Écriture** : bloc ```ranger, étiquettes dans le bon ordre, `signe: <` / `>` (reco) ?
2. **Note** : une case par place, note partielle (reco, comme aujourd'hui), ou tout ou rien ?
3. **Geste** : glisser **et** toucher-toucher, échange si la place est prise (reco) ?
4. **Mélange** jamais déjà rangé, ni à l'envers (reco) ?
5. **Les 5 modèles existants** : cette PR livre l'outil et la page d'aide ; 06 et 07 réécrits par la session
   questions-6 (qui les attend), CP, CE1 et CM2 par la session « questions » (reco) — ou tout ici ?

## 22. Décisions étiquettes à ranger (David, 2026-10-28 : les 5 recos)

1. Écriture : bloc ```ranger, étiquettes dans le bon ordre (ubumark), `signe: <` (défaut) ou `signe: >`.
2. Note : une case par place, note partielle.
3. Geste : glisser **et** toucher-toucher ; place prise → échange ; clavier.
4. Mélange : jamais déjà rangé, ni à l'envers ; graine de l'instance.
5. Cette PR livre l'outil et la page d'aide ; 06 et 07 réécrits par questions-6, CP, CE1, CM2 par la session
   « questions ».
