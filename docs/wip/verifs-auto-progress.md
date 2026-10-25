# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-10-25, après #1780._

- **État** : lot 2 MERGÉ (#1780) — 13 lignes de plus (#1253 → #1361, console) : 34 tests dans `e2e/verifs/atelier-calcul.spec.ts`, 33 verts, #1674 rouge (bug `each_key_duplicate`, chantier à part). Aide `stepsAs()` (Résumé / Détaillé). Pilote : #1773.
- **Prochaine action** : lot 3 dans un worktree neuf (`git worktree add -b test/verifs-auto-3 ../ubumaths-wt-verifs-auto origin/main`) : les lignes de console plus récentes (#1620 → #1710, 5f-4, Q50-Q52) ; ensuite celles à cartes (#1305 → #1338, clics « Réciproque », « Dériver »). La sonde d'abord, les écarts à David.
- **En attente de David** : `.simplifier` des lignes #1682 et #1625 MIS DE CÔTÉ (il regarde où en est le chantier tidy / simplify). Run en prod (`VERIFS_URL=https://chiph.re pnpm test:verifs`) après le `deploy:prod` qui livre `data-latex` (ligne en tête de `verifications-manuelles.md`).
- **Pièges en cours** : ports 5175-5178 souvent pris → `lsof` d'abord ; formules de « Comment ? » = `<math-span>` (texte vide) → `steps()` les écrit `$latex$` ; une erreur Svelte gâte les lignes suivantes d'une même page (la sonde, pas les tests) ; une commande tapée seule (`.latex`) : la 1re Entrée COMPLÈTE la commande, sans ligne — `calc()` attend alors 15 s puis échoue, et un test qui échoue peut laisser son serveur de dev vivant (port à libérer). Une ligne peut être PÉRIMÉE : un test rouge = bug ou ligne périmée, le dire, ne JAMAIS changer l'attendu seul.
- **Worktree / branche** : aucun (retirés après #1780).

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
