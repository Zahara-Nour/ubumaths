 <!---
 Pas de titre dans le md car jsdoc l'ajoute automatiquement pour les tutorials
 page documentation/loading/tutorial-loadEditor.html
 -->
  
Voici un exemple de chargement de l'éditeur dans une page html

Utilisation de la balise `<mathgraph-editor>`
---------------------------------------------

C'est la manière la plus simple de mettre des éditeurs mathgraph dans une page html.

```html
<!-- chargement de l'éditeur, avec les boutons niveau collège, sans bouton ouvrir ni le bouton pour changer les options -->
<mathgraph-editor width="800" height="600" fig="le code base64 de la figure" level="1" open="false" options="false"></mathgraph-editor>

<!-- chargement de l'éditeur, avec toutes ses options par défaut -->
<mathgraph-editor fig="le code base64 de la figure"></mathgraph-editor>

<!-- qq part dans la page, avant ou après le ou les tag(s) <mathgraph-editor>, le chargement du js -->
<script async src="https://www.mathgraph32.org/js/mtgLoad/mathgraphElements.js"></script>
```

**Remarques**
* La liste des options est la même que celle de la fonction [mtgLoad](global.html#MtgOptions) (mtgOptions mais également les svgOptions svgId/width/height).
* Le tag de fermeture `</mathgraph-editor>` est obligatoire, la syntaxe `<mathgraph-editor … />` ne fonctionnera pas (comme pour tous les customElements).
* Vous pouvez utiliser les attributs width et height (mettre des nombres sans unité, cela sera la taille en pixels du svg affiché).
* Vous pouvez mettre dans la même page des tags `<mathgraph-editor>` et `<mathgraph-player>`.
* L'attribut `svgId` est possible pour imposer l'id qui sera mis sur le svg de la figure créée (utile si vous voulez manipuler cette figure ensuite avec du code javascript)
* Si vous voulez afficher un éditeur inline, vous pouvez lui donner le style `display: inline-block` (lui mettre inline ne fonctionnera pas), avec une directive css, un attribut style mis sur `<mathgraph-editor>` ou en js.

Avec du code javascript
-----------------------

Vous pouvez ajouter à mtgOption `loadApi: true` pour avoir les méthodes de l'api ([MtgApi]) sur l'objet construit (qui sera donc un [MtgAppApi] plutôt qu'un [MtgApp]).

```html
<!-- qq part dans la page, chargement du js -->
<script src="https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js"></script>

<!-- avant ou après le chargement du js, un div pour y mettre l'éditeur, id arbitraire -->
<div id="mtgEditor"></div>

<!-- après chargement du js ET div, le chargement proprement dit -->
<script type="application/javascript">
// facultatif mais conseillé, mettre le code dans une iife
// (https://developer.mozilla.org/fr/docs/Glossaire/IIFE)
(function () {
  'use strict'
  if (typeof mtgLoad === 'function') {
    var svgOptions = {
      // on pourrait préciser les propriétés  
      // width, height, idSvg
      // toutes facultatives
    } 
    var mtgOptions = {
      fig: 'le code base64 de la figure à charger',
      level: 1, // sélection d'outils pour le collège (0 pour école, 2 pour lycée et 3 pour lycée avec complexes)
    }
    mtgLoad('mtgEditor', svgOptions, mtgOptions, function (error, mtgApp) {
      if (error) return console.error(error)
      console.log('mathgraph est chargé')
      // on peut utiliser ici mtgApp, cf doc pour les méthodes disponibles   
    })
  } else {
    console.error(Error('Mathgraph n’est pas correctement chargé'))
  } 
})()
</script>
```

idem avec en récupérant une promesse plutôt que de passer une callback, avec la syntaxe async / await

```js
(async function () {
  try {
    const svgOptions = {
      // on pourrait préciser les propriétés  
      // width, height, idSvg
      // toutes facultatives
    } 
    const mtgOptions = {
      fig: 'le code base64 de la figure à charger',
      level: 1, // sélection d'outils pour le collège (0 pour école, 2 pour lycée et 3 pour lycée avec complexes)
    }
    const mtgApp = await mtgLoad('mtgEditor', svgOptions, mtgOptions)
    console.log('mathgraph est chargé')
    // on peut utiliser ici mtgApp, cf doc pour les méthodes disponibles   
  } catch (error) {
    console.error(error)
  }
})()
```
