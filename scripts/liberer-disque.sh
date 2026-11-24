#!/bin/bash
# Libère de la place sur le disque du Mac mini, sans redémarrer (`pnpm disque:liberer`).
#
# Le 2026-11-24, 13 → 26 Go libres à la main : images Docker inutilisées, cache
# Homebrew, restes de mises à jour de VS Code, anciennes versions de Claude Code,
# worktrees finis. Ce script refait les gestes sûrs et LISTE les autres.
#
# Supprime seul (sûr) :
# - images Docker qu'aucun conteneur n'utilise ;
# - cache Homebrew ;
# - restes de mises à jour de VS Code ;
# - versions de Claude Code ni actuelle, ni utilisée par une session ouverte
#   (supprimer une version en usage ne libère rien avant la fin de la session) ;
# - paquets du magasin pnpm qu'aucun projet n'utilise plus.
# Liste seulement, avec la commande à taper :
# - worktrees finis (tout leur travail est dans origin/main, rien de modifié,
#   aucun processus dedans) ;
# - cache de Brave, mise à jour de macOS préparée (demande un redémarrage),
#   sessions Claude anciennes.
# Chaque étape affiche la commande qu'elle lance : on peut la refaire à la main.
#
# Usage : liberer-disque.sh [--essai]   (--essai : montre, ne supprime rien)
# Tests : scripts/__tests__/liberer-disque.test.ts.
set -uo pipefail

# shellcheck source=machine-commun.sh
. "$(dirname "$0")/machine-commun.sh"
initialiser_depot "$(dirname "$0")"

VOLUME_DISQUE="${SURVEILLANCE_DISQUE:-/System/Volumes/Data}"
[ -d "$VOLUME_DISQUE" ] || VOLUME_DISQUE=/
VOLUME_PREBOOT="${BILAN_PREBOOT:-/System/Volumes/Preboot}"
VERSIONS_CLAUDE="${LIBERER_VERSIONS_CLAUDE:-$HOME/.local/share/claude/versions}"
LIEN_CLAUDE="${LIBERER_LIEN_CLAUDE:-$HOME/.local/bin/claude}"
CACHE_VSCODE="${LIBERER_CACHE_VSCODE:-$HOME/Library/Caches/com.microsoft.VSCode.ShipIt}"
CACHE_BRAVE="${LIBERER_CACHE_BRAVE:-$HOME/Library/Caches/BraveSoftware}"

essai=0
case "${1:-}" in
"") ;;
--essai) essai=1 ;;
*)
	echo "Usage : $0 [--essai]" >&2
	exit 2
	;;
esac

# ── Outils ────────────────────────────────────────────────────────────────────

libre_ko() { df -k "$VOLUME_DISQUE" 2>/dev/null | awk 'NR == 2 { print $4 + 0 }'; }
go() { LC_ALL=C awk -v k="$1" 'BEGIN { printf "%.1f", k / 1048576 }' | sed 's/\./,/'; }
taille_ko() { du -sk "$@" 2>/dev/null | awk '{ s += $1 } END { print s + 0 }'; }

# Lance une étape : <libellé> <commande…>. Affiche la commande, mesure le gain.
etape() {
	local libelle="$1" avant apres
	shift
	if [ "$essai" = 1 ]; then
		printf '  %-34s (essai) %s\n' "$libelle" "$*"
		return 0
	fi
	avant="$(libre_ko)"
	"$@" >/dev/null 2>&1
	apres="$(libre_ko)"
	printf '  %-34s %6s Go   %s\n' "$libelle" "$(go $(((${apres:-0} - ${avant:-0}) > 0 ? apres - avant : 0)))" "$*"
}

# ── Avant ─────────────────────────────────────────────────────────────────────
debut="$(libre_ko)"
echo "Disque : $(go "${debut:-0}") Go libres"
[ "$essai" = 1 ] && echo "(essai : rien n'est supprimé)"
echo

# ── Gestes sûrs ───────────────────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
	etape "Docker (images inutilisées)" docker image prune -a -f
else
	echo "  Docker : pas lancé, sauté"
fi

if command -v brew >/dev/null 2>&1; then
	etape "Homebrew (cache)" brew cleanup --prune=all
fi

if [ -d "$CACHE_VSCODE" ] && [ -n "$(ls -A "$CACHE_VSCODE" 2>/dev/null)" ]; then
	etape "VS Code (mises à jour)" find "$CACHE_VSCODE" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
fi

# Versions de Claude Code : garder l'actuelle (cible du lien) et celles en usage.
if [ -d "$VERSIONS_CLAUDE" ]; then
	actuelle="$(readlink "$LIEN_CLAUDE" 2>/dev/null)"
	a_supprimer=()
	for f in "$VERSIONS_CLAUDE"/*; do
		[ -f "$f" ] || continue
		[ "$f" = "$actuelle" ] && continue
		[ -n "$(lsof -t "$f" 2>/dev/null)" ] && continue
		a_supprimer+=("$f")
	done
	if [ "${#a_supprimer[@]}" -gt 0 ]; then
		noms=""
		for f in "${a_supprimer[@]}"; do noms+=" ${f##*/}"; done
		etape "Claude Code (${#a_supprimer[@]} versions :$noms)" rm -f "${a_supprimer[@]}"
	fi
fi

if command -v pnpm >/dev/null 2>&1; then
	etape "pnpm (paquets inutilisés)" pnpm store prune
fi

# ── Après ─────────────────────────────────────────────────────────────────────
if [ "$essai" = 0 ]; then
	fin="$(libre_ko)"
	echo
	echo "Disque : $(go "${fin:-0}") Go libres (+$(go $(((${fin:-0} - ${debut:-0}) > 0 ? fin - debut : 0))) Go)"
fi

# ── À faire à la main ─────────────────────────────────────────────────────────
echo
echo "À faire à la main :"
rien=1

# Worktrees finis : tout le travail dans origin/main, rien de modifié, aucun
# processus dont le dossier courant est dedans (serveur de dev, session Claude).
if [ -n "${DEPOT_COMMUN:-}" ]; then
	principal="$(dirname "$DEPOT_COMMUN")"
	git -C "$principal" fetch -q origin 2>/dev/null
	dossiers_courants="$(lsof -a -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
	while read -r ligne; do
		dossier="${ligne#worktree }"
		[ "$dossier" = "$principal" ] && continue
		[ -d "$dossier" ] || continue
		branche="$(git -C "$dossier" branch --show-current 2>/dev/null)"
		[ -n "$branche" ] || continue
		[ "$(git -C "$dossier" rev-list --count origin/main..HEAD 2>/dev/null)" = 0 ] || continue
		[ -z "$(git -C "$dossier" status --porcelain 2>/dev/null)" ] || continue
		grep -qxF "$dossier" <<<"$dossiers_courants" && continue
		grep -qF "$dossier/" <<<"$dossiers_courants" && continue
		echo "  worktree fini : ${dossier##*/} ($(go "$(taille_ko "$dossier")") Go)"
		echo "    git -C $principal worktree remove $dossier && git -C $principal branch -d $branche"
		rien=0
	done < <(git -C "$principal" worktree list --porcelain 2>/dev/null | grep '^worktree ')
fi

if [ -d "$CACHE_BRAVE" ]; then
	brave_ko="$(taille_ko "$CACHE_BRAVE")"
	if [ "$brave_ko" -ge 1048576 ]; then
		echo "  cache de Brave : $(go "$brave_ko") Go → Brave, Réglages → Confidentialité → Effacer les données de navigation → Images et fichiers en cache"
		rien=0
	fi
fi

preboot_ko="$(df -k "$VOLUME_PREBOOT" 2>/dev/null | awk 'NR == 2 { print $3 + 0 }')"
if [ -n "$preboot_ko" ] && [ "$preboot_ko" -ge $((10 * 1048576)) ]; then
	echo "  mise à jour de macOS préparée : Preboot à $(go "$preboot_ko") Go → l'installer libère ~15 Go, mais REDÉMARRE le Mac"
	rien=0
fi

vieilles="$(sessions_claude | awk '$1 >= 7 * 86400' | grep -c .)"
if [ "$vieilles" -gt 0 ]; then
	echo "  sessions Claude de plus de 7 jours : $vieilles → les fermer libère leur mémoire et leur version de Claude Code"
	rien=0
fi

[ "$rien" = 1 ] && echo "  rien"
echo
echo "Le détail de ce qui pèse : pnpm machine:bilan"
