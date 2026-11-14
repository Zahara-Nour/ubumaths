# Chantier `associer` — geste « associer deux colonnes » (outils-manquants n° 27)

## Reprendre ici

_Mis à jour le 2026-11-14, phase 0 validée._

- **État** : phase 0 validée (David, 2026-11-14, « je valide ») ; lot 1 en cours sur `feat/associer` · **Prochaine action** : parseur + tests, puis générateur, juge, écran, PDF · **En attente de David** : rien · **Pièges en cours** : — · **Worktree / branche** : `../ubumaths-wt-associer`, `feat/associer`

## Phase 0 (validée le 2026-11-14)

Le prof écrit :

````
```associer
- $u_{n+1} = u_n + 3$ -> arithmétique
- $u_{n+1} = 2u_n$ -> géométrique
- $u_n = 5 + 2n$ -> arithmétique
- -> ni l'une ni l'autre
```
````

Une ligne = un élément de gauche → sa bonne étiquette de droite ; `- -> …` = intrus à droite.

**Nominal**

1. Éléments de gauche dans l'ordre écrit, chacun suivi d'une place vide ; au-dessus, les étiquettes
   de droite, chacune une fois, mélangées (jamais l'ordre écrit).
2. Geste de « ranger » : glisser l'étiquette sur la place, ou toucher l'étiquette puis la place ;
   toucher une étiquette posée la retire ; clavier Tab, Entrée, flèches, Échap.
3. Une étiquette reste disponible après avoir été posée (réutilisable).
4. Une case par ligne de gauche (note partielle) ; juge : l'étiquette posée, égalité stricte.
5. Corrigé : places vertes / rouges, la bonne étiquette sous une place fausse.
6. Toutes les formes de série, contrôles compris ; Valider grisé tant qu'une place est vide.
7. PDF : deux colonnes avec un point « • » au bout de chaque élément (relier au crayon) ; corrigé
   PDF : la bonne étiquette en face de chaque élément.
8. Texte, formules et variables dans les éléments.

**Limite** : deux éléments peuvent partager la bonne étiquette ; deux éléments identiques au
tirage → tirage refait ; téléphone : une colonne (étiquettes en haut, une rangée « élément |
place » par ligne) ; hors question (cours, aide, aperçu) le geste marche, rien n'est jugé.

**Erreur (message au prof)** : moins de 2 ou plus de 8 éléments ; plus de 10 étiquettes ; ligne
sans `->`, étiquette vide, case (`[_]`) dans un élément ; moins de 3 étiquettes différentes.

**Tranché (David, 2026-11-14, « je valide » sur les recommandations)** :

1. Étiquette toujours réutilisable (classements compris).
2. Lot 1 : texte et formules ; lot 2 : blocs (` ```courbe `) dans un élément.
3. Notation partielle, une case par ligne.
4. Écriture `->`.
5. Nom du chantier et du bloc : `associer`.

Ensuite : convertir la n° 11 de `cours-suites` (B11, QCM) en « associer ».

## Journal

- 2026-11-14 : worktree ouvert, phase 0 validée.
