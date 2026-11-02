#!/bin/bash
# Hooks pre-commit et pre-push : rien sur main pendant `pnpm deploy:prod`.
#
# Tant que deploy-prod.sh tient le verrou « deploy » (scripts/lib/lock.py), un
# commit sur main ou un push vers main est refusé. Un main qui bouge fait
# refuser le push de la version, un commit posé dans le dépôt principal entre
# l'étape 0 et `pnpm release` entrerait DANS le commit de version, et chaque
# push relance — ou annule en attente — la CI que le script attend.
#
# Pourquoi ici, et pas seulement dans .claude/hooks/garde-commandes.py : ce hook
# ne juge une commande qu'à son lancement, sur sa forme écrite. Une commande
# lancée juste avant le verrou, `bash -c "git push"` ou un script qui pousse
# passaient (diagnostic du 2026-11-01). Un hook git tourne au moment même du
# commit ou du push, quelle qu'en soit la forme. Seul le merge côté serveur
# (`gh pr merge`) lui échappe : le hook Claude le garde.
#
# deploy-prod.sh lui-même passe : il pose DEPLOY_PROD_SOUS_VERROU, héritée par
# `pnpm release` et ses `git push`. Un humain pressé a `--no-verify`.
#
# Usage : garde-deploy-en-cours.sh commit   (pre-commit)
#         garde-deploy-en-cours.sh push     (pre-push : lit les refs poussées
#                                            sur l'entrée standard)
# Tests : scripts/__tests__/garde-deploy-en-cours.test.ts.
set -uo pipefail

LOCK="$(dirname "${BASH_SOURCE[0]}")/lib/lock.py"

case "${1:-}" in
commit)
	[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ] || exit 0
	quoi="commit sur main"
	;;
push)
	# Lire toute l'entrée, même quand une ligne suffit : pre-push la fournit d'un bloc
	vers_main=0
	while read -r _ _ distante _; do
		[ "$distante" = "refs/heads/main" ] && vers_main=1
	done
	[ "$vers_main" = 1 ] || exit 0
	quoi="push vers main"
	;;
*)
	echo "usage : garde-deploy-en-cours.sh commit|push" >&2
	exit 1
	;;
esac

[ -n "${CI:-}" ] && exit 0
[ -n "${DEPLOY_PROD_SOUS_VERROU:-}" ] && exit 0
python3 "$LOCK" --tenu deploy || exit 0

echo "⛔ $quoi refusé : pnpm deploy:prod est en cours (verrou « deploy »)." >&2
echo "   Attendre la fin de la mise en prod, puis recommencer : rien n'est perdu." >&2
exit 1
