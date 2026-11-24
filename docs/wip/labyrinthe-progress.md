# Chantier `labyrinthe` : grille de nombres à parcourir (outil n° 53)

Né de [droite-zoom](droite-zoom-progress.md) (prochaine action) et des relevés
`idees-3e-arithmetique` (3A10-7) et `idees-6e-entiers-decimaux` (6N1A-4, 6-101). Ligne n° 53 de
[outils-manquants.md](outils-manquants.md).

## Reprendre ici

_Mis à jour le 2026-11-24, après #3112._

- **État** : tout le chantier est mergé : bloc (#3084), modèles (#3094, rangement #3102, publiés),
  grille sur téléphone (#3112 : cases de 34 px, refus des grilles trop larges, `pnpm voir --petit`)
  · **Prochaine action** : après le `deploy:prod` qui livre #3112, versement du chantier (durable
  déjà dans `docs/systeme/ubumark.md` ; journal en archive, n° 53 et 61 d'`outils-manquants.md` en
  « Livré ») · **En attente de David** : confirmer 34 px (au lieu des 36 annoncés, pour garder 7
  colonnes de premiers) ; `deploy:prod` · **Pièges en cours** : tirage figé (test « golden ») ;
  chemins des specs par `labyrinthe-chemins.ts` · **Worktree / branche** : aucun.

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

## PR 2 : les modèles

Phase 0 validée par David le 2026-11-24 (« go » après ses « tes recos ? ») :

- **M1 (3e)** « Le labyrinthe des nombres premiers », sans point, nœud Arithmétique > Nombres
  premiers > primalité (comme F4) ; 150 s, niveau 5 ; grilles 5 × 4 et 6 × 5.
- **M2 (6e, 6-101)** « Le labyrinthe du chiffre d'un rang », nœud Nombres et calculs > Entiers :
  numération > décomposition ; 120 s, niveau 4 ; entiers (unités à unités de mille, 5 × 4),
  décimaux (dixièmes à millièmes, 5 × 4), mélange (tous les rangs, 4 × 5) ; chiffre de 1 à 9.
- Deux modèles neufs (pas de variation ajoutée à F4 ni à 4d825d44 : un modèle n'a qu'une durée).
- Pas de réglage de la forme des nombres (question restée ouverte après la PR 1, tranchée : non).
- Question d'accès : personne ne gagne d'accès (rangement et tag seulement).
- **Écart à la phase 0, tranché par David** : 7 × 5 (M1) et 6 × 5 (M2) débordaient sur iPhone
  (vu avec `pnpm voir` sur des modèles d'essai locaux, supprimés ensuite) → 6 × 5 et 4 × 5 ; le
  défaut du bloc est noté au n° 61 de `outils-manquants.md`.

Écrit : `docs/wip/questions/labyrinthe-modeles.py` → `scripts/questions/labyrinthe-modeles/` ;
`scripts/questions/labyrinthe-chemins.ts` remplace les marques `A_CALCULER` des specs par le chemin
de la graine 0 (bon chemin, sans sa fin, sans son début). Pas d'erreurs prévues : le juge dit
lui-même pourquoi un chemin est faux.

## PR 3 : la grille sur téléphone (outils-manquants n° 61)

Phase 0 validée par David le 2026-11-24 : largeur visée 375 px (iPhone SE) ; refuser à l'auteur
une grille trop large plutôt que la réduire en silence.

- Mesuré à 375 px (Playwright, carte de l'aperçu admin : 273 px pour la grille) sur 25 grilles
  (5 longueurs de nombres × 3 à 7 colonnes). Cases à 36 px : 7 colonnes de `137` débordaient de
  9 px ; à 34 px elles tiennent. **Écart à la phase 0** (36 px annoncés) : à confirmer par David.
- Seuils (`colonnesSurTelephone`, d'après `nombreLePlusLong`) : 7 colonnes jusqu'à 3 caractères,
  5 de 4 à 6, 4 au-delà ; les 15 grilles acceptées tiennent (mesuré), vu à l'écran (7 × 5 premiers).
- Refus aussi pour un bloc d'affichage ; tests PDF ramenés aux grilles les plus larges acceptées.
- `pnpm voir --petit` (iPhone SE, 375 px) ajouté pour mesurer.
- Revue `code-reviewer` : aucun bloquant ; double message (lignes hors bornes) corrigé.
- Seuls les deux modèles publiés utilisent le bloc en prod ; ils restent acceptés (1 500 tirages).

## Historique

- 2026-11-24 : phase 0 validée ; worktree créé.
- 2026-11-24 : #3084 mergée (PR 1, l'outil).
- 2026-11-24 : PR 2, phase 0 validée ; lot écrit, grilles réduites (débord iPhone).
- 2026-11-24 : #3094 mergée (PR 2, fichiers des modèles).
- 2026-11-24 : brouillons créés en prod par David ; #3102 mergée (rangement), `db:migrate` fait.
- 2026-11-24 : les deux modèles publiés par David (vérifié en base).
- 2026-11-24 : PR 3 (largeur sur téléphone) écrite, revue faite.
- 2026-11-24 : #3112 mergée (PR 3, grille sur téléphone).
