# .claude/

Configuration de Claude Code pour ce dépôt. Les consignes de travail sont dans
[CLAUDE.md](../CLAUDE.md) ; ce dossier ne contient que la mécanique.

| Chemin                                                 | Rôle                                                                                                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`settings.json`](settings.json)                       | **Source unique des commandes qui perdent du travail** (liste `ask` : confirmation de David) et branchement du hook ci-dessous.                                            |
| [`hooks/garde-commandes.py`](hooks/garde-commandes.py) | Hook `PreToolUse` sur Bash : refuse les interdits de CLAUDE.md qui dépendent des arguments ou du dossier (port 5173, `kill:servers` depuis un worktree, CLI Supabase directe, `--no-verify`, `pnpm release` seul, `tsc --noEmit`, `git -C ""`) et demande confirmation pour les variantes que `ask` ne voit pas (`--force` ou `-D` placés n'importe où). |
| [`skills/`](skills/)                                   | Skills du projet : `domain-modeling`, `shtam`. Mode d'emploi : [skills-claude.md](../docs/pratiques/skills-claude.md).                                                  |
| [`agents/`](agents/)                                   | Sous-agents spécialisés. Guide de sélection : [agents/README.md](agents/README.md).                                                                                       |

## Où vit quelle règle

| Question | Où regarder |
| --- | --- |
| « Est-ce que ça demande l'accord de David ? » | La liste `ask` de [`settings.json`](settings.json) — **seule source**, appliquée de force à toutes les sessions. |
| « Est-ce interdit selon les arguments ou le dossier ? » | [`hooks/garde-commandes.py`](hooks/garde-commandes.py) (et ses tests). |
| « Pourquoi ? » | [CLAUDE.md](../CLAUDE.md), qui renvoie ici sans recopier la liste. |

Claude Code additionne les listes de `settings.json` (dépôt, partagé), `settings.local.json` (personnel)
et `~/.claude/settings.json` (global) ; `deny` > `ask` > `allow`. Pour qu'il n'y ait qu'une source,
`settings.local.json` ne contient que des réglages personnels (`allow`), jamais de liste `ask`.

Hors dépôt : `settings.local.json` (permissions personnelles, ignoré par git) et
`scheduled_tasks.lock`.

Les commandes de `.claude/commands/` ont été retirées le 2026-10-10 (voir
[skills-claude.md](../docs/pratiques/skills-claude.md)).

Les données de la migration TinyMath (`old-questions.json` et compagnie), lues par les scripts
et les tests de migration, vivent sous [`data/tinymath/`](../data/tinymath/).
