# Chantier `droite-zoom` : droite graduée avec zoom (outil n° 54)

Né du chantier [idees-6e-entiers-decimaux](idees-6e-entiers-decimaux-progress.md) : 6N1H-3 (lire une
abscisse au millième par zooms successifs) et 6N1H-4 (grands nombres, zooms sur l'axe) n'avaient pas
d'outil. Ligne n° 54 de [outils-manquants.md](outils-manquants.md).

## Reprendre ici

_Mis à jour le 2026-11-23, avant l'ouverture de la PR 1._

- **État** : PR 1 (outil : parseur, écran, PDF, catalogue, doc) codée, tests verts, rendu vu à l'écran et
  au PDF · **Prochaine action** : PR 1 ouverte → CI → merge ; puis PR 2 : modèles 6N1H-3 et 6N1H-4
  (brouillons, relecture dans `/dev/modeles`) ; puis outil n° 53 (labyrinthe), phase 0 d'abord ·
  **En attente de David** : rien · **Pièges en cours** : `outils-manquants.md` est modifié non commité
  dans le dépôt principal (autre session) : ne pas le toucher dans cette PR ; après le merge, y passer
  n° 54 à « Fait » et ajouter « placer un point sur un zoom » (Q2) · **Worktree / branche** :
  `ubumaths-wt-droite-zoom` / `feat/droite-zoom`.

## Phase 0 (2026-11-23, validée par David : « je suis tes recos »)

Syntaxe : `zoom: 12.4 ; 12.5 ; step 0.01` dans le bloc ` ```line `, une ligne par zoom, chacun sous
le précédent, deux pointillés vers le morceau agrandi.

- Cas normal : début, fin, pas, `major` et `labels` facultatifs ; un point sur toutes les droites où il
  tombe ; PDF identique à l'écran.
- Limites : 4 zooms au plus ; un zoom peut couvrir plusieurs graduations ; grands nombres groupés.
- Erreurs : bout hors de la droite du dessus ou entre deux graduations ; début ≥ fin, pas trop grand,
  plus de 500 graduations ; 5e zoom.
- **Q1** étiquettes d'un zoom sans `labels` : **aucune** (reco suivie).
- **Q2** placer un point sur un zoom : **refusé pour l'instant** (avec `representer:`, `segments:`,
  `scale: log`), à noter dans `outils-manquants.md` (reco suivie).
- **Q3** découpage : **PR 1 l'outil, PR 2 les modèles 6N1H-3 et 6N1H-4** (reco suivie).

## PR 1 : l'outil

- Tests d'abord : `number-line-zoom.test.ts` (25, parseur + graduations + PDF), `NumberLine-zoom.svelte.test.ts`
  (6, écran) ; rouges (22 sur 25) avant le code.
- Code : `zooms?: NumberLineConfig[]` et `autoLabels` dans les types ; `parseZooms` / `parseZoom` dans le
  parseur ; `pointsInside` dans `number-line-render.ts` ; `generateZoom` dans le générateur Typst ;
  `NumberLine.svelte` dessine une rangée par droite (`rows`) et les pointillés (`zoomLinks`).
- Catalogue des blocs : groupe « Zooms » et exemple « Lire au millième par zooms successifs ».
- Vu à l'écran (`pnpm voir /aide-ecriture/blocs/droite-graduee --ordi`) et au PDF (typst.ts 0.6.1-rc5
  dans Chromium, script de la session). Remarque : sur la 1re droite, un point très proche d'un autre
  (B = 12,473 et C = 12,5) a son nom collé au sien (« BC ») ; c'est la règle de toujours pour deux points
  proches, l'auteur choisit ses points.
- Revue `code-reviewer` (Sonnet) : aucun bloquant ; corrigés avec un test chacun : pointillé qui barrait le
  nombre écrit de sa graduation (part désormais dessous, `isLabeledAt`), `step` égal au zoom refusé à
  tort (arrondi 12,5 − 12,4), pas qui ne tombe pas juste sur la fin (refusé), `labels` hors du zoom
  (refusés). Revu au PDF : grands nombres (40 000 à 50 000, deux zooms), pointillés sous « 46 000 ».
