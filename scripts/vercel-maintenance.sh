#!/bin/bash
# Pilote le mode maintenance du site en production (Vercel).
#
#   pnpm maintenance:on      active la maintenance + redeploy
#   pnpm maintenance:off     désactive + redeploy
#   pnpm maintenance:status  affiche l'état actuel
#
# Mécanique : pose/retire MAINTENANCE_MODE + MAINTENANCE_BYPASS_SECRET sur
# l'environnement Production, puis REDEPLOIE le dernier déploiement prod
# (vercel redeploy) — ce qui rejoue le build avec les nouvelles variables
# SANS déployer l'arbre de travail local.
#
# Prérequis : vercel CLI >= 54 authentifié + projet lié (.vercel/project.json).
set -euo pipefail

cmd="${1:-status}"

latest_prod_url() {
	vercel ls --prod 2>/dev/null | grep -Eo 'https://[a-z0-9.-]+\.vercel\.app' | head -1
}

redeploy_prod() {
	local url
	url="$(latest_prod_url)"
	if [ -z "$url" ]; then
		echo "⚠️  Impossible de trouver un déploiement prod à redéployer. Lance 'vercel --prod' manuellement." >&2
		return 1
	fi
	echo "♻️  Redeploy du dernier déploiement prod : $url"
	vercel redeploy "$url" --target production
}

case "$cmd" in
on)
	# Réutilise un secret fourni, sinon en génère un.
	secret="${MAINTENANCE_BYPASS_SECRET:-$(openssl rand -hex 16)}"
	# rm-then-add pour éviter l'erreur "variable déjà existante".
	vercel env rm MAINTENANCE_MODE production -y 2>/dev/null || true
	vercel env rm MAINTENANCE_BYPASS_SECRET production -y 2>/dev/null || true
	printf 'true' | vercel env add MAINTENANCE_MODE production
	printf '%s' "$secret" | vercel env add MAINTENANCE_BYPASS_SECRET production
	echo ""
	echo "✅ Maintenance ACTIVÉE. Secret de bypass : $secret"
	echo "   Accès opérateur : https://<ton-domaine>/?bypass=$secret"
	redeploy_prod
	;;
off)
	vercel env rm MAINTENANCE_MODE production -y 2>/dev/null || true
	vercel env rm MAINTENANCE_BYPASS_SECRET production -y 2>/dev/null || true
	echo "✅ Maintenance DÉSACTIVÉE (variables retirées)."
	redeploy_prod
	;;
status)
	out="$(vercel env ls production 2>/dev/null | grep -i MAINTENANCE || true)"
	if [ -n "$out" ]; then
		echo "🛠️  Maintenance configurée :"
		echo "$out"
	else
		echo "🟢 MAINTENANCE_MODE non défini → site en ligne."
	fi
	;;
*)
	echo "Usage: $0 {on|off|status}" >&2
	exit 1
	;;
esac
