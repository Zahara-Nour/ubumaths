# Chantier `suite-fleches` — suite de flèches à produire (outils-manquants n° 9)

> Demande de David du 2026-11-15 (n° 9 de [`outils-manquants.md`](outils-manquants.md)). Point visé : CE1-080
> (« coder un déplacement », volet « produire »). Aujourd'hui, les modèles `08-le-robot-pivote` (e3bacfdc) et
> `09-le-long-code` (8cbd4fb3) du lot 10 de [`questions-ce1`](questions-ce1-progress.md) (§ 3 C 4, l. 807) font
> choisir le bon code parmi trois (QCM). Piste notée alors : glisser-déposer (`StructureField`), **pas Blockly** (le
> BO ne parle que d'un robot « si un robot est disponible », d'aucun logiciel).

## Reprendre ici

_Mis à jour le 2026-11-15, PR 1a en cours._

- **État** : phase 0 validée (Q1-Q8 selon les recos) ; PR 1a (bloc `robot en question : moteur, parseur, juge, câblage, sans écran) codée, tests verts, docs à jour, revue en cours · **Prochaine action** : findings de revue → PR 1a ouverte, CI, merge ; puis PR 1b (écran : carte du geste, corrigé, PDF, catalogue) · **En attente de David** : rien · **Pièges en cours** : sans écran, un bloc `robot ne s'affiche pas et le PDF n'imprime rien jusqu'à la PR 1b ; zsh ne découpe pas une variable (tableau `F=(…)` puis `"${F[@]}"`) ; code en dehors de `blockly` · **Worktree / branche** : `ubumaths-wt-suite-fleches` (`feat/suite-fleches`)

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
