# Ménage de CLAUDE.md et de la mémoire — journal

## Reprendre ici

_Mis à jour le 2026-11-10, après `063254c48` (commits de doc directs sur `main`, pas de PR)._

- **État** : `CLAUDE.md` 15 966 o (plafond 15 Ko), `MEMORY.md` 13 176 o (plafond 10 Ko) : tous deux encore au-dessus. Les points 1, 4, 9, 10, 11 et 12 du ménage sont appliqués.
- **Prochaine action** : appliquer ce que David tranchera sur les points 2, 6, 7 et 8, puis proposer ligne par ligne d'alléger « Projets — en cours » de `MEMORY.md` (lignes 82-102).
- **En attente de David** : (2) raccourcir « Gros process » de `CLAUDE.md` (~0,5 Ko) ? (6) sortir de l'index « Références métier » et « Pièges techniques », en gardant la ligne du BO (~1,2 Ko) ? (7) passer la ligne « Aussi : … » dans `archives.md` ? (8) « Mode décimal » et « Dépendances retenues » sont-ils clos ?
- **Pièges en cours** : points 3 et 5 écartés, car leur prémisse était fausse (règles absentes de `CLAUDE.md` ; liste des modèles d'agents absente de `.claude/agents/README.md`). Sauvegarde de la mémoire d'avant le ménage dans le dossier temporaire de la session (perdue au redémarrage).
- **Worktree / branche** : aucun (dépôt principal, `main`, doc seule).

## Historique

### 2026-11-10 — tâches planifiées et ménage

- Exception « une session lancée par une tâche planifiée ne merge jamais » écrite dans `CLAUDE.md` (lignes 40, 50, 56, 135), `docs/pratiques/git-workflow.md` § 3 étape 5, `claude-md-pourquoi.md` § Git, et dans la mémoire (`feedback_git-pr-et-branches.md`, `archives.md`). Commits `165503867`, `3ccde06a4`, `66154e328`, `076b8514e`, `b020a55a9`, `063254c48`.
- Décisions de David : la tâche planifiée corrige une CI rouge (2 tentatives au plus, aucun commit après le vert) ; en phase 0, elle écrit sa question dans le journal et s'arrête.
- `/menage-contexte` : index `MEMORY.md` raccourci (−2,5 Ko), sections en doublon d'`archives.md` fusionnées, chemins de mémoire corrigés (`docs/archive/wip/…`, `/test-font` → `/dev/polices`).
