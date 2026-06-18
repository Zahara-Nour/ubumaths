#!/usr/bin/env bash
# Réconcilie l'historique de migrations du projet EU (cnevnzsvixxpnurautls).
# EU a tout le schéma (clone de données) mais un historique vide.
# On marque "applied" toutes les migrations existantes SAUF la nouvelle
# (20260615190937), sans les rejouer. Puis `pnpm db:migrate` n'appliquera
# plus que la nouvelle.
#
# Pré-requis : CLI déjà linké sur EU (supabase link --project-ref cnevnzsvixxpnurautls).
set -euo pipefail

NEW="20260615190937"

versions=$(ls supabase/migrations/*.sql \
  | xargs -n1 basename \
  | sed -E 's/_.*\.sql$//' \
  | grep -v "^${NEW}$" \
  | tr '\n' ' ')

n=$(echo "$versions" | wc -w | tr -d ' ')
echo "→ Marquage 'applied' de $n migrations sur EU (sans rejeu)..."
supabase migration repair --status applied $versions

echo ""
echo "→ État après réparation (seul $NEW doit rester en Local-only) :"
supabase migration list | tail -8
