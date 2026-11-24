# Chantier `labyrinthe` : grille de nombres à parcourir (outil n° 53)

Né de [droite-zoom](droite-zoom-progress.md) (prochaine action) et des relevés
`idees-3e-arithmetique` (3A10-7) et `idees-6e-entiers-decimaux` (6N1A-4, 6-101). Ligne n° 53 de
[outils-manquants.md](outils-manquants.md).

## Reprendre ici

_Mis à jour le 2026-11-24, après #3084._

- **État** : PR 1 (bloc ` ```labyrinthe `, juge, écran, PDF, série, catalogue) mergée (#3084) ·
  **Prochaine action** : PR 2, les modèles : 3e (3A10-7, nombres premiers) et 6e, 6-101 (6N1A-4,
  chiffre d'un rang) ; phase 0 courte d'abord (énoncés, tailles de grille, nœuds) ·
  **En attente de David** : dire s'il veut un réglage de la forme des nombres (règle « chiffre ») ·
  **Pièges en cours** : ne jamais changer le tirage (`tirerLabyrinthe`, `piocher`, `utils/random.ts`)
  sans le décider : test « golden » ; seule la graine est gardée dans l'énoncé ·
  **Worktree / branche** : aucun (à créer pour la PR 2).

## Phase 0 (2026-11-24, validée par David : « je suis tes recos »)

Besoin : une grille de cases à nombres ; l'élève va de l'entrée à une sortie en ne passant que par
les cases qui suivent une règle. 3e (3A10-7 : nombres premiers) ; 6e, 6-101 (6N1A-4 : chiffre des
centièmes égal à 7). Chez eux : deux nombres à taper (numéro de sortie, nombre de cases), pas de clic.

````text
Trouve la sortie en ne passant que par des nombres premiers.

```labyrinthe
grille: 6 x 4
règle: premier
parcourir: oui
```
````

Le bloc tire un chemin de l'entrée (à gauche) à l'une des sorties numérotées (à droite), y met des
nombres qui suivent la règle, et partout ailleurs des nombres qui ne la suivent pas, choisis pour
tromper (91, 51 pour « premier » ; le 7 à un autre rang pour « chiffre des centièmes = 7 »). Dessin :
le quadrillage du robot.

- Cas normal : l'élève touche les cases une à une, chacune voisine de la précédente (haut, bas,
  gauche, droite) ; le chemin se colore ; toucher la dernière case l'efface. Jugé sur la règle :
  juste s'il part de l'entrée, arrive à une sortie et ne passe que par de bonnes cases. Corrigé : le
  bon chemin en couleur. PDF : grille imprimée, l'élève trace au crayon ; corrigé imprimé avec le
  chemin.
- Limites : 2 à 7 lignes, 3 à 7 colonnes ; le chemin ne se touche jamais lui-même (un seul bon
  chemin) ; case assez grande pour le doigt sur téléphone.
- Erreurs d'auteur : règle inconnue, grille hors bornes, `parcourir:` dans un item de liste ou un choix.
- **Q1** nom du chantier : `labyrinthe` (reco suivie).
- **Q2** réponse : l'élève **trace le chemin** en touchant les cases, jugé sur le chemin (reco suivie).
- **Q3** règles du départ : `premier`, `multiple de n`, `chiffre des <rang> = c` (dix-millièmes à
  dizaines de mille) ; une autre quand un point la demandera (reco suivie).
- **Q4** découpage : **PR 1 le bloc, le juge, l'écran et le PDF ; PR 2 les modèles** (3e premiers ;
  6e, 6-101, chiffre d'un rang) (reco suivie).

## PR 1 : l'outil

- Tests écrits avant le code (moteur, parseur, juge : rouges faute de module), puis verts : 27 (moteur,
  parseur, juge), 5 (PDF, compilation réelle), 14 (génération), 4 (éditeur riche), 1 (série), 9 (écran).
- Code : `types/labyrinthe.ts`, `utils/labyrinthe-moteur.ts` (règles, tirage du chemin et des
  nombres), `parser/labyrinthe-parser.ts` (`avecGraines`), `utils/labyrinthe-answer.ts` (juge,
  `cheminDit`), `generators/labyrinthe-typst.ts`, `Labyrinthe.svelte` / `LabyrintheGrille.svelte` /
  `LabyrintheCorrige.svelte`, branchés là où le robot l'est (générateur, juge, copie corrigée, série
  d'automatismes, éditeur riche, catalogue `block-catalog/labyrinthe.ts`).
- Choix faits en route (dans le cadre de la phase 0) : graine posée par le générateur dans le bloc
  (chaque instance a son labyrinthe) ; `solution: oui` pour le corrigé imprimé et le cours ; seules
  les cases voisines de la dernière sont touchables (pas de saut possible à l'écran, le juge le
  refuse quand même) ; forme des nombres d'une règle « chiffre » fixée par le rang (pas de réglage).
- Vu à l'écran (`pnpm voir /aide-ecriture/blocs/labyrinthe --compte prof`, iPhone) : 1er essai,
  grille de 6 colonnes coupée et décimaux qui débordaient → colonnes à la largeur des nombres,
  police réduite dès 4 et 6 caractères ; revu, tout tient (5 colonnes de décimaux comprises).
- Revue `code-reviewer` (Opus) : aucun bloquant ; force brute sur 45 900 grilles (toutes tailles,
  règles, rangs) : chemin unique, juge juste. Corrigés : test « golden » qui fige le tirage de 3
  graines (seule la graine est gardée dans l'énoncé, le juge lit le chemin de la réponse attendue) ;
  `solution: non` de l'auteur doublée au corrigé de série ; `expectedAnswerLatex` = le chemin (une
  réponse juste, contrat de `check-template`) au lieu de « Sortie N : … » ; cases verrouillées
  restées boutons (le focus ne retombe plus sur la page).

## Historique

- 2026-11-24 : phase 0 validée ; worktree créé.
- 2026-11-24 : #3084 mergée (PR 1, l'outil).
