Chargement
==========

Pour charger mathgraph et l'utiliser, cf la fonction [mtgLoad](global.html#mtgLoad) 
et les méthodes de [MtgApp](MtgApp.html) ou [MtgAppLecteur](MtgAppLecteur.html) (suivant ce qu'on a chargé).

Si vous souhaitez simplement utiliser mathgraph dans votre code (et pas modifier le code de mathgraph), cette documentation n'est pas pour vous, ce sera plus simple de s'y retrouver dans celle [dédiée à l'utilisation](../loading/index.html) 

Api
===

Pour utiliser les méthodes de l'api ([MtgApi](MtgApi.html)), il faut passer l'option `loadApi: true` à mtgLoad, qui permet d'obtenir un objet [MtgAppApi](MtgAppApi.html) ou [MtgAppLecteurApi](MtgAppLecteurApi.html)

Développement
=============

Pour le développement en local, lancer `pnpm run start` qui permet de tester la version locale via http://localhost:8082/ (pas besoin de recharger en cas de modif des sources)

Pour tester une figure, la passer dans le hash ([exemple](http://localhost:8081/#TWF0aEdyYXBoSmF2YTEuMAAAABI+TMzNAAJmcv###wEA#wEAAAAAAAAAAAV2AAACmAAAAQEAAAAAAAAAAQAAAAL#####AAAAAQAKQ0NhbGNDb25zdAD#####AAJwaQAWMy4xNDE1OTI2NTM1ODk3OTMyMzg0Nv####8AAAABAApDQ29uc3RhbnRlQAkh+1RELRj#####AAAAAQAKQ1BvaW50QmFzZQD#####AAAAAAAQAAFPAAAAAAAAAAAAQAgAAAAAAAAFAAFAdsAAAAAAAEByUKPXCj1x################))
 
ou bien pour la visualiser avec le player, ajouter "player" avant la figure base64 ([exemple](http://localhost:8081/#playerTWF0aEdyYXBoSmF2YTEuMAAAABI+TMzNAAJmcv###wEA#wEAAAAAAAAAAAV2AAACmAAAAQEAAAAAAAAAAQAAAAL#####AAAAAQAKQ0NhbGNDb25zdAD#####AAJwaQAWMy4xNDE1OTI2NTM1ODk3OTMyMzg0Nv####8AAAABAApDQ29uc3RhbnRlQAkh+1RELRj#####AAAAAQAKQ1BvaW50QmFzZQD#####AAAAAAAQAAFPAAAAAAAAAAAAQAgAAAAAAAAFAAFAdsAAAAAAAEByUKPXCj1x################))
 
ou bien pour la visualiser figée (points non déplaçables) mettre "fixed" ([exemple](http://localhost:8081/#fixedTWF0aEdyYXBoSmF2YTEuMAAAABI+TMzNAAJmcv###wEA#wEAAAAAAAAAAAV2AAACmAAAAQEAAAAAAAAAAQAAAAL#####AAAAAQAKQ0NhbGNDb25zdAD#####AAJwaQAWMy4xNDE1OTI2NTM1ODk3OTMyMzg0Nv####8AAAABAApDQ29uc3RhbnRlQAkh+1RELRj#####AAAAAQAKQ1BvaW50QmFzZQD#####AAAAAAAQAAFPAAAAAAAAAAAAQAgAAAAAAAAFAAFAdsAAAAAAAEByUKPXCj1x################))

Tests electron
--------------
1) build prod + test statique
- dans le dossier racine `pnpm run build-electron`
- dans le dossier electron `pnpm start` ou bien `./node_modules/.bin/electron .`

2) build dev + test statique
- dans le dossier racine `pnpm run build-electron-dev`
- dans le dossier electron `pnpm start` ou bien `./node_modules/.bin/electron .`

3) build dynamique
- dans le dossier racine `pnpm run start-electron`
- dans le dossier electron `pnpm run start-debug` ou bien `./node_modules/.bin/electron --debug .`

Attention, pour les start electron ça lance le electron installé en global si y'en a un, mieux vaux lancer la 2e commande (la mettre dans le package.json marche pas sous windows)

Sous linux, on peut avoir l'erreur `The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now.`
Vu qu'il est hors de question de filer les droits root au binaire electron ni de faire tourner la sandbox dans un environnement avec trop de droits, ajouter --no-sandbox ou bien utiliser les commandes electron `pnpm run start-no-sandbox` ou `pnpm run start-debug-no-sandbox` (cf [cette issue](https://github.com/electron/electron/issues/17972), notamment cette [explication du trou de sécurité](https://github.com/electron/electron/issues/17972#issuecomment-558880631)


ressources de test
------------------

Après un déploiement en dev, on peut tester
* https://bibliotheque.devsesamath.net/public/voir/50075 (exo j3p qui affiche une figure mathgraph avec le player, mtg32)
* http://j3p.devsesamath.net/j3p.html?graphe=[1,%22squelettemtg32_Ex_Const%22,[{pe:%22sans%20condition%22,nn:%22fin%22,conclusion:%22Fin%22}]];
* https://bibliotheque.devsesamath.net/public/voir/5c532039b2d5904842d94d1b (qui utilise mtg32)
* https://bibliotheque.devsesamath.net/public/voir/59a7b3e2d842b31abd3712e8 (exo de construction)

et après un déploiement en prod, les mêmes :
* https://bibliotheque.sesamath.net/public/voir/50075 (exo j3p qui affiche une figure mathgraph avec le player, mtg32)
* http://j3p.sesamath.net/j3p.html?graphe=[1,%22squelettemtg32_Ex_Const%22,[{pe:%22sans%20condition%22,nn:%22fin%22,conclusion:%22Fin%22}]];
* https://bibliotheque.sesamath.net/public/voir/5c532039b2d5904842d94d1b (qui utilise mtg32)
* https://bibliotheque.sesamath.net/public/voir/59a7b3e2d842b31abd3712e8 (exo de construction)
* https://www.mathgraph32.org/spip.php?article577 (mtgLoad)
