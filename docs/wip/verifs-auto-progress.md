# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-10-26, lot 6 en PR._

- **État** : lot 6 (branche `test/verifs-auto-6`) : écarts (b) et (c) récrits, Graphe #1400-#1405, Géométrie #1536/#1538, reste de Calcul (14 lignes) ; suite complète : 94 verts, rouges = `each_key_duplicate` (#1674, #1703, #1307), #1617 et #1620 (#1807, écart 5), #1422 par intermittence (grille qui saute, écart 4).
- **Prochaine action** : merger le lot 6 ; puis les lignes Atelier restantes (`grep -n Atelier docs/wip/verifications-manuelles.md`), ou la page à cocher (plan, point 2).
- **En attente de David** : écarts 1-5 du lot 6 (#1367 f′ avec a non défini, #1369 `sinus`, #1404 image sur la carte f′, grille qui saute, #1617/#1620 périmées par #1807 ?) ; « Résoudre f(x) = 0 » sur la carte k. Run en prod après le `deploy:prod` qui livre `data-latex`.
- **Pièges en cours** : ports 5175-5178 et 5180 pris → 5179 ; AU RETRAIT D'UN WORKTREE, COUPER SES SERVEURS d'abord ; `pnpm test:verifs … | tail` ne rend pas la main : sortie dans un fichier, serveur lancé à part ; `e` = Euler (`e : y = …` refusé, prendre `k`) ; console ouverte = couvre la toile et les boutons de zoom (`setConsole(page, false)`) ; prettier réaligne TOUT le tableau quand une ligne large sort ; commitlint refuse un sujet en majuscule ; ligne PÉRIMÉE possible : ne JAMAIS changer l'attendu seul.
- **Worktree / branche** : `ubumaths-wt-verifs-auto` / `test/verifs-auto-6` (serveur de dev sur 5179).

## Phase 0 (validée le 2026-10-25)

- Lignes Atelier : test qui tape la commande dans `/atelier` (sans compte) et lit la réponse **affichée** ; les « pas … » deviennent des assertions ; refus → message de refus visible.
- Ligne mixte calcul + œil : le calcul passe en test, le visuel reste dans la liste.
- Test rouge : bug réel ou ligne périmée → signalé à David, attendu jamais modifié pour passer.
- Titre de test = n° de PR de la ligne. Ligne entièrement couverte → **sort** de `verifications-manuelles.md`.
- Exécution : **à la demande, en local** (`pnpm test:verifs`, Chromium, serveur de dev), pas en CI.
- Pilote : un lot d'environ 20 lignes, une PR, revue `code-reviewer` (Sonnet).

## Pilote — lignes retenues (n° de PR des lignes)

#1717, 5f-5 (#1743), M2 (#1749), #1674, #1682, #1656 (partie console), #1658/#1660, #1625, #1302, #1319, #1502, #1345, #1350, #1351, #1362/#1363, #1364, #1365, #1372, #1371, #1373, #1655 (partie console).

## Lot 2 — lignes retenues (2026-10-25)

#1253, #1278/#1279, #1282, #1300, #1321 (sans le clavier), #1483, #1326, #1329 (sans la correction générée), #1333 (sans le grapheur), #1334, #1347/#1349, #1353/#1357, #1361. Écart vu par la sonde : `.latex` seul → l'Entrée complète la commande (la ligne datait d'avant la complétion) ; David l'a vu, le test joue les deux Entrées.

## Lot 3 — lignes retenues (2026-10-25)

5f-4, Q50 (#1735), Q51-Q52 (#1741), #1710 (sans la lisibilité sur téléphone), #1709 (sans l'infobulle du clavier), #1708 (sans la correction d'un modèle d'essai), #1703 (sans la carte f′), #1663 (console seule), #1673 (console seule), #1620 (console seule), #1624 (sans le mode décimal), #1628, #1631, #1636 (console seule). Sonde : AUCUN écart avec les lignes, sauf `each_key_duplicate` sur « Comment ? » de `.dériver x/(x+1)`, `.dériver x\ln(x)` et `.dériver 2^(x^2)` (cette dernière ligne ne demande que la réponse : test vert).

Vu en passant, hors des lignes (à montrer à David, rien changé) : `.intégrer -0,6x+1,2` → la ligne dit $-0{,}3x^2 + 1{,}2x + C$, la dernière étape $1{,}2x - 0{,}3x^2 + C$ ; `.résoudre (x-0,5)/(x+1)>0` → « P(x) = 2x − 1, Q(x) = 2x + 2 » (multipliés par 2) et l'étape 1 d'une inéquation rationnelle explique « Une inéquation du second degré s'écrit… » ; `.résoudre |x/2-0,5|=1` → la branche réécrit x/2 en $0{,}5x$ dès l'étape suivante.

## Lot 4 — lignes retenues (2026-10-25)

Cartes : #1305 (sans `a = 3 sur 4`, à trancher), #1307, #1309, #1315 (thème clair ; sombre et /grapheur restent), #1328 (sans le dessin ni les 3 étapes dans Calcul), #1337, #1338 (sans le gris de y = x), carte f′ et bouton « Dériver » de #1703. Sonde étendue : `CARTES` après chaque ligne, `@Réciproque f` pour un clic de menu.

Écarts vus (rien changé, à David) : `f(1)` de `max(2,5 ; x)` → 2,5 (la ligne : 5/2) ; carte `g(x) = f(x)+1` sans intervalle affiché (le Graphe l'applique) ; `.réciproque sin` demande des parenthèses ; `a = 3 sur 4` en erreur. Nouveau cas `each_key_duplicate` : « Comment ? » de `.résoudre f(x)=4` avec f sur `[0;+∞[`. Vu en passant : la légende du tableau de variations dit « Tableau de variations de la fonction x » (au lieu de f).

## Lot 5 — vue Données et « Propriétés » (2026-10-26)

Lignes : #1410 (sans statistiques / nuage / diagramme de L, ancien atelier, tablette), #1413 (sans la note du diagramme), #1421 (sans « sans saccade » ni la carte calculée), #1422 (partie « Valeur exacte » et π), #1424 (sans poignée, copier-coller, partage), #1426 (sans Ctrl+Z), #1427 (sans tablette), #1430, #1431, #1432, #1434 (sans iPad), #1437 (sans le partage), #1444 (sans Tabuler de f_1 ni u_1), #1472 (sans iPad), #1477 ; `atelier-proprietes.spec.ts` : #1630 (sans téléphone), #1634 (sans le rendu). #1430, #1431, #1432, #1477 sortent de la liste.

Outillage : `helpers/grille.ts` (taper une case par la barre, lire son nom accessible, « Valeur exacte », la note, l'aide) ; `data-latex` posé sur la case écrite en maths, sur « Valeur exacte » (`DataView.svelte`) et sur les valeurs du panneau « Propriétés » (`ObjectProperties.svelte`) — la phrase du lecteur d'écran est en anglais (« one quarter ») ; sonde : `#A1 =…`, `?A1`, `~A1 =…`, `!Données`.

Écarts (à David, rien changé côté appli) :

1. **#1413, test rouge** : « Ajustement avec M » crée une carte f qui montre `2 × x + 1` ; la console dit `f(x) = 2x + 1`.
2. **#1422** : `=2/3` s'écrit en texte « 2/3 », pas en fraction — voulu par une PR suivante (`latexOf`, `formula.ts` : « une fraction en maths débordait de la ligne ») : ligne périmée ? Pas testé.
3. **#1410** : « « Annuler » du message remet L » — plus de message ; ↶ « Annuler : retirer le nom de la colonne A » remet L. Le test passe par ↶.

**Écarts tranchés par David (2026-10-26)** : les 3 recos acceptées — #1413 = bug à corriger (PR à part) ; #1422 et #1410 = lignes périmées, à récrire. « Valeur exacte » en anglais : futur petit chantier d'accessibilité (langue de la lecture vocale MathLive, console probablement aussi — non vérifié), pas maintenant.

Vu en passant : « Valeur exacte » est lue en anglais par un lecteur d'écran (`convertLatexToSpeakableText` de MathLive, « the square root of 2 ») ; #1427 parlait d'un formulaire dans la carte, c'est une fenêtre (Dialog) et la phrase « colonnes A et B (11 lignes) » est bien dans la carte.

## Lot 6 — écarts (b) et (c), Graphe, Géométrie, reste de Calcul (2026-10-26)

Lignes : #1422 (`=2/3` en texte, testé) et #1410 (↶ et Ctrl+Z remettent L) récrites ; Graphe #1400, #1401, #1402, #1405 (`atelier-graphe.spec.ts`, ligne sortie) ; Géométrie #1536, #1538 sans la tablette (`atelier-geometrie.spec.ts`) ; Calcul #1784 (sans « domaine gardé » à l'écran), #1684 (sans le tracé x > 0), #1617 (sans la cohérence du résumé), #1375 (sans thèmes ni téléphone), #1366, #1503 (sans le × du champ), #1535 (sans le rejeu de fichier), #1342, #1367, #1368 et #1369 (sans le clavier MathLive), #1374, #1404, #1417 (sans le collage ni la flèche au doigt). #1342, #1366, #1374 sortent. La ligne #1366 était cassée en deux dans le tableau (`\f` de `$\frac00$` lu comme saut de page).

Outillage : Graphe = 10 clics « Zoom arrière » (±577), asymptotes comptées par leur `stroke-dasharray` (5,5 verticale, 8,4 horizontale ; un trait horizontal est « caché » pour `toBeVisible`, on compte), une asymptote horizontale attendue avant de compter « 0 verticale » ; Géométrie = clic en coordonnées du repère (origine au centre, `min(l, h)/13` px par unité), lignes lues dans l'historique console FERMÉE ; presse-papiers par `grantPermissions`.

Écarts (à David, rien changé côté appli) :

1. **#1367** : « Dériver » sur `f(x) = a x`, `a` non défini → carte f′ « En attente de « a » », sans formule (la ligne : f′(x) = a) ; avec `a = 2`, f′ = 2. Alors que `.intégrer` de `e^{a x}` calcule avec `a` symbolique.
2. **#1369** : `sinus` n'est pas refusé mais lu i·n·s²·u : « lu normalement » ?
3. **#1404** : « l'image de 2 sur la carte f′ » : plus de champ d'image sur la carte (décision du 2026-10-18) — ligne périmée ?
4. **#1617 et #1620 rouges depuis #1807** (tidy-conditions, mergée pendant le lot) : `.simplifier (x^2-1)/(x+1)` et `.simplifier x/x` laissent la fraction (bouton « Simplifier pour x ≠ … ») ; les lignes demandaient `x − 1` et `1` avec leurs étapes. Attendus non changés, à David.
5. **Bug, #1422 rouge par intermittence (suite complète)** : la grille saute de 32 px selon que la case choisie a une « Valeur exacte » ou non (A1 = √8 : A1.y 376 ; A2 = 5 : 344). Pendant un clic, la grille bouge sous le pointeur enfoncé → zone A2:A3 au lieu de A2. Un élève qui appuie un peu longtemps l'aurait aussi. Correctif probable : réserver la ligne sous la barre (comme la consigne de la Géométrie). Test non masqué.

Vu en passant : le menu « Options » d'une carte k dit « Résoudre f(x) = 0 » (pas k) ; les 6 premiers tests d'une suite complète lancée juste après un commit expirent dans `openAtelier` (serveur de dev à froid) — relancer.

## Écarts tranchés par David (2026-10-26)

L'Atelier a raison, les lignes étaient périmées ou imprécises : #1305 `a = 3 sur 4` → carte rangée en erreur, sans refus d'intervalle ; #1309 `f(1)` → 2,5 (décimal tapé → décimal) ; #1337 l'héritage se lit par `.domaine g` (« ensemble hérité »), le champ ne montre que l'ensemble propre (décision d) ; #1338 `.réciproque sin(x)` (`sin` seul refusé depuis le 2026-10-06) ; #1620 `.dériver x^x` → `x^x(ln(x)+1)`, ordre de l'Atelier. #1305, #1309, #1337 sortent de la liste.

## Plan d'ensemble

1. Pilote Atelier (~20 lignes) → puis le reste des ~126 lignes Atelier.
2. Page à cocher avec captures (clair, sombre, téléphone) pour les ~73 lignes « à l'œil ».
3. Lignes prof / élève : en local, comptes de test (`db:seed-riche`) — jamais de mot de passe saisi en prod.
4. Ce qui reste vraiment manuel.

## Pilote — ce qui s'est passé (2026-10-25)

- **Lignes périmées, tranchées par David** : #1625 « `0.5*sqrt(2)` inchangé » (#1663 le veut `√2/2`) ; écritures de #1302 (`(ln(a) − 1)/2`, `S = {√a ; −√a}`) ; #1372 « pas de Comment ? » (la PR 2 l'a livré). Le test suit l'appli.
- **`.simplifier` (#1682, #1625)** : `ln(x)-ln(x)`, `1/x-1/x` → 0, `(0.5x+1)/(x+1)` → `(x+2)/(2x+2)`. Rejoué au commit de #1682 : déjà ainsi (`pedagogical-simplify` rend `null`, repli sur `simplify()`, inchangés depuis #1625). Les PR ont corrigé `tidy` = ligne de calcul, où tout reste écrit. Mis de côté par David.
- **Bug trouvé** : « Comment ? » de `.dériver (e^x)^2` (et `.dériver x*e^x` seul) ne s'ouvre pas, `each_key_duplicate` (deux étapes de même `id`) dans `GeneratedStepsCorrection`. Chantier à part (David) ; test #1674 laissé rouge.
- **Prod** : la suite tourne contre chiph.re (`VERIFS_URL`), mais la prod n'a pas encore `data-latex` → 19 rouges « réponse en texte », textes visibles conformes. Ligne ajoutée en tête de `verifications-manuelles.md`.
- `playwright.config.ts` ignore `verifs/**` (`pnpm test:e2e` ne les lance pas) ; la CI ne lance aucun e2e.
