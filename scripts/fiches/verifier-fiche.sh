#!/usr/bin/env bash
# Vérification complète d'une fiche EN RÉDACTION (dossier md/ sol/ en/ sol-en/) :
#   1. Typst par le vrai générateur (FR/EN, énoncé/corrigé) + erreurs de formule ;
#   2. compilation par le compilateur EXACT de la production (typst.ts 0.6.1-rc5) ;
#   3. débords de colonne (texte ET tracés) ;
#   4. pages en images, à RELIRE (les détecteurs ne voient pas tout).
# Guide : docs/ref/fiches-exercices.md
#
# Usage : pnpm fiche:verifier <dossier> [titre de la fiche]
set -u
DOSSIER=${1:?Usage : pnpm fiche:verifier <dossier> [titre de la fiche]}
TITRE=${2:-Fiche en rédaction}
PY=${PYTHON_FICHES:-scripts/fiches/.venv/bin/python}
if ! "$PY" -c 'import fitz' 2>/dev/null; then
	echo "⛔ PyMuPDF introuvable pour $PY. Une fois pour toutes :"
	echo "   python3 -m venv scripts/fiches/.venv && scripts/fiches/.venv/bin/pip install pymupdf"
	exit 2
fi
ECHEC=0
echo "== 1. Typst (générateur de l'application)"
pnpm -s tsx scripts/fiches/rendu-fiche.ts "$DOSSIER" "$TITRE" || ECHEC=1
echo "== 2. Compilation prod"
node scripts/fiches/compile-prod.mjs "$DOSSIER"/{fiche,corrige,fiche-en,corrige-en}.typ || ECHEC=1
echo "== 3. Débords de colonne"
"$PY" scripts/fiches/debord.py "$DOSSIER"/{fiche,corrige,fiche-en,corrige-en}.pdf || ECHEC=1
echo "== 4. Pages en images (à relire)"
rm -f "$DOSSIER"/{fiche,corrige,fiche-en,corrige-en}-[0-9]*.png
"$PY" scripts/fiches/pages-png.py "$DOSSIER"/{fiche,corrige,fiche-en,corrige-en}.pdf || ECHEC=1
[ $ECHEC -eq 0 ] && echo "✅ Vérifications automatiques passées — relire les pages." || echo "⛔ Au moins une vérification a échoué."
exit $ECHEC
