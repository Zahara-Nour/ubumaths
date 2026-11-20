# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-20, PR orphelins + RAS + disque en cours._

- **État** : #2906, #2910, #2916, #2921 mergés. En cours : orphelins de test fermés d'office, « RAS » quotidien à 9 h, alerte disque sous 15 Go (validés par David le 2026-11-20, avec ces seuils).
- **Écartés par David le 2026-11-20** : bouton « Faire le ménage » dans ntfy (canal sans authentification) ; nombre de sessions Claude (les coupables nommés suffisent).
- **Prochaine action** : merger la PR ; au premier passage de launchd, le Playwright orphelin de 10 jours (pid 699) sera fermé. Puis clore le chantier (versement + archivage du journal).
- **Pièges** : `ps time=` sur macOS = « minutes:secondes.cc » ; noms de programmes = liste blanche (`PROGRAMMES_CONNUS`) ; disque = `/System/Volumes/Data`, pas `/` ; historique aux colonnes changées → `historique-ancien.csv` ; index du dépôt principal : `git commit -- <mes fichiers>`.
- **Worktree / branche** : `../ubumaths-wt-surveillance-orphelins-ras-disque` · `chore/surveillance-orphelins-ras-disque`.

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).

## 2026-11-20 — orphelins, RAS, disque

- Phase 0 validée : orphelin = vitest, svelte-check, tsgo ou navigateur de Playwright au parent mort (ppid 1) depuis plus de 30 min → fermé par la surveillance elle-même (David a préféré « fermer » à « prévenir » : un orphelin léger ne déclencherait jamais le ménage du swap) ; `pnpm menage` les ferme aussi.
- Mesure réelle du 2026-11-20 : un Chrome for Testing seul depuis 10 jours (+ 2 crashpad) ; disque 24-27 Go libres sur 228 → seuil 15 Go (20 aurait sonné au premier gros install).
- « RAS » : premier passage après 9 h, marque `~/.local/state/surveillance-machine/ras` (date), posée seulement si l'envoi réussit.
