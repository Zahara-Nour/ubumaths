#!/usr/bin/env bash

# génère la documentation
# en cas de plantage de génération on garde l'ancienne

set -u

ROOT="$(dirname "$(dirname "$(realpath "$0")")")"
dirInitial="$(pwd)"

onExit() {
  cd "$dirInitial"
}
trap onExit EXIT

cd "$ROOT"
# on backup la doc actuelle
if [ -d documentation ]; then
  if [ -d documentation.old ]; then
    echo "WARNING: On a à la fois documentation et documentation.old => on vire old mais c'est pas normal !"
    rm -rf documentation.old
  fi
  mv documentation documentation.old
fi

# On génère deux documentations, celle des classes de mathgraph dans documentation/full
# et celle du chargement dans documentation/loading
# On ajoute ensuite le documentation/index.html pour mettre les 2 liens
# (+ un lien direct vers les méthodes de l'api dans full/)

echo "Lancement de la génération de la documentation"
if jsdoc -c jsdoc/full.json \
  && echo "doc full ok" \
  && jsdoc -c jsdoc/loading.json \
  && echo "doc loading ok" \
  && cp jsdoc/index.html documentation/
then
  [ -d documentation.old ] && rm -rf documentation.old
  echo "Génération de la documentation correctement terminée"
else
  echo "Génération de la documentation KO (l'erreur doit être ci-dessus)"
  if [ -d documentation.old ]; then
    echo " => on remet l'ancienne"
    rm -rf documentation
    mv documentation.old documentation
  fi
fi
