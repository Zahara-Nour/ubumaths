# Chantier `surveillance-machine`

## Reprendre ici

_Mis à jour le 2026-11-20, après #2930._

- **État** : #2906, #2910, #2916, #2921, #2930 mergés ; le dépôt principal est à jour, launchd lance les scripts. #2930 : orphelins de test fermés d'office (reconnus par l'exécutable, crashpad épargné), « RAS » quotidien à 9 h, alerte disque sous 15 Go.
- **Écartés par David le 2026-11-20** : bouton « Faire le ménage » dans ntfy (canal sans authentification) ; nombre de sessions Claude.
- **À vérifier** : au prochain passage, le Playwright orphelin de 10 jours (pid 699) doit être fermé et signalé ; demain après 9 h, le premier « RAS » doit arriver sur l'iPhone.
- **Prochaine action** : clore le chantier (versement du durable dans `docs/systeme/` ou `docs/pratiques/environnement-de-dev.md`, déjà à jour ; archivage du journal).
- **Pièges** : `ps time=` sur macOS = « minutes:secondes.cc » ; noms de programmes = liste blanche ; disque = `/System/Volumes/Data`, pas `/` ; `chrome_crashpad_handler` toujours en ppid 1 ; index du dépôt principal : `git commit -- <mes fichiers>`.
- **Worktree / branche** : aucun.

## Contexte

2026-11-19 : le Mac mini gèle (62 onglets Chrome à ~1 170 % CPU, `vite dev` de 2,5 Go dans le dépôt principal depuis 4 h 20, swap 11,5 Go / 12). Règle écrite dans `CLAUDE.md` (commit a86e876). David valide : alerte ntfy.sh sur l'iPhone, action automatique seulement sur le cas sûr (serveur de dev dans le dépôt principal → arrêté).

## 2026-11-20 — orphelins, RAS, disque

- Phase 0 validée : orphelin = vitest, svelte-check, tsgo ou navigateur de Playwright au parent mort (ppid 1) depuis plus de 30 min → fermé par la surveillance elle-même (David a préféré « fermer » à « prévenir » : un orphelin léger ne déclencherait jamais le ménage du swap) ; `pnpm menage` les ferme aussi.
- Mesure réelle du 2026-11-20 : un Chrome for Testing seul depuis 10 jours (+ 2 crashpad) ; disque 24-27 Go libres sur 228 → seuil 15 Go (20 aurait sonné au premier gros install).
- « RAS » : premier passage après 9 h, marque `~/.local/state/surveillance-machine/ras` (date), posée seulement si l'envoi réussit.
