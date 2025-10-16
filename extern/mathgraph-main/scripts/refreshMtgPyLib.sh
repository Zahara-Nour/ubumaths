#!/usr/bin/env bash

# génère src/uiCommands/brython/scripts/mathgraph.brython.js
# d'après le contenu de src/uiCommands/brython/mathgraph_package

set -u

abort () {
  echo "$*" >&2
  exit 1
}

DIRINI="$(pwd)"
if [[ "$0" =~ ^/ ]]; then
  ROOTDIR="$(dirname "$(dirname  "$0")")"
else
  ROOTDIR="$(dirname "$(dirname  "$DIRINI/$0")")"
fi
README="$ROOTDIR/src/uiCommands/brython/README.md"

[ ! -f "$README" ] && abort "$README n'existe pas, projet incomplet ? (tenter de lancer ce script depuis la racine du projet)"

if [[ "${COMSPEC-}" =~ cmd\.exe ]]; then
  # windows, on met cette commande, ça plantera si python ou le module brython n'est pas installé
  BRCLI="py -m brython"
else
  BRCLI=$(which brython-cli)
fi

[ -z "$BRCLI" ] && echo "Il faut installer le module python brython pour lancer ce script ('pip install brython' ou 'pipx install brython')">&2 && cat "$README" && exit 1

[ -f "$ROOTDIR/src/uiCommands/brython/mathgraph_package/mathgraph.brython.js" ] && rm -f "$ROOTDIR/src/uiCommands/brython/mathgraph_package/mathgraph.brython.js"

cd "$ROOTDIR/src/uiCommands/brython/mathgraph_package" \
  && $BRCLI make_package mathgraph \
  && mv mathgraph.brython.js "../scripts" \
  && echo "mathgraph.brython.js re-généré"
exitCode=$?

# shellcheck disable=SC2164
cd "$DIRINI"

exit $exitCode
