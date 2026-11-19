# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-19, après #2906 ; #2910 et `chore/menage-machine` en cours._

- **État** : surveillance installée (#2906, launchd + ntfy OK sur l'iPhone). **#2910** (seuil Chrome 300 → 600 %) : CI verte sur 63a6f4a, **pas encore mergée**. **`chore/menage-machine`** (worktree `../ubumaths-wt-menage-machine`, poussée, PAS de PR) : `pnpm menage` + ménage auto si swap ≥ 95 % (1×/15 min), helpers dans `scripts/machine-commun.sh`, 19 tests verts, check 0 erreur ; branche partie de #2910.
- **Prochaine action** : merger #2910 ; puis sur `chore/menage-machine` : `git merge origin/main`, corriger la revue (1) filtre Chrome ancré sur `/Applications/Google Chrome.app/` — sinon Chrome for Testing de Playwright est tué (prouvé, pid réel) ; (2) en-tête de `menage-machine.sh` : les tests sont dans `surveillance-machine.test.ts`. Puis PR, CI, merge (aucune réinstallation launchd nécessaire : il lance le script du dépôt principal).
- **En attente de David** : le ménage doit-il épargner le port 5173 (son serveur de test, éventuellement > 6 h) ? Recommandation : oui.
- **Gel n° 2 (21:35, charge 139)** : ménage fait à la main — 32 onglets Chrome + 5 onglets **Brave** fermés → charge 57. À intégrer au ménage : **Brave aussi** (`/Applications/Brave Browser.app/`). Deux processus d'**extension** (Chrome client-id 9, Brave client-id 8) tournent à 100 % depuis 10 jours : épargnés, à signaler à David.
- **Pièges** : tests de scripts lancés en bloc sur machine chargée → timeouts sans rapport (passent seuls). Index du dépôt principal : fichiers d'autres sessions indexés → `git commit -- <mes fichiers>`.
- **Worktree / branche** : `../ubumaths-wt-surveillance-seuil` (#2910), `../ubumaths-wt-menage-machine` (`chore/menage-machine`).

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).
