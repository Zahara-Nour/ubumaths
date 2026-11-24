# Chantier `labyrinthe` : grille de nombres à parcourir (outil n° 53)

Né de [droite-zoom](droite-zoom-progress.md) (prochaine action) et des relevés
`idees-3e-arithmetique` (3A10-7) et `idees-6e-entiers-decimaux` (6N1A-4, 6-101). Ligne n° 53 de
[outils-manquants.md](outils-manquants.md).

## Reprendre ici

_Mis à jour le 2026-11-24, phase 0 validée._

- **État** : phase 0 validée (« je suis tes recos ») ; PR 1 (bloc, juge, écran, PDF) en cours ·
  **Prochaine action** : tests rouges du bloc ` ```labyrinthe ` sur le modèle du bloc robot ·
  **En attente de David** : rien · **Pièges en cours** : aucun ·
  **Worktree / branche** : `ubumaths-wt-labyrinthe`, `feat/labyrinthe`.

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

## Historique

- 2026-11-24 : phase 0 validée ; worktree créé.
