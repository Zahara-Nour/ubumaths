# Chantier `suite-fleches` — suite de flèches à produire (outils-manquants n° 9)

> Demande de David du 2026-11-15 (n° 9 de [`outils-manquants.md`](../../wip/outils-manquants.md)). Point visé : CE1-080
> (« coder un déplacement », volet « produire »). Aujourd'hui, les modèles `08-le-robot-pivote` (e3bacfdc) et
> `09-le-long-code` (8cbd4fb3) du lot 10 de [`questions-ce1`](questions-ce1-progress.md) (§ 3 C 4, l. 807) font
> choisir le bon code parmi trois (QCM). Piste notée alors : glisser-déposer (`StructureField`), **pas Blockly** (le
> BO ne parle que d'un robot « si un robot est disponible », d'aucun logiciel).

## Reprendre ici

_Mis à jour le 2026-11-15 : chantier clos et archivé._

- **État** : **clos**. Lot 1 (#2672, #2680, en prod v0.90.0) et lot 2 (#2687, #2689) livrés ; `856f400e` (flèches, niveau 4) et `c8da0674` (avance-pivote, niveau 5) publiés le 2026-11-15, rangés « coder un déplacement », tag CE1-080 ; n° 9 dans « Livré » d'`outils-manquants.md`. Durable versé : bloc et pièges dans `docs/systeme/ubumark.md` et `questions.md` ; aperçu local par `http://[::1]:<port>` dans `couvrir-un-niveau.md`. Hors chantier, pas ouvert : passer les QCM `e3bacfdc`, `8cbd4fb3` au bloc ```robot (phase 0, Q8) · **Prochaine action** : aucune · **En attente de David** : rien · **Worktree / branche** : `ubumaths-wt-suite-fleches` à retirer dès que la session `questions-5` a repris les 9 id `5-triangles` écrits par erreur dedans ; branches supprimées

## Phase 0 — comportements (à valider)

### Ce qui existe (lu le 2026-11-15)

- **BO** (`transcriptions/cycle-2/CE1-espace.md` l. 127-137) : « comprendre, utiliser et **produire** une suite
  d'instructions qui codent un déplacement » ; robot sur tapis quadrillé, instructions « avancer de »,
  « pivoter d'un quart de tour à droite / à gauche » ; **au plus 15 instructions, dont 4 virages**. Au CP : « avancer
  d'une case », 10 instructions, 2 virages.
- **Modèles actuels** : CP-067 `f7167af7` (`cp-b2/08-robot-quadrillage.json`), CE1 `e3bacfdc` (avance / pivote) et
  `8cbd4fb3` (8 à 15 flèches) : deux variations chacun, « où arrive le robot ? » (choix parmi trois points) et
  « quel code ? » (choix parmi trois codes). Le robot est dessiné à la main dans un bloc ```figure (polygone, points),
  dix tirages écrits en dur par `{{if:k==…}}` : aucun moteur de déplacement.
- **`StructureField`** (`components/structure/`) : glisser des termes / facteurs d'une **expression** mathAST. Rien à
  reprendre pour des cartes d'instructions. L'interaction proche est celle de **`RangerPlacer`** (```ranger) :
  glisser **ou** toucher une étiquette, toucher une étiquette posée la renvoie, clavier, noms accessibles.
- **Tortue** (chantier `blockly`, ```tortue) : blocs Blockly, tracé jugé (`jugerProgrammeTortue`). Autre objet
  (traits, angles, boucles) : on ne s'en sert pas, on n'y touche pas.

### Proposition

Un **bloc ubumark neuf ```robot** : un quadrillage de cases, le robot dans une case (avec son sens en codage
relatif), la case d'arrivée en vert, des cases interdites (grisées) au besoin. Deux usages :

- **affichage** (sans geste) : sert aux questions « où arrive le robot ? » sans dessiner le robot à la main ;
- **`produire: oui`** (geste de réponse, une case) : l'élève compose le code avec des cartes.

Écriture proposée (prof) :

```robot
quadrillage: 8 x 5
codage: flèches            # ou : avance-pivote
départ: 2, 1               # colonne, ligne (1, 1 = case en bas à gauche) ; avance-pivote : départ: 2, 1, droite
arrivée: {{xa}}, {{ya}}
interdites: 4, 1 ; 4, 2    # facultatif
produire: oui
```

**Geste** (à l'écran) : sous le quadrillage, une réserve de cartes jamais épuisée — `←` `↑` `→` `↓` en flèches ;
« avance de … », « pivote à gauche », « pivote à droite » en avance-pivote — et une bande « Mon code » qui se remplit
de gauche à droite. Toucher une carte de la réserve l'ajoute au bout du code ; la glisser l'insère où on la lâche ;
toucher une carte posée la retire ; la glisser la déplace. Boutons « Effacer la dernière » et « Tout effacer ».
« avance de » : une rangée de chiffres 1 à 9 apparaît sous la carte posée ; toucher la carte plus tard rouvre la
rangée (et un bouton pour la retirer). Clavier et noms accessibles comme `RangerPlacer`.

**Juge** : on rejoue le code de l'élève depuis le départ. **Juste** si le robot finit sur la case d'arrivée, sans
sortir du quadrillage ni passer par une case interdite. Tout code juste est accepté (pas seulement celui du prof) ;
le sens final du robot ne compte pas.

**Corrigé** : le chemin de l'élève dessiné sur le quadrillage (vert s'il arrive, rouge sinon, avec l'endroit où il
sort ou bute), et un code juste le plus court (calculé, pas écrit par le prof), avec son chemin en pointillés.

**PDF** : le quadrillage, puis « Écris le code : » et 15 cases vides à remplir à la main.

### Comportements

- **Nominal** : flèches, départ (2, 1), arrivée (6, 4) ; l'élève pose `→ → → → ↑ ↑ ↑` → juste. Il pose
  `↑ ↑ ↑ → → → →` → juste aussi. Avance-pivote, robot vers la droite : « avance de 4, pivote à gauche, avance de 3 »
  → juste.
- **Limite** :
  - code de 15 cartes : accepté ; la 16e carte ne se pose pas (la réserve se grise, message « 15 instructions au
    plus ») ;
  - code juste avec un détour (plus long que le plus court) : juste ;
  - « avance de 0 » impossible (chiffres 1 à 9) ; deux « pivote » de suite : permis ;
  - le robot passe sur la case d'arrivée puis repart : faux (c'est la case où il **finit** qui compte) ;
  - tirage : arrivée ≠ départ, jamais sur une case interdite, et le plus court code existe en 15 instructions et
    4 virages au plus, sinon le tirage est refait (condition implicite, comme les étiquettes en double d'un ranger).
- **Erreur** :
  - code vide : case vide (« Il faut écrire un code. »), comme les autres gestes ;
  - le robot sort du quadrillage : faux, corrigé « Le robot sort du quadrillage ici. » ;
  - il entre dans une case interdite : faux, « Le robot bute sur une case grise. » ;
  - il finit ailleurs : faux, « Le robot arrive ici, pas sur la case verte. » ;
  - bloc mal écrit (quadrillage > 12 × 12 ou < 2, départ ou arrivée hors quadrillage, sur une case interdite, `codage:`
    inconnu, sens absent en avance-pivote, clé inconnue ou en double) : erreur du parseur, comme les autres blocs.

### Questions à David

- **Q1. Geste** : cartes à toucher ou glisser (comme ranger), pas `StructureField`. Recommandation : oui.
- **Q2. Bloc neuf `robot** plutôt que le `figure dessiné à la main. Recommandation : oui (il sert aussi à
  l'affichage).
- **Q3. Juge** : tout code qui finit sur l'arrivée, même long, même avec plus de 4 virages (la limite du BO borne ce
  qu'on demande, pas la réponse de l'élève) ; seule borne : 15 cartes. Recommandation : oui.
- **Q4. Bouton « Essayer »** qui fait rouler le robot avant de valider ? Recommandation : **non** (on évalue
  l'anticipation ; le chemin se voit dans le corrigé). Éventuel `essayer: oui` plus tard pour l'entraînement.
- **Q5. « avance de »** : une carte puis un chiffre 1 à 9. Recommandation : oui (plutôt que neuf cartes
  « avance de 1 » … « avance de 9 »).
- **Q6. Cases interdites** dans le lot 1. Recommandation : oui (sinon tout chemin est un « L » à un virage ; les
  4 virages du BO n'ont de sens qu'avec des obstacles).
- **Q7. Robot dans les cases** (tapis à cases, comme un Bee-Bot), pas aux nœuds du quadrillage comme les dessins
  actuels. Recommandation : oui.
- **Q8. Découpage** : lot 1 = bloc, geste, juge, corrigé, PDF (code, PR) ; lot 2 = deux modèles CE1 « produire »
  neufs (flèches, avance-pivote), brouillons en prod, nœud + tag CE1-080. Les modèles QCM existants restent tels
  quels (leur variation « où arrive ? » reste juste) ; les passer au bloc ```robot = plus tard, hors chantier.
  Recommandation : oui.

Réponse de David (2026-11-15) : « je suis tes recos » — Q1-Q8 tranchées selon les recommandations.

**Question d'accès** : aucune migration au lot 1 ; au lot 2, modèles en brouillon (admin seul) et migration nœud + tag
sans règle d'accès : personne ne lit rien de plus.

## Lot 2 — phase 0 (validée le 2026-11-15)

Deux modèles neufs, lot `ce1-11` (`scripts/questions/ce1-11/`, script `docs/wip/questions/lot-ce1-11.py`),
point **CE1-080**, nœud « Géométrie > Repérage et déplacements > coder un déplacement » (celui de `e3bacfdc` et
`8cbd4fb3`). Bloc ```robot déjà en prod (v0.90.0). Brouillons, délai 120 s (composer un code prend plus long que
choisir parmi trois).

**01 « Écris le code avec des flèches »** (niveau 2) — `codage: flèches`, quadrillage 8 × 5.
Énoncé : « Écris le code qui mène le robot à la case verte. Chaque flèche le fait avancer d'une case dans son sens.
Il ne peut pas entrer dans une case grise. »

- V1 **sans case grise** : départ et arrivée tirés, au moins 5 cases d'écart, pas sur la même ligne ni la même
  colonne (sinon le code est une seule direction).
- V2 **avec un mur** : une des trois dispositions de cases grises écrites en dur (mur vertical, mur en L, deux
  murs), départ et arrivée tirés de part et d'autre ; il faut 2 à 4 virages. Tirage refait si impossible
  (`robotSceneImpossible`).

**02 « Avance et pivote »** (niveau 3) — `codage: avance-pivote`, quadrillage 8 × 5, sens du départ tiré (haut,
droite, bas, gauche).
Énoncé : « Écris le code qui mène le robot à la case verte. Son nez montre où il regarde. « Pivote » le fait
tourner d'un quart de tour sur place, sans changer de case. »

- V1 **sans case grise** : comme 01 V1, le robot ne regarde jamais déjà vers l'arrivée sur un seul axe.
- V2 **avec un mur** : les mêmes dispositions que 01 V2.

**testSpecs** (chaque variation) : le plus court code (juste) ; un code juste avec un détour (juste) ; une case de
trop (faux, « arrive ici ») ; vers le bas depuis la ligne 1 (faux, sortie). V2 : le code tout droit à travers le
mur (faux, case grise). 02 : erreurs typiques du codage relatif — gauche et droite du robot inversées ; « avance »
lu comme une flèche absolue (pas de pivot au départ) : faux.

**Questions**

- **L2-Q1.** Deux variations par modèle (sans / avec cases grises), plutôt qu'un modèle par cas ? Recommandation :
  oui (même point, même geste ; le mur est la difficulté du BO, « 4 virages »).
- **L2-Q2.** Niveaux 2 (flèches) et 3 (avance-pivote), comme `e3bacfdc` (2) et `8cbd4fb3` (3) ? Recommandation : 2
  et 3 (le codage relatif est le plus dur).
- **L2-Q3.** Quadrillage 8 × 5 sur les deux modèles (tient sur un téléphone, distance la plus longue 11) ?
  Recommandation : oui.

Réponse de David (2026-11-15) : « tes recos ? » puis « oui » (L2-Q1 à L2-Q3). Niveaux : 1 à 3 déjà pris dans la
rubrique (CP `f7167af7`, `e3bacfdc`, `8cbd4fb3`) → David : **4 et 5** (au lieu de 2 et 3).

**Question d'accès** (déjà tranchée, phase 0 Q8) : modèles en brouillon (admin seul) ; migration nœud + tag sans
règle d'accès, personne ne lit rien de plus.

## Journal

- 2026-11-15 : worktree ouvert. À reporter dans la 1re PR : le commentaire d'en-tête de
  `src/lib/questions/construction/__tests__/construction-triangle-cm.test.ts` pointe encore vers
  `docs/wip/triangle-cote-cm-progress.md`, archivé le 2026-11-15 sous `docs/archive/wip/`.
- 2026-11-15 : code lu (modèles robot CP / CE1, `RangerPlacer`, `StructureField`, tortue) ; phase 0 écrite, en
  attente de David.
- 2026-11-15 : David : « je suis tes recos » (Q1-Q8). Découpage du lot 1, calqué sur la tortue : PR 1a = bloc
  ```robot en question sans écran (`robot-moteur.ts`, `robot-answer.ts`, `robot-parser.ts`, câblage aux endroits
  de ``calcul, tirage refait si la scène est impossible : `robotSceneImpossible`) ; PR 1b = écran (carte du geste,
  corrigé, PDF, catalogue). Renvoi de `construction-triangle-cm.test.ts` corrigé (journal archivé).
- 2026-11-15 : revue de la PR 1a (`code-reviewer`, Opus) : 7 findings, aucun bug du juge ni du parcours. Corrigés :
  `{{random:` refusé dans un robot à produire (vérifié sur une autre source que le tirage réel) ; seules les
  erreurs de tirage (aucun code, case grise, arrivée au départ) font refaire le tirage ; série d'automatismes
  refuse le robot tant qu'il n'a pas de PDF ; saisie tolérante (flèches collées, « a », NFD, point final) ; plus
  grande avance d'abord ; `interdites:` à `;` final. **À faire en PR 1b** : la copie corrigée reçoit
  `expected` = la chaîne complète `<scène> | <code>` : le rendu passe par `readExpectedRobotAnswer().solution`,
  test qui asserte le TEXTE montré.
- 2026-11-15 : #2672 mergée (PR 1a), CI verte du premier coup.
- 2026-11-15 : PR 1b écrite. Écran : `RobotCode.svelte` (réserve, bande « Mon code », glisser = insérer
  avant / après la carte sous le doigt, « avance de » sans chiffre = réponse vide mais carte gardée :
  `dernierGeste` non réactif relu par le dérivé modifiable `cartes`), `RobotQuadrillage.svelte`
  (pointillés du code juste PAR-DESSUS le trajet de l'élève, sinon cachés là où ils se recouvrent),
  `RobotCorrige.svelte`. PDF vérifié à l'œil (compilation typst.ts réelle) : quadrillage, case verte à
  bord épais, 15 cases (8 par rangée en flèches, 3 larges en avance-pivote) ; les flèches ← ↑ → ↓
  existent dans Shantell Sans et Chiphre Math (cmap lue). Série d'automatismes : refus levé,
  `robotsAFiger` (énoncé sans `case:`, corrigé sans `produire:` + « Un code juste : **…** »).
- 2026-11-15 : revue de la PR 1b (`code-reviewer`, Sonnet) : aucun bloquant ; `robotsAFiger`, Typst, corrigé
  (code seul), glisser (index, `deplacer`) vérifiés justes. À corriger : (1) `cartes` gardées par
  `dernierGeste` quand la case repasse à `''` sans geste (même source, autre question) → remettre à
  zéro ; (2) insérer / déplacer impossible au clavier → « déplacer à gauche / à droite » sur la carte
  choisie ou Alt + flèches ; (3) focus perdu (15e carte grise le bouton, rangée de chiffres démontée,
  ouverte sans focus) ; (4) `swallowClick` remis à faux par `setTimeout` : le remettre au `pointerdown`
  seulement ; (5) `onPointerCancel` sans filtre `pointerId` ; (6) fantôme `position: fixed` décalé sous
  un ancêtre `transform` (carte flash) : à regarder ; (7) tests manquants : deux robots / robot après
  trous dans une série, glisser dans la bande, glisser vers la réserve, chiffres après retrait.
- 2026-11-15 : findings de la revue 1b corrigés. (1) `FillBlanksInput` : `{#key blanks}` dans
  `{#key node.source}` — même bloc, question suivante → le bloc repart de la case (le `dernierGeste`
  d'un « avance de » sans chiffre, réponse `''`, ne survit plus) ; (2) Alt + ← → déplace la carte
  posée (`aria-keyshortcuts`) ; (3) focus suivi : carte déplacée, voisine d'une carte retirée, réserve
  quand la bande se vide, carte posée à la 15e, 1er chiffre (ou le posé) à l'ouverture, carte à la
  fermeture (chiffre, Échap) ; (4) `swallowClick` remis à faux au `pointerdown` seulement, un clic
  clavier (`detail === 0`) jamais avalé ; (5) `pointercancel` filtré par `pointerId` ; (6) écarté : en
  flash la case est verrouillée (aucun glisser), seul `fadeIn` 0,3 s transforme la carte ; (7) tests :
  glisser dans la bande et vers la réserve, rangée de chiffres fermée à l'effacement, clavier, focus,
  autre question (FillBlanksInput), deux robots / robot après des trous dans une série. 6 tests
  vérifiés rouges sans les correctifs.
- 2026-11-15 : PR 1b mergée (#2680), CI verte (après refusion de `origin/main`, conflit d'en-tête de
  `docs/systeme/questions.md` : les deux ajouts gardés). Lot 1 clos ; lot 2 sur `feat/suite-fleches-2`.
- 2026-11-15 : lot 2, phase 0 validée (niveaux 4 et 5). Script `docs/wip/questions/lot-ce1-11.py` →
  `scripts/questions/ce1-11/` : V1 par variables + conditions, V2 = 12 scènes précalculées (3 murs × 4) tirées
  par `k` ; 15 specs par modèle, vérifiées par un petit moteur Python ET par le juge réel (simulation verte ; deux
  specs faussées exprès → refus). Essai en base locale et aperçu admin (`http://[::1]:5176` : `localhost` porte
  la session de David) : flèches juste / faux (« n'arrive pas », code juste montré), mur (croix rouge sur le
  gris, trajet juste en pointillés), avance-pivote juste (nez vers le haut lisible). Étape « droite ou gauche,
  **puis** haut ou bas » réécrite en « et » (le corrigé peut monter d'abord).
- 2026-11-15 : #2687 mergée (CI verte). David : brouillons créés en prod. #2689 (id, migration générée par
  `docs/archive/wip/suite-fleches/lot-2-rangement.py` sur le gabarit 5e lot 12, relevé `etat-prod-2026-11-15-lot2/`,
  test d'intégration 19 verts / 8 rouges sans la migration, `security-auditor` sans bloquant) mergée. Dépôt principal
  bloqué par des fichiers d'autres sessions ; entre-temps le `db:migrate` de la session `blockly` a appliqué notre
  migration (note de cette session, intégrée ici). Vérifié par MCP. Page à cocher publiée, verdicts vides.
- 2026-11-15 : relecture de David : 2/2 OK. `publier-lot.ts` en simulation vert ; David a publié ; relu en base : `published`, niveaux 4 et 5. N° 9 d'`outils-manquants.md` passé dans « Livré ».
- 2026-11-15 : chantier clos (go de David) : journal et `suite-fleches/` archivés ; session `questions-5` prévenue des 9 id `5-triangles` égarés dans le worktree.
