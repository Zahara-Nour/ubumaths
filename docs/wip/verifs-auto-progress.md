# Chantier `verifs-auto` — automatiser les vérifications manuelles

## Reprendre ici

_Mis à jour le 2026-10-25, avant la première PR._

- **État** : phase 0 validée par David (voir plus bas). Pilote en cours, rien de poussé : `data-latex` posé sur la réponse de la console (`CalculView.svelte`, `shownLatex`), `playwright.verifs.config.ts`, aide `e2e/verifs/helpers/atelier.ts`. Aucun test écrit encore.
- **Prochaine action** : choisir un port libre (`lsof -iTCP -sTCP:LISTEN | grep 51`), `VERIFS_PORT=<port> pnpm exec playwright test -c playwright.verifs.config.ts` ; ajouter le script `test:verifs` ; écrire `e2e/verifs/atelier-calcul.spec.ts` sur les ~20 lignes du pilote (liste ci-dessous), lancer, puis retirer les lignes couvertes de `verifications-manuelles.md`.
- **En attente de David** : rien.
- **Pièges en cours** : port 5176 PRIS par un autre worktree ; la sortie de la console est du markup MathLive statique (`ML__`), illisible pour une fraction → lire `data-latex`. Un test rouge = bug ou ligne périmée : le signaler, ne JAMAIS changer l'attendu.
- **Worktree / branche** : `../ubumaths-wt-verifs-auto` · `test/verifs-auto`.

## Phase 0 (validée le 2026-10-25)

- Lignes Atelier : test qui tape la commande dans `/atelier` (sans compte) et lit la réponse **affichée** ; les « pas … » deviennent des assertions ; refus → message de refus visible.
- Ligne mixte calcul + œil : le calcul passe en test, le visuel reste dans la liste.
- Test rouge : bug réel ou ligne périmée → signalé à David, attendu jamais modifié pour passer.
- Titre de test = n° de PR de la ligne. Ligne entièrement couverte → **sort** de `verifications-manuelles.md`.
- Exécution : **à la demande, en local** (`pnpm test:verifs`, Chromium, serveur de dev), pas en CI.
- Pilote : un lot d'environ 20 lignes, une PR, revue `code-reviewer` (Sonnet).

## Pilote — lignes retenues (n° de PR des lignes)

#1717, 5f-5 (#1743), M2 (#1749), #1674, #1682, #1656 (partie console), #1658/#1660, #1625, #1302, #1319, #1502, #1345, #1350, #1351, #1362/#1363, #1364, #1365, #1372, #1371, #1373, #1655 (partie console).

## Plan d'ensemble

1. Pilote Atelier (~20 lignes) → puis le reste des ~126 lignes Atelier.
2. Page à cocher avec captures (clair, sombre, téléphone) pour les ~73 lignes « à l'œil ».
3. Lignes prof / élève : en local, comptes de test (`db:seed-riche`) — jamais de mot de passe saisi en prod.
4. Ce qui reste vraiment manuel.
