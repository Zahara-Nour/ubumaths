# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-10-25, lot 4 en PR._

- **État** : lot 4 sur `test/verifs-auto-4` (PR à ouvrir/ouverte) — 8 tests cartes dans `e2e/verifs/atelier-cartes.spec.ts` (#1305, #1307, #1309, #1315, #1328, #1337, #1338, carte f′ de #1703) ; `data-latex` posé sur les cartes calculées (`FunctionCard`) et les formules d'un refus (`FormulaText`) ; la sonde lit les cartes et joue `@Action carte`. 4 rouges : 3 écarts à trancher + `each_key_duplicate` au bout de #1307.
- **Prochaine action** : merger le lot 4, puis lot 5 (lignes Atelier restantes : Graphe, Données, Géométrie).
- **En attente de David** : écarts du lot 4 — #1309 `f(1)` 2,5 au lieu de 5/2 ; #1337 carte g sans « sur [0 ; +∞[ » ; #1338 `.réciproque sin` → « écris sin(…) » (arcsin seulement avec `sin(x)`) ; #1305 `a = 3 sur 4` refusé (« reste accepté » ?). Du lot 3 : #1620 `.dériver x^x`, ordre des facteurs. Run en prod après le `deploy:prod` qui livre `data-latex`.
- **Pièges en cours** : ports 5175-5178 pris → `lsof` (5179) ; AU RETRAIT D'UN WORKTREE, COUPER SES SERVEURS d'abord (un `vite` orphelin du lot 3 a recréé le dossier, kill refusé au classifieur) ; suite complète à froid avec 4 workers → délais dépassés, relancer à chaud ; `each_key_duplicate` casse « Comment ? » (dérivées produit/quotient/composée, `.résoudre` sur intervalle) ; champ d'une carte : le 1er clic après un calcul rend le focus à la console (`typeInCard` reclique) ; ligne PÉRIMÉE possible : ne JAMAIS changer l'attendu seul ; `verifications-manuelles.md` : repérer une ligne par sa colonne PR.
- **Worktree / branche** : `../ubumaths-wt-verifs-auto` · `test/verifs-auto-4`.

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
