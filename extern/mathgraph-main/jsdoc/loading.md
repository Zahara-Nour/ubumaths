Chargement de Mathgraph
=======================

Mathgraph propose un loader unique pour les différents cas
 <!---
 (un commentaire markdown, noter le triple - de démarrage)
 Cf https://jsdoc.app/about-tutorials.html pour les liens vers les tutos

 Ce contenu correspond à la page documentation/loading/index.html
 -->
- afficher l'éditeur mathgraph dans une page web, voir le tutoriel {@tutorial loadEditor}
- afficher le lecteur mathgraph dans une page web (pour y afficher une figure, éventuellement fixe), voir le tutoriel {@tutorial loadPlayer}
- utiliser le lecteur mathgraph dans du code (pour le moteur de calcul par exemple), voir le tutoriel {@tutorial loadCore}

D'une manière générale, il y a deux moyen pour mettre une figure dans une page html 
* utiliser le tag `<mathgraph-player fig="code base64 de la figure""></mathgraph-player>` (ou le tag `<mathgraph-editor>`) et charger le js https://www.mathgraph32.org/js/mtgLoad/mathgraphElements.js
* charger le js https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js qui exporte en global une fonction [mtgLoad](global.html#mtgLoad) puis utiliser cette fonction en javascript.

Ensuite, vous pouvez passer la figure à afficher dans les options de mtgLoad ou bien lui passer l'option `loadApi: true` pour avoir les méthodes de l'api ([MtgApi]) sur l'objet construit (qui sera donc un [MtgAppApi] ou [MtgAppLecteurApi]).
