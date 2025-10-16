Développement
=============

## Développement local

### Version online "ordinaire"

Lancer un `pnpm start` va ouvrir le navigateur sur http://localhost:8082/, qui présente le index.html de la racine et des ajouts de src/start/main.js (tout ce qui est dans `src/start` ne concerne que cette version pour le développement local)

Toute modif du code va recharger automatiquement le js dans le navigateur (hot reload), inutile de recharger la page manuellement.


### Version online en https

Certaines fonctionnalités (comme la copie dans le presse papier) sont accessibles uniquement sur une connexion sécurisée.

Pour pouvoir tester ça en https ET localhost, il faut lancer dans un terminal un `pnpm build-watch` et dans un autre terminal un `pnpm start-secure` puis ouvrir dans son navigateur https://localhost:4433/editeur.html ou https://localhost:4433/player.html

Pour lancer cette pwa sur une ip locale qui n'est pas localhost, il faut manuellement le préciser. Dans le 2e terminal, à la place du `pnpm start-secure` lancer par ex `HOST=192.168.x.y PORT=4433 pnpx https-localhost docroot` pour tester du https://192.168.x.y:4433/editeur.html ou, si vous avez suffisamment de droits un `HOST=192.168.x.y pnpx https-localhost docroot` pour avoir du https://192.168.x.y/editeur.html (avec le port 443 par défaut pour du https)

Attention, après une modif la recompilation est automatique (cf le 1er terminal), mais  il faut recharger la page manuellement.


### Version pwa (Progressive Web App)

Pour la compilation de la pwa c'est `pnpm build-pwa`.

Pour la tester en local, il vaut mieux lancer dans un terminal `pnpm build-pwa-dev`
et dans un autre terminal `pnpm start-pwa-dev`.

Après une modification, relancer dans le 1er terminal la même commande puis rafraichir deux fois le navigateur ouvert sur https://localhost:4433/ (il est normalement inutile de supprimer le service worker) 

Pour lancer cette pwa sur une ip locale qui n'est pas localhost, il faut manuellement le préciser avec `HOST=192.168.x.y pnpm start-pwa-dev` puis aller tester https://192.168.x.y:4433/ (on peut aussi changer le port, en ayant suffisamment de droits lancer `HOST=192.168.x.y pnpx https-localhost dist/pwa-dev` pour pouvoir tester https://192.168.x.y/) 


## types.d.ts

La commande `pnpm build-types` lance la génération de dist/types.d.ts (pour le copier ensuite dans d'autres projets
qui utilisent des objets mathgraph ou son api, afin d'avoir de l'autocomplétion et de la vérification de type).

Pour cette génération, le résultat obtenu par tsc n'est pas satisfaisant (cf les commentaires du tsconfig.json)
et on continue (en 2024-11) d'utiliser tsd-jsdoc, qui n'est plus maintenu depuis longtemps mais donne encore un
résultat satisfaisant.
Il demande cependant un patch (sinon ça plante, cf patches/tsd-jsdoc@2.5.0.patch), qui sera automatiquement appliqué
après chaque `pnpm i` (cf https://pnpm.io/cli/patch).
Note: ça évite d'installer le package `patch-package` et toutes ses dépendances, qui de toute manière ne fonctionne
pas avec pnpm
