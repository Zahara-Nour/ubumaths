=== Webstorm readme ===

Webstorm propose un debugger avancé
https://www.jetbrains.com/help/webstorm/2016.2/debug-tool-window.html?utm_source=from_product&utm_medium=help_link&utm_campaign=WS&utm_content=2016.2

Pour debugger depuis webstorm avec webpack il faut lui indiquer où sont les fichiers, le path mapping
https://blog.jetbrains.com/webstorm/2015/09/debugging-webpack-applications-in-webstorm/

Si cela n'a jamais été fait (TestWebPack.html n'apparait pas dans le menu déroulant à gauche du 
bouton play de debug en haut à droite), clic droit sur le fichier dans le navigateur puis run. quitter.

Si ce n'est pas le cas, marquer exclus le dossier www du projet 
(dans le navigateur clic droit sur le dossier, mark directory as / excluded)

Dans run / edit configurations, on devrait avoir
- Name : TestWebPack.html
- URL : http://localhost:63342/mathgraph_js/testsHtml/
- browser : mettez celui que vous voulez
Dans le cadre "Remote Urls of local files"
- en face du dossier racine mathgraph_js, ajouter dans la colonne remote Url http://localhost:63342/mathgraph_js
- en face du dossier www mettre webpack:///
Dans le cadre before launch
- cliquer sur +
- run npm script
- choisir script : build-watch-wp
et valider le tout

On peut aussi ne rien mettre dans le cadre before launch et lancer dans une console séparée
`npm run build-watch`
qu'on laisse tourner

Ensuite on modif du code dans webstorm et F5 dans le navigateur, à l'ancienne, ou debug dans le navigateur.

Pas trouver de solution pour mettre des points d'arrêt et voir l'état des variables dans webstorm, 
indiquer ici une solution si vous avez.
http://richb-hanover.com/debugging-webpack-apps-with-webstorm-2016-1/
