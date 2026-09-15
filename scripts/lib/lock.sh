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
#
# Aucun repli silencieux sur ".git" : dans un worktree, `.git` est un FICHIER,
# donc `mkdir -p .git/.locks` échouerait et le verrou disparaîtrait sans un mot.
# Mieux vaut refuser de tourner que tourner sans protection.
_lock_dir() {
	local common
	common=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
	[ -n "$common" ] || return 1
	printf '%s/.locks' "$common"
}

# Empreinte d'un processus : sa date de démarrage.
#
# Le PID seul ne suffit pas. Un processus tué par l'OOM (SIGKILL, donc aucun trap)
# laisse son fichier derrière lui ; quand le système recycle ce PID, `kill -0`
# réussit sur un processus INNOCENT et le verrou devient un blocage perpétuel —
# pour tout le dépôt, désormais, et non plus pour un seul worktree.
# Comparer la date de démarrage rend la détection de péremption déterministe.
_proc_start() { ps -o lstart= -p "$1" 2>/dev/null | tr -s ' '; }

# acquire_lock <nom> <ce que fait le concurrent>
#
# Pose le verrou <nom> ou SORT en code 2 si un autre processus vivant le détient.
# Sort en code 1 si le verrou est impossible à poser — jamais en silence : un
# verrou qui échoue sans le dire est pire que pas de verrou.
acquire_lock() {
	local name="$1" what="${2:-une tâche}"
	local dir lock holder_pid holder_wt holder_start live_start since attempt

	dir=$(_lock_dir) || {
		echo "⛔ Répertoire git commun introuvable : impossible de poser un verrou." >&2
		echo "   Lance cette commande depuis le dépôt ou l'un de ses worktrees." >&2
		exit 1
	}
	mkdir -p "$dir" || {
		echo "⛔ Impossible de créer $dir : on n'exécute rien sans verrou." >&2
		exit 1
	}
	lock="$dir/$name"

	for attempt in 1 2 3; do
		# Création ATOMIQUE. Sous `noclobber`, la redirection `>` ouvre avec
		# O_CREAT|O_EXCL : exactement un processus gagne. Un `[ -f ]` suivi d'une
		# écriture ne verrouille RIEN — mesuré : trois acquisitions simultanées
		# réussissaient toutes les trois, et la première à finir supprimait le
		# fichier pour tout le monde.
		if (set -o noclobber; printf '%s\n%s\n%s\n' "$$" "$PWD" "$(_proc_start $$)" >"$lock") 2>/dev/null; then
			trap "rm -f -- '$lock'" EXIT
			# Ctrl-C / TERM : relâcher PUIS SORTIR. Sans le `exit`, bash reprend
			# l'exécution APRÈS le handler, et l'appelant irait écrire un verdict
			# calculé sur une commande interrompue — un faux vert, qui serait
			# ensuite rejoué comme vérité.
			trap "rm -f -- '$lock'; exit 130" INT
			trap "rm -f -- '$lock'; exit 143" TERM
			return 0
		fi

		holder_pid=$(awk 'NR==1' "$lock" 2>/dev/null)
		holder_wt=$(awk 'NR==2' "$lock" 2>/dev/null)
		holder_start=$(awk 'NR==3' "$lock" 2>/dev/null)
		live_start=$(_proc_start "${holder_pid:-0}")

		# Détenteur réel : le PID vit ET c'est bien le même processus qu'à la pose.
		if [ -n "${holder_pid:-}" ] && [ -n "$live_start" ] &&
			{ [ -z "$holder_start" ] || [ "$holder_start" = "$live_start" ]; }; then
			since=$(ps -o etime= -p "$holder_pid" 2>/dev/null | tr -d ' ')
			echo "⛔ $what tourne déjà (PID $holder_pid, depuis ${since:-?})."
			# Nommer le worktree détenteur : c'est LA seule information qui rend
			# le refus actionnable, puisque l'autre session est invisible d'ici.
			[ -n "${holder_wt:-}" ] && echo "   Détenu par : $holder_wt"
			echo "   Cette ressource est partagée par tous les worktrees — attends la fin."
			echo "   Pour tuer le détenteur : kill $holder_pid"
			echo "   Verrou : $lock"
			exit 2
		fi

		# Périmé : processus mort, ou PID recyclé par un autre processus.
		rm -f -- "$lock"
	done

	echo "⛔ Verrou $name impossible à poser après 3 tentatives : $lock" >&2
	echo "   On n'exécute rien plutôt que de tourner sans protection." >&2
	exit 1
}
