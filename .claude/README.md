# .claude/

Configuration de Claude Code pour ce dépôt. Les consignes de travail sont dans
[CLAUDE.md](../CLAUDE.md) ; ce dossier ne contient que la mécanique.

| Chemin                                                 | Rôle                                                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`settings.json`](settings.json)                       | Permissions partagées (confirmation avant `git reset`/`rebase`/`clean`, `rm`, `mv`) et branchement du hook ci-dessous.                                                     |
| [`hooks/garde-commandes.py`](hooks/garde-commandes.py) | Hook `PreToolUse` sur Bash : refuse les commandes interdites par CLAUDE.md (port 5173, `kill:servers` depuis un worktree, CLI Supabase directe, `--no-verify`, `pnpm release` seul). |
| [`skills/`](skills/)                                   | Skills du projet : `domain-modeling`, `shtam`. Mode d'emploi : [skills-claude.md](../docs/pratiques/skills-claude.md).                                                  |
| [`agents/`](agents/)                                   | Sous-agents spécialisés. Guide de sélection : [agents/README.md](agents/README.md).                                                                                       |

Hors dépôt : `settings.local.json` (permissions personnelles, ignoré par git) et
`scheduled_tasks.lock`.

Les commandes de `.claude/commands/` ont été retirées le 2026-10-10 (voir
[skills-claude.md](../docs/pratiques/skills-claude.md)).

Les données de la migration TinyMath (`old-questions.json` et compagnie), lues par les scripts
et les tests de migration, vivent sous [`data/tinymath/`](../data/tinymath/).
