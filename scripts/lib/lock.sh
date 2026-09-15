#!/bin/bash
# Verrou partagé entre TOUS les worktrees du dépôt.
#
# Pourquoi le répertoire git commun : un worktree isole le répertoire de travail,
# donc deux sessions qui travaillent en parallèle ne voient RIEN l'une de l'autre
# — ni les fichiers, ni les caches, ni les verrous relatifs au worktree. Le
# répertoire git commun (`git rev-parse --git-common-dir`) est le seul endroit
# qu'elles partagent. Un verrou posé ailleurs ne verrouille rien.
#
# ⚠️ `--git-common-dir` rend un chemin RELATIF (".git") depuis le dépôt principal
# et ABSOLU depuis un worktree. Sans `--path-format=absolute`, le verrou
# atterrirait à deux endroits différents selon l'appelant : il paraîtrait
# fonctionner et ne protègerait rien.
#
# Ce que ce verrou protège, c'est la RAM et la base locale, pas des fichiers :
# les ressources vraiment partagées sur cette machine (8 Go, un seul Supabase
# local en ports fixes). Cf. docs/claude/worktrees.md.

# Répertoire des verrous, commun à tous les worktrees.
_lock_dir() {
	local common
	common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || common=".git"
	printf '%s/.locks' "$common"
}

# acquire_lock <nom> <ce que fait le concurrent>
#
# Pose le verrou <nom> ou SORT en code 2 si un autre processus vivant le détient.
# Le verrou est libéré automatiquement à la sortie du script appelant (y compris
# Ctrl-C). Un verrou dont le processus est mort (OOM, kill -9) est considéré
# périmé et repris — sans quoi une seule OOM bloquerait la machine pour de bon.
acquire_lock() {
	local name="$1" what="${2:-une tâche}"
	local dir lock holder_pid holder_wt since
	dir=$(_lock_dir)
	mkdir -p "$dir"
	lock="$dir/$name"

	if [ -f "$lock" ]; then
		holder_pid=$(awk 'NR==1' "$lock" 2>/dev/null)
		holder_wt=$(awk 'NR==2' "$lock" 2>/dev/null)
		if [ -n "${holder_pid:-}" ] && kill -0 "$holder_pid" 2>/dev/null; then
			since=$(ps -o etime= -p "$holder_pid" 2>/dev/null | tr -d ' ')
			echo "⛔ $what tourne déjà (PID $holder_pid, depuis ${since:-?})."
			# Nommer le worktree détenteur : c'est LA seule information qui rend
			# le refus actionnable, puisque l'autre session est invisible d'ici.
			[ -n "${holder_wt:-}" ] && echo "   Détenu par : $holder_wt"
			echo "   Cette ressource est partagée par tous les worktrees — attends la fin."
			echo "   Pour tuer le détenteur : kill $holder_pid"
			exit 2
		fi
		rm -f "$lock"
	fi

	printf '%s\n%s\n' "$$" "$PWD" >"$lock"
	# shellcheck disable=SC2064  # $lock doit être résolu maintenant, pas au trap.
	trap "rm -f '$lock'" EXIT INT TERM
}
