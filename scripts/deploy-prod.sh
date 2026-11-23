#!/bin/bash
# `pnpm deploy:prod` — mettre le site à jour, avec une nouvelle version (ADR 0021).
#
# Vercel ne déploie que la branche `production`. Ce script :
#   1. choisit le dernier commit de main à « CI Summary » vert (CI allégée de
#      main : typecheck et build ; le reste a tourné sur la PR),
#      en enjambant les commits de doc qui le suivent ; CI allégée encore en
#      cours → ne l'attend pas (la CI complète de la version la couvre) ;
#   2. crée la version (`pnpm release` : numéro, CHANGELOG, tag) et la pousse
#      sur main, sauf si ce commit est déjà une version ;
#   3. attend que la CI de ce commit de version soit verte : c'est la seule CI
#      COMPLÈTE de main (un push de main ordinaire n'a que typecheck et build,
#      quality.yml) ; rien n'entre en prod sans elle. Rouge sur un plantage
#      connu des tests navigateur → la relance lui-même, sous le verrou ;
#   4. avance `production` jusqu'à lui, en avance rapide seulement ;
#   5. verrou rendu, attend la construction de Vercel, puis vérifie que le site
#      sert la nouvelle construction et que les pages publiques répondent.
# Avant de créer quoi que ce soit (et avec `--essai`), il compare les migrations
# du commit à livrer à celles jouées en prod, en lecture seule : une migration
# pas encore jouée arrête tout, sauf celles nommées par `--migration-apres`
# (destructive : elle se joue après la mise en prod, cf. CLAUDE.md § Migrations).
# Puis il compare le schéma de la prod au `database.ts` du commit à livrer
# (« prod = dépôt », scripts/db-types/prod.ts, lecture seule) : un écart arrête
# tout. Contrôle sauté avec `--migration-apres` (l'écart est attendu) et avec
# `--sans-controle-types` (sortie de secours si le générateur de Supabase change).
# Lancé par David, ou par Claude à sa demande explicite : jamais de mise en
# prod — ni de version — à l'initiative de Claude.
#
# Pourquoi pas simplement la pointe de main ? Elle est souvent un commit de doc,
# que la CI de push ignore (filtre `paths` de quality.yml) : sans « CI
# Summary », les Deployment Checks de Vercel l'attendraient pour toujours. Les
# commits de doc qui suivent le dernier commit vérifié ne changent rien au site
# (l'ignore step les saute) : on les enjambe. Tout le reste arrête le script.
#
# Usage : pnpm deploy:prod                 version + mise en prod
#         pnpm deploy:prod --essai         montre ce qui partirait, sans rien créer
#         pnpm deploy:prod --relancer-ci   relance aussi, une fois, un échec de CI
#                                          que le script ne reconnaît pas (jugé sans
#                                          lien avec le code), sous le verrou
#         pnpm deploy:prod --migration-apres <horodatage>
#                                          laisse passer cette migration en attente
#                                          (répétable) et rappelle de la jouer à la fin
#         pnpm deploy:prod --sans-controle-types
#                                          saute le contrôle « prod = dépôt » (types de la
#                                          prod illisibles : générateur de Supabase changé)
#         pnpm deploy:prod --verifier      ne livre rien : revérifie la construction de
#                                          Vercel et les pages du site en ligne
# À lancer depuis le dépôt principal, sur main propre et à jour.
# Tests : scripts/__tests__/deploy-prod.test.ts.
set -euo pipefail

CHECK="CI Summary"
PROFONDEUR=50
# Sans `-s` : pnpm 12 ne connaît plus cette option (« unexpected argument »).
RELEASE="${DEPLOY_PROD_RELEASE:-pnpm release}"
PAUSE="${DEPLOY_PROD_PAUSE:-30}"
# 45 min : quand le cache ESLint est vide (Node monté dans .nvmrc, paquet de la config
# ESLint monté, nocturne pas encore passé), la CI de version relit tout l'arbre : 21 à
# 31 min ; à 1500 s, le script abandonnait avant le vert. Cache plein : ~5 s.
ATTENTE_MAX="${DEPLOY_PROD_ATTENTE_MAX:-2700}"
RELANCES_MAX="${DEPLOY_PROD_RELANCES_MAX:-2}"
# Plantage connu des tests navigateur, sans lien avec le code (vu sur main et sur
# des PR depuis octobre ; v0.60.0, v0.61.0, v0.63.0) : le navigateur se ferme.
# Pas `wrapDynamicImport`, présent dans TOUS les logs du job client, verts compris :
# un vrai test client rouge aurait été relancé (2026-11-08).
SIGNATURE="Browser connection was closed"
# Lecture seule de l'historique des migrations de la prod. JSON demandé : sans
# cela le format dépend de qui lance la commande (tableau au terminal).
MIGRATIONS_PROD="${DEPLOY_PROD_MIGRATIONS_PROD:-pnpm exec supabase migration list --linked --output-format json --agent no}"
# Lecture seule du schéma de la prod, comparé au database.ts du commit donné.
TYPES_PROD="${DEPLOY_PROD_TYPES_PROD:-pnpm exec tsx scripts/db-types/prod.ts --commit}"
SITE="${DEPLOY_PROD_SITE:-https://www.chiph.re}"
# Les pages du plan du site, une par une (le contrôle quotidien de production-health.yml).
SANTE="${DEPLOY_PROD_SANTE:-pnpm exec tsx scripts/check-production-health.ts}"
# Construction de Vercel puis bascule du domaine : 20 min au plus.
ATTENTE_SITE_MAX="${DEPLOY_PROD_ATTENTE_SITE_MAX:-1200}"
USAGE="Usage : pnpm deploy:prod [--essai] [--relancer-ci] [--migration-apres <horodatage>]… [--sans-controle-types] | --verifier"
essai=0
relancer_ci=0
verifier=0
sans_types=0
migrations_apres=""
attend_horodatage=0
for option in "$@"; do
	if [ "$attend_horodatage" = 1 ]; then
		attend_horodatage=0
		if ! printf '%s' "$option" | grep -qxE '[0-9]{14}'; then
			echo "⛔ --migration-apres attend l'horodatage d'une migration (14 chiffres), pas « $option »."
			exit 1
		fi
		migrations_apres="$migrations_apres $option"
		continue
	fi
	case "$option" in
	--essai) essai=1 ;;
	--relancer-ci) relancer_ci=1 ;;
	--verifier) verifier=1 ;;
	--sans-controle-types) sans_types=1 ;;
	--migration-apres) attend_horodatage=1 ;;
	*)
		echo "⛔ Option inconnue : $option"
		echo "   $USAGE"
		exit 1
		;;
	esac
done
if [ "$attend_horodatage" = 1 ]; then
	echo "⛔ --migration-apres attend l'horodatage d'une migration (14 chiffres)."
	echo "   $USAGE"
	exit 1
fi

decrire() {
	git log -1 --format='%h %s' "$1"
}

arreter() {
	echo "$1"
	[ -n "${2:-}" ] && echo "   $2"
	exit 1
}

# Note la durée d'une étape pour `pnpm durees` (scripts/durees/) : une ligne
# « date;version;étape;secondes » dans le journal du Mac mini. $1 = l'étape,
# $2 = son début (date +%s), $3 = le commit de la version. Ne fait jamais échouer
# la mise en prod : un journal impossible à écrire est ignoré.
JOURNAL_DUREES="${DUREES_ETAT:-$HOME/.local/state/durees}/mises-en-prod.csv"
noter_duree() {
	local nom
	nom="$(git tag --points-at "$3" 2>/dev/null | grep '^v' | head -1 || true)"
	{
		mkdir -p "$(dirname "$JOURNAL_DUREES")" &&
			echo "$(date -u +%Y-%m-%dT%H:%M:%SZ);${nom:-$3};$1;$(($(date +%s) - $2))" >>"$JOURNAL_DUREES"
	} 2>/dev/null || true
}

# --- Après la mise en prod : la construction de Vercel, puis le site -----------
# L'identifiant de la construction en ligne (SvelteKit : l'heure de la
# construction). Vide si le site ne répond pas.
build_en_ligne() {
	curl -fsS -m 20 "$SITE/_app/version.json" 2>/dev/null | grep -oE '[0-9]+' | head -1 || true
}

# « <état> <lien> » du statut « Vercel » posé sur le commit : pending | success |
# failure | error ; « absent » tant que Vercel n'a rien posé.
etat_vercel() {
	gh api "repos/{owner}/{repo}/commits/$1/status" \
		--jq '[.statuses[] | select(.context == "Vercel")][0] | if . == null then "absent" else "\(.state) \(.target_url)" end' 2>/dev/null ||
		echo illisible
}

# $1 = le commit de production ; $2 = la construction en ligne avant le push
# (vide : on ne peut pas comparer, ce contrôle est sauté). Aucun retour arrière
# ici : `production` a déjà avancé, et c'est David qui décide de la suite.
REVOIR="Rien n'est défait. Pour revérifier seul : pnpm deploy:prod --verifier"
verifier_le_site() {
	local sha="$1" avant="$2" attendu=0 lu etat lien sortie nom servi accueil debut
	debut="$(date +%s)"
	nom="$(git tag --points-at "$sha" | grep '^v' | head -1 || true)"
	[ -n "$nom" ] || nom="$(decrire "$sha")"
	while :; do
		lu="$(etat_vercel "$sha")"
		etat="${lu%% *}"
		lien="${lu#* }"
		case "$etat" in
		success) break ;;
		failure | error)
			arreter "⛔ La construction Vercel de $nom a échoué : l'ancienne version reste en ligne." "$lien — production pointe déjà sur ce commit. $REVOIR"
			;;
		esac
		[ "$attendu" -lt "$ATTENTE_SITE_MAX" ] ||
			arreter "⏳ Vercel n'a pas fini de construire $nom après ${attendu} s." "$REVOIR"
		echo "⏳ Vercel construit ${nom}… (${attendu} s)"
		sleep "$PAUSE"
		attendu=$((attendu + (PAUSE > 0 ? PAUSE : 1)))
	done
	# Durées notées seulement à la suite d'une livraison ($avant lu) : `--verifier`
	# arrive après coup, il ne mesurerait rien.
	[ -z "$avant" ] || noter_duree vercel "$debut" "$sha"
	debut="$(date +%s)"
	# Construit ne veut pas dire servi : le domaine bascule après les contrôles de Vercel.
	if [ -n "$avant" ]; then
		# Lecture vide (site injoignable un instant, pendant la bascule) : ce n'est
		# pas « la nouvelle construction », on relit.
		while :; do
			servi="$(build_en_ligne)"
			[ -z "$servi" ] || [ "$servi" = "$avant" ] || break
			if [ "$attendu" -ge "$ATTENTE_SITE_MAX" ]; then
				[ -n "$servi" ] || arreter "⛔ Vercel a construit $nom, mais $SITE ne répond pas." "$REVOIR"
				arreter "⏳ Vercel a construit $nom, mais $SITE sert encore l'ancienne construction." "$REVOIR"
			fi
			echo "⏳ $SITE ne sert pas encore la nouvelle construction… (${attendu} s)"
			sleep "$PAUSE"
			attendu=$((attendu + (PAUSE > 0 ? PAUSE : 1)))
		done
		noter_duree bascule "$debut" "$sha"
	fi
	# Mode maintenance (pnpm maintenance:on) : tout répond 503 avec la page de
	# maintenance (src/lib/server/maintenance.ts), ce n'est pas une panne. Un 503
	# sans cette page en est une : le contrôle des pages le dira.
	accueil="$(curl -s -m 20 -w '\n%{http_code}' "$SITE/" || true)"
	if [ "$(printf '%s\n' "$accueil" | tail -1)" = 503 ] && printf '%s\n' "$accueil" | grep -q '<title>Maintenance'; then
		echo "🚧 $nom est construite, mais le mode maintenance est actif ($SITE répond 503) : pages non vérifiées."
		echo "   Après pnpm maintenance:off : pnpm deploy:prod --verifier"
		return 0
	fi
	echo "Vérification des pages publiques de ${SITE}…"
	if sortie="$($SANTE "$SITE" 2>&1)"; then
		echo "✅ $nom en ligne. $(printf '%s\n' "$sortie" | grep . | tail -1)"
	else
		printf '%s\n' "$sortie" | grep -v '^  OK' | grep . || true
		arreter "⛔ $nom est en ligne, mais le contrôle des pages publiques a échoué." "Aucun retour arrière automatique : à toi de décider. $REVOIR"
	fi
}

if [ "$verifier" = 1 ]; then
	git fetch -q origin production
	verifier_le_site "$(git rev-parse origin/production)" ""
	exit 0
fi

# Verrou noyau « deploy » (scripts/lib/lock.py), dans le répertoire git commun à
# tous les worktrees : tant qu'il est tenu, le hook .claude/hooks/garde-commandes.py
# refuse aux sessions Claude `gh pr merge` et les commits ou pushes sur main. Un
# main qui bouge fait refuser le push de la version, et chaque merge relance la
# CI que le script attend (2026-10-13 : cinq merges en une heure). Un second
# deploy:prod sort en exit 2. `--essai` ne crée rien : pas de verrou.
#
# Le verrou ne couvre que la livraison (étapes 0 à 4). Une fois `production`
# avancée, il est rendu : la vérification du site (étape 5) attend Vercel
# plusieurs minutes sans rien créer, les merges peuvent reprendre. Le script sous
# verrou écrit dans $DEPLOY_PROD_LIVRE le commit livré et la construction en ligne
# juste avant le push (lue plus tôt, une autre construction passée pendant
# l'attente de la CI ferait croire la nouvelle déjà servie) ; fichier vide = rien de livré.
if [ "$essai" = 0 ] && [ -z "${DEPLOY_PROD_SOUS_VERROU:-}" ]; then
	livre="$(mktemp)"
	trap 'rm -f "$livre"' EXIT
	code=0
	DEPLOY_PROD_SOUS_VERROU=1 DEPLOY_PROD_LIVRE="$livre" python3 "$(dirname "${BASH_SOURCE[0]}")/lib/lock.py" \
		deploy "pnpm deploy:prod" -- bash "${BASH_SOURCE[0]}" "$@" || code=$?
	[ "$code" = 0 ] || exit "$code"
	[ -s "$livre" ] || exit 0
	read -r livre_sha build_avant <"$livre" || true
	verifier_le_site "$livre_sha" "${build_avant:-}"
	[ -z "$migrations_apres" ] ||
		echo "👉 Reste à jouer en prod, laissée(s) pour après la mise en prod :$migrations_apres (pnpm db:migrate)."
	exit 0
fi

# success | failure | cancelled | pending | absent
etat_ci() {
	# Workflow encore en cours → « en cours », quoi que dise « CI Summary » :
	# il n'existe qu'une fois les autres jobs finis (absent pendant toute la CI,
	# vu le 2026-10-10 au premier deploy:prod), et pendant une relance il garde
	# la conclusion rouge de la tentative précédente.
	case "$(gh run list --workflow quality.yml --commit "$1" --json status --jq '.[0].status // "aucun"')" in
	aucun | completed) ;;
	*)
		echo pending
		return
		;;
	esac
	gh api "repos/{owner}/{repo}/commits/$1/check-runs?check_name=CI%20Summary" \
		--jq '.check_runs[0] | if . == null then "absent" elif .status != "completed" then "pending" else .conclusion end'
}

# Le run de quality.yml d'un commit (vide s'il n'y en a pas).
run_de() {
	gh run list --workflow quality.yml --commit "$1" --json databaseId --jq '.[0].databaseId // empty'
}

# Vrai si TOUS les jobs rouges du run de ce commit — « CI Summary » mis à part,
# rouge par conséquence — sont tombés sur le plantage connu. Un seul job rouge
# pour une autre raison, ou des logs illisibles : faux (une vraie erreur ne se
# relance pas). Les jobs rouges se lisent dans la liste des jobs, pas dans les
# logs : un job en timeout ou tombé au setup n'a pas de log d'étape échouée.
plantage_connu() {
	local run log rouges jobs job
	run="$(run_de "$1")" || return 1
	[ -n "$run" ] || return 1
	rouges="$(gh run view "$run" --json jobs \
		--jq '.jobs[] | select(.conclusion != "success" and .conclusion != "skipped" and .conclusion != "neutral") | .name' 2>/dev/null)" || return 1
	log="$(gh run view "$run" --log-failed 2>/dev/null)" || return 1
	jobs="$(printf '%s\n' "$rouges" | grep -vx -e "$CHECK" -e '' | sort -u)" || return 1
	while IFS= read -r job; do
		# awk cherche lui-même et lit tout : `| grep -q` s'arrêtait au premier résultat,
		# awk écrivait dans un tuyau fermé et, sous pipefail, l'échec masquait la
		# signature trouvée (deploy:prod du 2026-11-08, relancé par --relancer-ci).
		printf '%s\n' "$log" | awk -F'\t' -v j="$job" -v s="$SIGNATURE" \
			'$1 == j && index($0, s) { t = 1 } END { exit !t }' || return 1
	done <<<"$jobs"
}

# Relance les jobs rouges du run de ce commit, sous le verrou, si c'est permis :
# plantage connu (au plus RELANCES_MAX fois par commit), ou `--relancer-ci`
# (une fois). Vrai si relancé. Rendre le verrou pour relancer à la main laissait
# les merges annuler la relance en attente (2026-11-02, v0.63.0 : groupe de
# concurrence de quality.yml, un seul run en attente par ref).
relance_sha=""
relance_n=0
relancer() {
	local sha="$1" etat="$2" motif run
	[ "$essai" = 0 ] || return 1
	[ "$sha" = "$relance_sha" ] || {
		relance_sha="$sha"
		relance_n=0
	}
	[ "$relance_n" -lt "$RELANCES_MAX" ] || return 1
	if [ "$relancer_ci" = 1 ]; then
		motif="--relancer-ci"
		relancer_ci=0
	elif [ "$etat" = failure ] && plantage_connu "$sha"; then
		motif="plantage connu (navigateur fermé)"
	else
		return 1
	fi
	relance_n=$((relance_n + 1))
	run="$(run_de "$sha")"
	[ -n "$run" ] || arreter "⛔ Aucun run de CI à relancer pour $(decrire "$sha")." "Rien n'est mis en prod."
	gh run rerun "$run" --failed ||
		arreter "⛔ gh n'a pas pu relancer la CI de $(decrire "$sha")." "Rien n'est mis en prod."
	echo "🔁 $motif sur $(decrire "$sha") : relance $relance_n/$RELANCES_MAX sous le verrou"
	# Attendre que GitHub repasse le run « en cours » : relu trop tôt, il rendrait
	# encore la conclusion rouge de la tentative précédente (et une 2e relance
	# sur un run en cours, que gh refuse). Au plus 10 pauses, puis on relit quand même.
	for _ in 1 2 3 4 5 6 7 8 9 10; do
		sleep "$PAUSE"
		[ "$(gh run view "$run" --json status --jq .status 2>/dev/null)" = completed ] || break
	done
}

# Ajouté aux arrêts sur CI rouge.
CONSEIL="Échec sans lien avec le code ? pnpm deploy:prod --relancer-ci le relance sous le verrou."

# Vrai si la CI de push ignore ce commit (même filtre que quality.yml) : rien
# que de la doc, hors data/corrections, src/ et static/.
sans_ci() {
	git diff-tree --no-commit-id --name-only -r -m --first-parent "$1" | while IFS= read -r f; do
		case "$f" in
		data/* | src/* | static/*) exit 1 ;;
		docs/* | *.md | .github/dependabot.yml) ;;
		*) exit 1 ;;
		esac
	done
}

# Les migrations du commit à livrer ($1) sont-elles jouées en prod ? Lecture
# seule. Le code livré peut dépendre d'une colonne ou d'une fonction que la
# prod n'a pas encore : une migration en attente arrête tout, avant la version.
# Exception nommée : `--migration-apres` (destructive, jouée après la mise en
# prod) ; un horodatage qui n'est pas en attente arrête aussi (faute de frappe).
controler_migrations() {
	local fichiers commit lu prod attente avance reste m
	# `<commit>:<chemin>` part de la racine du dépôt, quel que soit le dossier courant.
	fichiers="$(git ls-tree --name-only "$1:supabase/migrations" 2>/dev/null |
		grep -E '^[0-9]{14}_.*\.sql$' | sed 's|^|supabase/migrations/|' || true)"
	commit="$(printf '%s\n' "$fichiers" | grep -oE '/[0-9]{14}_' | tr -d '/_' | sort -u || true)"
	# Aucune migration lue dans le commit : le contrôle ne contrôlerait rien.
	[ -n "$commit" ] || arreter "⛔ Aucune migration trouvée dans $(decrire "$1") (supabase/migrations)." "Contrôle impossible, donc rien n'est créé."
	if ! lu="$($MIGRATIONS_PROD 2>&1)"; then
		printf '%s\n' "$lu" | tail -3
		arreter "⛔ Impossible de lire les migrations jouées en prod." "Contrôle non fait, donc rien n'est créé. Vérifier : pnpm exec supabase migration list --linked"
	fi
	prod="$(printf '%s\n' "$lu" | grep -oE '"remote"[[:space:]]*:[[:space:]]*"[0-9]{14}"' | grep -oE '[0-9]{14}' | sort -u || true)"
	attente="$(comm -23 <(printf '%s\n' "$commit") <(printf '%s\n' "$prod") | grep . || true)"
	avance="$(comm -13 <(printf '%s\n' "$commit") <(printf '%s\n' "$prod") | grep . || true)"
	reste="$attente"
	for m in $migrations_apres; do
		printf '%s\n' "$attente" | grep -qx "$m" ||
			arreter "⛔ --migration-apres $m : cette migration n'est pas en attente (déjà jouée en prod, ou absente du commit à livrer)." "Rien n'est créé."
		reste="$(printf '%s\n' "$reste" | grep -vx "$m" || true)"
	done
	if [ -n "$reste" ]; then
		echo "⛔ $(printf '%s\n' "$reste" | wc -l | tr -d ' ') migration(s) du commit à livrer ne sont pas jouées en prod :"
		for m in $reste; do
			echo "   $(printf '%s\n' "$fichiers" | grep "/${m}_" | head -1)"
		done
		[ -n "$prod" ] || echo "   (aucune migration lue en prod : le format de la CLI Supabase a-t-il changé ?)"
		arreter "   Oubliée : pnpm db:migrate, puis relancer. À jouer après la mise en prod (destructive) : relancer avec --migration-apres <horodatage>." "Rien n'est créé."
	fi
	if [ -n "$avance" ]; then
		echo "⚠️  Jouée(s) en prod mais absente(s) du commit à livrer (la prod tourne déjà avec) :" $avance
	fi
	if [ -n "$migrations_apres" ]; then
		echo "✅ migrations : prod à jour, sauf$migrations_apres (à jouer après la mise en prod)."
	else
		echo "✅ migrations : les $(printf '%s\n' "$commit" | grep -c . || true) du commit à livrer sont jouées en prod."
	fi
}

# La base de la prod est-elle celle que le dépôt décrit ? Lecture seule. Les
# migrations peuvent être toutes « jouées » et la prod différer quand même :
# table retouchée au Dashboard, migration modifiée après coup. Le code livré
# est typé par database.ts : s'il ne décrit pas la prod, le typecheck vert ne
# garantit rien.
controler_types() {
	local sortie
	if [ "$sans_types" = 1 ]; then
		echo "⚠️  Contrôle « prod = dépôt » sauté (--sans-controle-types)."
		return 0
	fi
	if [ -n "$migrations_apres" ]; then
		echo "⚠️  Contrôle « prod = dépôt » NON FAIT : la prod garde ce que retire(nt)$migrations_apres. Après pnpm db:migrate : pnpm db:types:prod"
		return 0
	fi
	if sortie="$($TYPES_PROD "$1" 2>&1)"; then
		# Sans ligne ✅ (message changé), montrer la sortie plutôt que s'arrêter sans un mot.
		printf '%s\n' "$sortie" | grep '^✅' | tail -1 | grep . || printf '%s\n' "$sortie"
	else
		printf '%s\n' "$sortie" | grep -v -e '^\$ ' -e ELIFECYCLE | grep . || true
		arreter "⛔ Contrôle « prod = dépôt » : la prod n'est pas la base que décrit $(decrire "$1")." "Rien n'est créé. Pour le rejouer seul : pnpm db:types:prod. Types de la prod illisibles (générateur changé) : relancer avec --sans-controle-types."
	fi
}

# --- 0. main local propre et à jour -----------------------------------------
[ "$(git branch --show-current)" = "main" ] || arreter "⛔ À lancer sur main (branche actuelle : $(git branch --show-current))."
[ -z "$(git status --porcelain --untracked-files=no)" ] || arreter "⛔ main a des modifications non commitées."
git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
	# Nommer les commits en cause : sous le verrou, une autre session ne peut plus pousser le sien.
	git log --format='   non poussé : %h %s' origin/main..HEAD
	git log --format='   à tirer    : %h %s' HEAD..origin/main
	arreter "⛔ main local diffère de origin/main." "git pull --ff-only (ou laisser l'autre session pousser), puis relancer."
fi

# --- 1. le dernier commit vérifié -------------------------------------------
# La CI ALLÉGÉE de main (typecheck et build) encore en cours n'est pas attendue
# (2026-11-23) : la CI COMPLÈTE de la version (étape 3) la couvre et reste la
# seule garde de la prod, et quality.yml la fait tourner À CÔTÉ de celle du
# merge (groupe de concurrence propre aux commits de version). L'attendre
# coûtait ~6 min à une mise en prod lancée juste après un merge (6 sur 18 du
# 14 au 23/11). Une CI de main ROUGE arrête toujours tout.
cible=""
for c in $(git rev-list --first-parent -n "$PROFONDEUR" origin/main); do
	etat="$(etat_ci "$c")"
	case "$etat" in
	success)
		cible="$c"
		break
		;;
	absent)
		sans_ci "$c" || arreter "⛔ Commit de code sans « $CHECK » : $(decrire "$c")" "Sa CI n'a pas tourné. Rien n'est créé."
		echo "↷ enjambé (doc seule, sans CI) : $(decrire "$c")"
		;;
	pending)
		echo "⏩ CI allégée en cours sur $(decrire "$c") : non attendue, la CI complète de la version fait foi."
		cible="$c"
		break
		;;
	*)
		if relancer "$c" "$etat"; then
			echo "⏩ CI de $(decrire "$c") relancée : non attendue, la CI complète de la version fait foi."
			cible="$c"
			break
		fi
		arreter "⛔ « $CHECK » = $etat sur $(decrire "$c")" "Rien n'est créé. $CONSEIL"
		;;
	esac
done
[ -n "$cible" ] || arreter "⛔ Aucun commit vérifié par la CI dans les $PROFONDEUR derniers de main."

prod=""
if git ls-remote --exit-code origin refs/heads/production >/dev/null 2>&1; then
	git fetch -q origin production
	prod="$(git rev-parse origin/production)"
	[ "$prod" != "$cible" ] || {
		echo "✅ production est déjà sur $(decrire "$cible") : rien à livrer."
		echo "   Le site n'est pas revérifié ici : pnpm deploy:prod --verifier"
		exit 0
	}
	git merge-base --is-ancestor "$prod" "$cible" ||
		arreter "⛔ production ($(decrire "$prod")) n'est pas un ancêtre de $(decrire "$cible")." "Jamais de force-push : à examiner à la main."
	echo "À livrer, $(git rev-list --count --first-parent "$prod..$cible") commit(s) de main :"
	git log --first-parent --format='  %h %s' "$prod..$cible"
else
	echo "Première mise en prod par la branche production : $(decrire "$cible")."
fi

controler_migrations "$cible"
controler_types "$cible"

if [ "$essai" = 1 ]; then
	echo "(--essai : rien n'est créé, rien n'est poussé)"
	exit 0
fi

# --- 2. la version ------------------------------------------------------------
# Début de la CI de la version, si elle est créée ici ; vide sinon (version déjà
# là, CI relancée) : l'attente ne serait pas la durée d'une CI, rien n'est noté.
debut_ci=""
if git tag --points-at "$cible" | grep -q '^v'; then
	version="$cible"
	echo "Déjà une version : $(git tag --points-at "$cible" | grep '^v' | head -1)."
else
	$RELEASE
	version="$(git rev-parse HEAD)"
	[ "$version" != "$cible" ] || arreter "⛔ pnpm release n'a créé aucun commit."
	tag="$(git tag --points-at "$version" | grep '^v' | head -1)"
	[ -n "$tag" ] || arreter "⛔ Le commit de version n'a pas de tag v…"
	git push -q origin main "refs/tags/$tag" ||
		arreter "⛔ Push de la version refusé (main a-t-il bougé ?)." "Version $tag locale, non publiée : à examiner."
	echo "🏷  $tag poussée sur main : $(decrire "$version")"
	debut_ci="$(date +%s)"
fi

# --- 3. la CI de la version ---------------------------------------------------
attendu=0
while :; do
	etat="$(etat_ci "$version")"
	case "$etat" in
	success) break ;;
	# Seule CI complète de main : deux PR vertes chacune peuvent casser ici une fois
	# réunies. La version et son tag restent (GitHub Release comprise) ; la suivante
	# prendra le numéro d'après.
	failure | cancelled | timed_out)
		if relancer "$version" "$etat"; then
			attendu=0
			debut_ci=""
			continue
		fi
		arreter "⛔ « $CHECK » = $etat sur la version $(decrire "$version")." "Rien n'est mis en prod. Lire la CI de la version, corriger par une PR, merger, puis relancer pnpm deploy:prod. $CONSEIL"
		;;
	esac
	[ "$attendu" -lt "$ATTENTE_MAX" ] ||
		arreter "⏳ CI de la version toujours pas verte après ${ATTENTE_MAX} s." "Relancer pnpm deploy:prod plus tard : la version existe, seule la mise en prod reste."
	echo "⏳ CI de la version : ${etat}… (${attendu} s)"
	sleep "$PAUSE"
	attendu=$((attendu + PAUSE))
done

[ -z "$debut_ci" ] || noter_duree ci-version "$debut_ci" "$version"

# --- 4. la mise en prod -------------------------------------------------------
build_avant="$(build_en_ligne)"
git push -q origin "$version:refs/heads/production"
echo "🚀 production → $(decrire "$version"). Vercel construit."
[ -z "${DEPLOY_PROD_LIVRE:-}" ] || echo "$version $build_avant" >"$DEPLOY_PROD_LIVRE"
