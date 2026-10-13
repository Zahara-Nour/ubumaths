#!/bin/bash
# Hook pre-commit : pas de commit sur un main en retard sur origin/main.
#
# Le main du dépôt principal est partagé par toutes les sessions. Un commit posé
# sur un main en retard devra être rebasé avant le push ; si ce rebase échoue et
# que la session republie ses commits par un autre chemin, le main local diverge
# d'origin/main et `pnpm deploy:prod` refuse de partir (2026-10-13). On impose
# donc le `git pull --rebase` AVANT le commit, quand il ne coûte rien.
#
# Seulement sur main (une branche de chantier suit origin/main par merge, quand
# elle veut). Hors ligne, ou sans origin, on laisse passer : le garde-fou ne doit
# pas empêcher de travailler. Pas en CI.
#
# Tests : scripts/__tests__/garde-main-a-jour.test.ts.
set -uo pipefail

[ -n "${CI:-}" ] && exit 0
[ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" = "main" ] || exit 0
# Le commit qui conclut un merge, un cherry-pick ou un revert : il intègre justement
# ce qui manquait, ou ne peut plus attendre (un rebase, lui, a HEAD détaché).
for en_cours in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD; do
	git rev-parse -q --verify "$en_cours" >/dev/null && exit 0
done
# Réseau qui ne répond pas : le commit n'attend pas le délai de connexion SSH.
GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh} -o ConnectTimeout=5" git fetch -q origin main 2>/dev/null || exit 0
git rev-parse -q --verify origin/main >/dev/null || exit 0

if ! git merge-base --is-ancestor origin/main HEAD; then
	retard="$(git rev-list --count HEAD..origin/main)"
	echo "⛔ main a $retard commit(s) de retard sur origin/main : une autre session a poussé." >&2
	echo "   git pull --rebase, puis recommiter (le travail est toujours là, rien n'est commité)." >&2
	echo "   Si le pull échoue : s'arrêter et prévenir David — jamais republier ailleurs." >&2
	exit 1
fi
exit 0
