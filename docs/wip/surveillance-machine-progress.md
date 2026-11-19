# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-19, après #2921._

- **État** : surveillance (#2906), seuil Chrome (#2910), ménage (#2916), historique + alertes charge/pression + coupables nommés (#2921) mergés ; le dépôt principal est à jour, launchd lance les nouveaux scripts. Historique : `pnpm surveillance:historique` (`~/.local/state/surveillance-machine/historique.csv`, 14 jours).
- **Idées restantes, validables plus tard** (4 à 8 de la liste du 2026-11-19) : processus de test orphelins (vitest, svelte-check, Playwright) ; « RAS » quotidien qui prouve que la surveillance vit ; bouton « Faire le ménage » dans la notification ntfy (question de sécurité : qui connaît le canal peut le déclencher) ; place disque ; nombre de sessions Claude.
- **À 22:30** : 7 onglets Brave à ~100 % chacun, partis en boucle depuis l'arrêt de l'extension Brave (pid 821) ; proposé à David : `! pnpm menage`.
- **Prochaine action** : aucune imposée ; soit une idée restante (phase 0 d'abord), soit clore le chantier (versement + archivage du journal).
- **Pièges** : `ps time=` sur macOS = « minutes:secondes.cc » ; noms de programmes = liste blanche (`PROGRAMMES_CONNUS`), le reste « autres » jamais classé ; tests de scripts en bloc sur machine chargée → timeouts sans rapport ; index du dépôt principal : `git commit -- <mes fichiers>`.
- **Worktree / branche** : aucun.

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).
