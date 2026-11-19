# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-19, après #2916._

- **État** : surveillance (#2906), seuil Chrome 600 % (#2910) et ménage (#2916) mergés ; le dépôt principal est à jour, donc launchd lance déjà les nouveaux scripts. `pnpm menage` ferme les onglets Chrome/Brave gourmands (Chrome for Testing de Playwright épargné, filtre ancré sur `/Applications/`) et les serveurs de dev oubliés, **jamais :5173** ; il part seul quand le swap atteint 95 %. Nouvelle alerte : extension Chrome/Brave bloquée (> 90 % CPU et > 1 h de CPU cumulée), signalée, jamais arrêtée (décision de David).
- **Gel n° 2 (21:35)** : ménage manuel, puis les 2 extensions bloquées depuis 10 jours (Chrome pid 958, Brave pid 821) ont été arrêtées par David (`! kill`) → charge 57 → 10.
- **Prochaine action** : aucune ; chantier à clore (versement dans `docs/systeme/` si besoin, archivage du journal). À surveiller : l'extension repart-elle à 100 % ? (alerte ntfy le dira ; l'identifier alors avec Maj+Échap dans le navigateur).
- **Pièges** : tests de scripts en bloc sur machine chargée → timeouts sans rapport. `ps time=` sur macOS = « minutes:secondes.cc ». Index du dépôt principal : `git commit -- <mes fichiers>`.
- **Worktree / branche** : aucun.

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).
