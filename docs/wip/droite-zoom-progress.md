# Chantier `droite-zoom` : droite graduée avec zoom (outil n° 54)

Né du chantier [idees-6e-entiers-decimaux](idees-6e-entiers-decimaux-progress.md) : 6N1H-3 (lire une
abscisse au millième par zooms successifs) et 6N1H-4 (grands nombres, zooms sur l'axe) n'avaient pas
d'outil. Ligne n° 54 de [outils-manquants.md](outils-manquants.md).

## Reprendre ici

_Mis à jour le 2026-11-24, outil n° 53 parti dans son chantier._

- **État** : outil (#3052) et modèle (#3071) livrés ; 6dba93c8 « Lire une abscisse grâce à des zooms »
  PUBLIÉ en prod (6-108), validé par David · **Prochaine action** : outil n° 53 → chantier
  [labyrinthe](../archive/wip/labyrinthe/labyrinthe-progress.md) (PR 1 mergée, #3084) ; reste à verser ce journal et celui
  d'`idees-6e-entiers-decimaux` en archive · **En attente de David** : renommer N5 (c178356b) dans
  l'éditeur · **Pièges en cours** : relancer `droite-zoom-modeles.py` efface l'id du JSON
  (6dba93c8-b8e6-4888-843b-ac9f821c4a7e) · **Worktree / branche** : aucun.

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

- 2026-11-23 : #3052 mergée (CI verte, `pnpm pr:merger`).

## PR 2 : les modèles (phase 0, 2026-11-24, validée par David : « je te suis »)

Relevé : lignes 6N1H-3 et 6N1H-4 de [idees-6e-entiers-decimaux-releve.md](idees-6e-entiers-decimaux-releve.md).
Chez eux : une droite, puis une ou plusieurs droites agrandies dessous, reliées par des pointillés ;
l'élève tape l'abscisse au clavier. Chez nous : la même chose avec `zoom:` (outil n° 54), réponse en
case numérique, comme 8adac6d1 « Repérer un nombre décimal ».

**Recommandation : un modèle neuf** « Lire une abscisse grâce à des zooms », point 6-108 (« Repérer un
nombre décimal sur une demi-droite graduée »), même nœud que 8adac6d1. Pas des variations de
8adac6d1 : lire par zooms successifs est une méthode à part (d'une droite à l'autre, le pas est
divisé par 10), le prof doit pouvoir la donner seule ; 8adac6d1 a déjà 7 variations. Grades : 6e.
Les nombres restent sous le milliard (6-103).

Variations (du plus simple au plus dur), point B à lire, étiquettes aux deux bouts de la 1re droite
seulement :

- **v0 au dixième, 1 zoom** : droite de 0 en 1, de O à O + 9 (O de 5 à 10) ; zoom entre les deux
  entiers qui encadrent B, partagé en 10. Ex. B = 8,6.
- **v1 au centième, 1 zoom** : droite de n à n + 1 au dixième ; zoom entre les deux dixièmes qui
  encadrent B, au centième. Ex. B = 12,47.
- **v2 au millième, 2 zooms** (l'exercice phare de 6N1H-3). Ex. B = 12,473.
- **v3 au millième, 2 zooms, trois écritures** : décimal, entier + fraction décimale < 1, une seule
  fraction décimale (même forme que 8adac6d1 v6 : `requiredForm` sur les deux dernières cases).
- **v4 grand entier, 2 zooms** (6N1H-4) : droite de m × 10^(w+1) à (m + 1) × 10^(w+1), pas 10^w,
  w de 3 à 5. Ex. 40 000 à 50 000 (pas 1 000), puis 46 000 à 47 000, puis 46 300 à 46 400 :
  B = 46 370.
- **v5 grand entier, 3 zooms** : 1re droite des millions, 3 000 000 à 4 000 000 (pas 100 000),
  puis 3 500 000, 3 520 000, 3 527 000 : B = 3 527 400.

Chiffres tirés de 2 à 8 (comme chez eux : jamais sur une graduation du dessus ni au bord).
Chaque variation : `testSpecs`, trois erreurs prévues, coup de pouce (« Sur chaque droite agrandie,
un petit intervalle vaut dix fois moins que sur la droite du dessus »). Erreurs typiques : garder le
pas de la droite du dessus (12,4 + 7 × 0,1), s'arrêter au premier zoom (12,47 au lieu de 12,473),
graduations comptées au lieu des intervalles.

Questions :

- **Q1. Bouts des zooms écrits ou non ?** Chez eux, rien n'est écrit sur les zooms : l'élève retrouve
  lui-même 12,4 et 12,5. Reco : **rien d'écrit** (c'est le cœur de l'exercice), et le corrigé les
  écrit.
- **Q2. Un modèle neuf** (reco) **ou des variations de 8adac6d1** ?
- **Q3. Question d'accès de la migration de rangement** : personne ne gagne d'accès (on range un
  modèle de questions). D'accord ?

### Lot écrit (2026-11-24)

- Script `docs/wip/questions/droite-zoom-modeles.py` → `scripts/questions/droite-zoom-modeles/` : 1 modèle,
  6 variations, 41 specs vertes (`question:specs`), 300 tirages, sonde des droites 0 problème.
- Écart à la phase 0 : v4 et v5 ont un rang fixé (v4 : 10 000 à 100 000 ; v5 : millions), au lieu de
  w de 3 à 5. Raison : la formule `${{X}}$` n'espace pas les chiffres ; les nombres des messages et du
  corrigé sont écrits chiffre par chiffre et groupés à la main, ce qui demande un rang connu.
- Vu en local (`pnpm voir`, aperçu admin) : v1 (1 zoom), v2 (2 zooms), v5 (3 zooms, millions) et la
  droite du corrigé de v5 (bouts écrits, nombres groupés). Défaut mineur : sur un zoom, un pointillé
  peut passer près de l'étiquette « B » (règle du dessin, pas du modèle).
- Zoom en prod depuis la 0.106.0 : pas de déploiement à attendre.
- 2026-11-24 : brouillon créé en prod par David (6dba93c8) ; migration de rangement générée, test
  d'intégration vert avec la migration et rouge sans (3 échecs, fichier vidé) ; `security-auditor` lancé.
- 2026-11-24 : #3071 mergée (CI verte, `pnpm pr:merger`) ; `db:migrate` (seule migration en attente),
  modèle vérifié en prod : brouillon, nœud « droite graduée », tag 6-108.
- 2026-11-24 : David valide le modèle (dans la conversation, aucun verdict en base) ; `publier-lot.ts`
  lancé par David, statut `published` vérifié en prod.
