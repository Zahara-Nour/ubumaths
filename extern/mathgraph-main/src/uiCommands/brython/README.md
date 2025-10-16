Brython
=======

[Brython](https://brython.info/) permet de faire tourner du python dans un navigateur.

On l'utilise pour la console de commandes python (pour utiliser l'api en python).

Cette console utilise runner.py (pour récupérer le code python dans l'éditeur ace et le lancer) et mathgraph.py (qui wrap les méthodes js de l'api en python).

Afin de pouvoir l'utiliser en cross domain, il faut pouvoir charger ces deux fichiers de n'importe où. Il faut pour cela créer un [package Brython](https://brython.info/static_doc/3.12/fr/brython-packages.html)

Pour créer ce package, il faut installer localement le CPackage python brython (cf [doc](https://brython.info/static_doc/3.12/fr/install.html)), avec `pip install brython` (ou `pipx install brython` sous debian par ex pour pouvoir l'installer dans l'environnement utilisateur sans modifier les libs python du système).

Ensuite, dans le dossier mathgraph_package, s'assurer qu'il n’y a pas un ancien fichier `mathgraph.brython.js` (sinon le supprimer) 
puis lancer la commande `brython-cli make_package mathgraph`, qui va générer le fichier `mathgraph.brython.js`.

Déplacer ensuite le `mathgraph.brython.js` dans src/uiCommands/brython/scripts avec les 2 autres js de brython.

Vous pouvez lancer `scripts/refreshMtgPyLib.sh` pour regénérer ce mathgraph.brython.js à sa place (mais il faut avoir installé le module python)

Le principe de ce package brython est que l'on pourrait le mettre n'importe où et le charger dans le dom avec un `<script type="text/javascript" src="https://domain.tld/path/to/mathgraph.brython.js"></script>`

Notre code va créer ce tag script dans la page qui appelera mtgLoad, en mettant une url correspondant au dossier de build du mtgLoad utilisé, afin que cela fonctionne partout.
