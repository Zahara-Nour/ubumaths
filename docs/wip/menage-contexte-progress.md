# Ménage de CLAUDE.md et de la mémoire — journal

## Reprendre ici

_Mis à jour le 2026-11-11 (commits de doc directs sur `main`, pas de PR)._

- **État** : `CLAUDE.md` 15 701 o (plafond 15 Ko), `MEMORY.md` 11 883 o (plafond 10 Ko) : tous deux encore au-dessus. Points 1, 2, 4, 6, 7, 8, 9, 10, 11 et 12 appliqués (2 : « Gros process » en 4 lignes ; 6 : « Références métier » sauf le BO et « Pièges techniques » → `archives.md` § « Sortis de l'index le 2026-11-11 » ; 7 : ligne « Aussi » idem ; 8 : « Mode décimal » clos, « Dépendances retenues » gardé).
- **Prochaine action** : proposer ligne par ligne d'alléger « Projets — en cours » de `MEMORY.md`, puis chercher ~0,4 Ko de plus dans `CLAUDE.md`.
- **En attente de David** : rien.
- **Pièges en cours** : points 3 et 5 écartés (prémisse fausse). Copie de `MEMORY.md` et `archives.md` d'avant le 2026-11-11 dans le dossier temporaire de la session (perdue au redémarrage).
- **Worktree / branche** : aucun (dépôt principal, `main`, doc seule).

## Historique

### 2026-11-10 — tâches planifiées et ménage

- Exception « une session lancée par une tâche planifiée ne merge jamais » écrite dans `CLAUDE.md` (lignes 40, 50, 56, 135), `docs/pratiques/git-workflow.md` § 3 étape 5, `claude-md-pourquoi.md` § Git, et dans la mémoire (`feedback_git-pr-et-branches.md`, `archives.md`). Commits `165503867`, `3ccde06a4`, `66154e328`, `076b8514e`, `b020a55a9`, `063254c48`.
- Décisions de David : la tâche planifiée corrige une CI rouge (2 tentatives au plus, aucun commit après le vert) ; en phase 0, elle écrit sa question dans le journal et s'arrête.
- `/menage-contexte` : index `MEMORY.md` raccourci (−2,5 Ko), sections en doublon d'`archives.md` fusionnées, chemins de mémoire corrigés (`docs/archive/wip/…`, `/test-font` → `/dev/polices`).
