# Chantier `associer` — geste « associer deux colonnes » (outils-manquants n° 27)

## Reprendre ici

_Mis à jour le 2026-11-14, après #2623._

- **État** : lot 1 mergé (#2623) — bloc ``associer, geste `relier` (défaut, traits) et `geste: étiquettes`, juge, corrigé, PDF, séries, catalogue, docs ; essayé et validé par David. Pas encore en prod (`deploy:prod` sur demande de David) · **Prochaine action** : convertir la n° 11 de `cours-suites` (B11, QCM) en « associer » ; puis lot 2 (blocs ` ``courbe `dans un élément) · **En attente de David** : go pour la suite (B11, puis lot 2) · **Pièges en cours** : ranger garde ses deux défauts hérités (collision, clés) ;`touch-action: none`sur toute la case (à revoir si le défilement gêne sur iPhone) · **Worktree / branche** : aucun (worktree`associer` retiré ; nouveau worktree pour la suite)

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

**Correction de la phase 0 (David, 2026-11-14, après essai)** : David attendait des **traits** entre
les deux colonnes ; la phase 0 ne proposait que la pose d'étiquettes (mon oubli). Tranché (« je suis
tes recos ») :

6. Deux gestes, un seul bloc : réglage `geste: relier` (**défaut**, traits entre deux points) ou
   `geste: étiquettes` (le geste du lot 1, pour les classements et les éléments longs). Bloc, juge,
   corrigé et PDF communs ; seul l'écran change.
7. Dans la même PR (#2623, pas mergée), avant tout merge.

Geste « relier » : éléments à gauche avec un point au bout, étiquettes à droite avec un point devant ;
glisser d'un point à l'autre (trait qui suit le doigt) ou toucher un point puis l'autre, dans les deux
sens ; un trait par élément (un nouveau remplace l'ancien), plusieurs traits possibles vers une
étiquette ; toucher un trait ou le point d'un élément relié efface ; clavier : élément puis étiquette
(Entrée) ; correction : trait faux rouge, bon trait en pointillés verts ; téléphone : deux colonnes,
retour à la ligne, points centrés sur chaque case.

Ensuite : convertir la n° 11 de `cours-suites` (B11, QCM) en « associer ».

## Journal

- 2026-11-14 : worktree ouvert, phase 0 validée.
- 2026-11-14 : lot 1 codé — parseur `associer-parser.ts`, case par élément (`construire: 'associer'`),
  mélange `rangerOrder`, énoncé d'instance sans liens, juge strict, `AssocierPlacer.svelte`, corrigé
  (`BuildAnswer`), PDF (`generateAssocierTypst`, compilation réelle testée), série d'automatismes
  (corrigé « élément → étiquette »), catalogue `/aide-ecriture/blocs/associer`, éditeur riche, garde
  anti-fuite `findUnmaskedAnswers`. Écart à la phase 0 : le `?` dans un élément n'est pas refusé (texte
  courant « Quelle suite ? ») ; seul `[_]` l'est. Revue : étiquettes `+`/`-` vides au PDF (repli en
  chaîne Typst), `->` dans une formule (coupe hors `$…$`), message des doublons écrits, clés `{#each}`,
  garde anti-fuite, test sur la structure.
- 2026-11-14 : geste « relier » (décisions 6-7) — `AssocierRelier.svelte` : SVG par-dessus, points
  mesurés (`ResizeObserver`, attachement), glisser / toucher dans les deux sens, toucher un trait ou un
  élément relié efface, clavier ↑ ↓ ← →, corrigé vert / rouge / pointillés verts ; tests d'écran
  `AssocierRelier.svelte.test.ts` (15) ; anciens tests d'intégration passés à `geste: étiquettes`.
- 2026-11-14 : revue du geste relier (`code-reviewer`) — corrigés : la zone d'un trait masquait le point
  relié (toucher, lâcher impossibles ; cases passées au-dessus du SVG, test rouge sans le correctif),
  Entrée sur un élément relié le reprend (Suppr efface), région `role="status"` toujours présente,
  case prise périmée (verrouillé, bloc modifié), seuil de glissement 10 px et toucher qui bouge sur sa
  case, mesure sous un ancêtre mis à l'échelle, `pointercancel` d'un autre pointeur (les deux gestes).
  Laissés : `touch-action: none` sur toute la case (comme le geste étiquettes ; à revoir si l'essai sur
  iPhone gêne le défilement), verdict signalé par la couleur seule (noms accessibles « juste / faux »).
- 2026-11-14 : #2623 mergée (CI verte), geste relier essayé et validé par David.
