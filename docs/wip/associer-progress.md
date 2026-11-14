# Chantier `associer` — geste « associer deux colonnes » (outils-manquants n° 27)

## Reprendre ici

_Mis à jour le 2026-11-14, après #2644._

- **État** : modèles 2de `2de-associer-courbes/01` (sans point) et 3e `3-associer-droites/01` (3-067) mergés (#2644) ; `sonde-courbes` lit les courbes d'un bloc associer · **Prochaine action** : après le `deploy:prod` (lot 2 pas encore en prod), David lance `create-questions --publier` des deux dossiers ; commiter les `id` écrits ; puis PR de migration nœud + tag (3e : 3-067 sur « coefficient directeur et ordonnée à l'origine » ; 2de : rangé sous Généralités sur les fonctions, sans tag — vérifier la garde « notion sans sous-notion ») · **En attente de David** : `deploy:prod`, puis publication des brouillons · **Pièges en cours** : `{{eval:(a)*x+(b)}}` réordonne (`3-2x`) → `{{eval:(a)*x}}{{eval:b;+}}` ; la publication en base locale écrit des `id` locaux dans les fichiers (ne pas les commiter) · **Worktree / branche** : `ubumaths-wt-associer` gardé pour l'essai de David (serveur 5178 + Tailscale Serve), à retirer ensuite

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

## Phase 0 du lot 2 — un bloc ` ```courbe ` dans un élément (validée le 2026-11-14)

Le prof écrit (même convention que le bloc ` ```choix ` : suite de l'élément en retrait de 2 espaces,
clôture ```` du bloc associer dès qu'un élément contient un bloc) :

`````
````associer
- ```courbe
  f(x) = 2x + 1
  ```
  -> $x \mapsto 2x + 1$
- ```courbe
  f(x) = -x + 3
  ```
  -> $x \mapsto -x + 3$
- ```courbe
  f(x) = x^2
  ```
  -> $x \mapsto x^2$
- -> $x \mapsto x + 3$
````
`````

Le lien `-> étiquette` va sur la dernière ligne de la suite (en retrait) ; sur la première ligne, rien
ou un texte court (« Courbe A »).

**Nominal**

1. Un élément peut contenir un bloc ` ```courbe ` (tous ses réglages, variables résolues au tirage),
   avec ou sans texte autour ; les étiquettes restent sur une ligne (texte, formules).
2. Écran, geste `relier` : la courbe en petit (largeur fixe, ~ 180 px) dans la case de l'élément, le
   point au bout centré sur la case ; geste `étiquettes` : la place à droite de la courbe.
3. Juge, case par élément, corrigé à l'écran : inchangés (on juge l'étiquette posée).
4. PDF énoncé : la courbe en petit dans la colonne de gauche, le point « • » en face ; corrigé PDF :
   la bonne étiquette en face de chaque courbe.
5. Série d'automatismes (corrigé « élément → étiquette ») : les éléments sont numérotés à l'énoncé
   (« 1 », « 2 »… sous chaque courbe) et le corrigé dit « 1 → étiquette ».
6. Tirage refait si deux éléments sont identiques (comparaison du texte de l'élément après tirage,
   bloc compris).

**Limite** : téléphone : deux colonnes gardées, la courbe rétrécit (pas en dessous de ~ 130 px) ;
hors question (cours, aide, aperçu) le geste marche, rien n'est jugé ; éditeur riche : le bloc est
gardé tel quel (comme aujourd'hui).

**Erreur (message au prof)** : bloc autre que ` ```courbe ` dans un élément ; bloc dans une
étiquette ou un intrus ; élément à bloc sans `-> étiquette` en fin de suite ; bloc ` ```courbe `
en erreur (son message, préfixé « élément N ») ; courbe à geste (`placer:`, `tracer:`) dans un
élément (elle porterait une case) ; bloc associer à ``` alors qu'un élément contient un bloc.

**Questions (recommandations en premier)**

1. Les courbes à gauche seulement (étiquettes = texte) **(reco)** ; ou aussi à droite.
2. ` ```courbe ` seul **(reco)** ; ou aussi les autres blocs d'affichage (` ```figure `, barres,
   ` ```variation `…).
3. Limite d'éléments à bloc : 6 **(reco, 8 courbes = page très haute)** ; ou 8 comme aujourd'hui.
4. Série d'automatismes : éléments numérotés **(reco)** ; ou refus des éléments à bloc dans les
   séries.

**Tranché (David, 2026-11-14, « je valide »)** : 1. courbes à gauche seulement ; 2. ` ```courbe ` seul
pour ce lot, les autres blocs d'affichage plus tard (à noter dans `outils-manquants.md`) ; 3. au plus 6
éléments dès qu'un élément contient un bloc ; 4. séries d'automatismes : éléments numérotés.
Niveau du modèle « graphique ↔ expression » : **pas encore répondu**, à reposer.

Ensuite (même chantier) : un modèle « graphique ↔ expression » à écrire, niveau à choisir par David.

## Modèles « courbe ↔ expression » : décisions (David, 2026-11-14)

Relevé prod (MCP, lecture seule) : en 2de, aucun point « fonctions de référence » ; 2-334 (carré) et
2-335 (inverse) ont chacun « définition et courbe » ; 2-363 (racine ↔ carré sur ℝ⁺, approfondissement)
0 modèle ; le cube n'a aucun point de courbe. En 3e : 3-044 (notion Fonctions affines), 3-045 et 3-067
(sous-notion « coefficient directeur et ordonnée à l'origine »).

- **2de** : la décision **l2-2** (2026-10-22 : racine carrée et cube sans définition ni courbe en 2de)
  contredisait le modèle prévu (carré, inverse, racine, cube). Tranché : **recentrer** sur les fonctions
  de référence de 2de — courbes de $x^2$, $1/x$, $|x|$ et $x \mapsto x$, intrus $x \mapsto -x^2$, sans
  variables, geste relier, niveau 1, 60 s — et **sans tag** (aucun point ne le décrit en entier,
  ADR 0020), rangé sous Fonctions > Généralités sur les fonctions. Deux variations (deux ordres des
  courbes : l'ordre de gauche est celui écrit).
- **3e** : point **3-067**. Trois droites $x \mapsto ax+b$, $a \in \{-3…3\} \setminus \{0\}$,
  $b \in \{-4…4\} \setminus \{0, a\}$ ; variation 1 : $ax+b$, $-ax+b$, $ax-b$ ; variation 2 : $ax$,
  $ax+b$, $-ax+b$ ; intrus $bx+a$ ; geste relier, niveau 1, 60 s.
- Question d'accès de la future migration de rangement : personne ne gagne de lecture (brouillons neufs).

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
- 2026-11-14 : B11 de `cours-suites` convertie (branche `feat/associer-b11`) : 2 variations de 4 situations + intrus « ni l'une ni l'autre », `geste: étiquettes` (classement, David : « je te suis »), délai 60 s, 6 specs ; `create-questions --mettre-a-jour` réécrit désormais aussi le délai. Mise à jour du brouillon en prod : par David.
- 2026-11-14 : #2629 mergée ; `create-questions --publier --mettre-a-jour` lancé par David (1 mis à jour, 29 identiques), vérifié par MCP.
- 2026-11-14 : lot 2 — worktree `associer` (branche `feat/associer-courbe`), phase 0 écrite.
- 2026-11-14 : lot 2 codé — parseur (entrées + suite en retrait, `readContinuation`, clôture ````,
  `ASSOCIER_FENCE_MESSAGE`, `ASSOCIER_MAX_BLOCK_ITEMS` = 6), `serializeAssocierBlock` sur plusieurs
  lignes, `findAssociersToPlace` garde les lignes intactes (le retrait comptait) et rend `endIndex`,
  `assignBlankIndices` écarte une courbe à placer dans un associer (message du bloc associer), PDF
  numéroté + courbe `petite`, série « 1 → étiquette », cadres de réponse (une figure par rangée à courbe),
  `AssocierContenu.svelte` (courbe ≤ 180 px, sans `pointer-events`), colonne de gauche 1,4 fr quand un
  élément a un bloc (téléphone : le point ne mord plus la courbe), catalogue (exemple + erreur).
  Écarts à la phase 0 : les erreurs propres d'une courbe (fenêtre manquante…) s'affichent sur la courbe,
  pas en « élément N : … » du bloc associer (le parseur ne relit pas la courbe : variables non résolues
  dans le modèle) ; compilation Typst réelle d'une courbe impossible en test (paquet cetz, réseau).
  **Bug du lot 1 trouvé et corrigé** : dans l'énoncé d'une série d'automatismes, le bloc associer est
  dans un item de liste, que `parseContentWithCodeBlocks` lisait en bloc de code (PDF : code brut) ;
  test rouge sans le correctif.
- 2026-11-14 : revue `code-reviewer` (opus) — « prêt pour PR », corrigés : bloc à ``` avec une courbe coupé
  par `findAssociersToPlace` (lignes désimbriquées : la clôture en retrait de la courbe fermait le bloc ;
  le générateur donnait d'autres messages que l'aperçu) → blocs du premier niveau cherchés sur les lignes
  intactes, message de clôture posé par `assignBlankIndices` ; texte sur plusieurs lignes sans bloc
  accepté → refusé ; réglage en retrait après un élément → message sur le retrait.
- 2026-11-14 : PR #2637 ouverte. Modèle « courbe ↔ expression » : 2de retenue (recos acceptées par
  David) ; second modèle 3e : question ouverte.
- 2026-11-14 : #2637 mergée (CI verte après relance d'un job d'intégration tombé sur un port pris). Second modèle 3e (affines à coefficients tirés) : « ok » de David.
- 2026-11-14 : PR de contenu — worktree `associer` rouvert (branche `feat/associer-modeles-courbes`), relevé, décisions ci-dessus, deux modèles écrits ; `sonde-courbes` ne voyait pas les courbes décalées d'un bloc associer (« 0 blocs ») → elle retire le décalage (rouge prouvé sur une copie sans `y:`).
- 2026-11-14 : #2644 mergée (CI verte, revue Sonnet de la sonde sans défaut) ; modèles joués dans l'aperçu admin local.
