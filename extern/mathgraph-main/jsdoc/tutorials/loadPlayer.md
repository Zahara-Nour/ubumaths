<!---
 Pas de titre dans le md car jsdoc l'ajoute automatiquement pour les tutorials
 page documentation/loading/tutorial-loadPlayer.html 
-->

Voici quelques exemples de chargement du lecteur Mathgraph dans une page html, éventuellement avec plusieurs figures.

Voici un exemple de chargement de l'éditeur dans une page html

Utilisation de la balise `<mathgraph-player>`
---------------------------------------------

C'est la manière la plus simple de mettre des figures mathgraph dans une page html.

```html
<p>Une première figure</p>
<mathgraph-player width="800" height="600" fig="le code base64 de la figure"></mathgraph-player>

<p>et une deuxième</p>
<!-- chargement de l'éditeur, avec toutes ses options par défaut -->
<mathgraph-player fig="le code base64 d’une autre figure"></mathgraph-player>

<!-- qq part dans la page, avant ou après le ou les tag(s) <mathgraph-player>, le chargement du js -->
<script async src="https://www.mathgraph32.org/js/mtgLoad/mathgraphElements.js"></script>
```

**Remarques :**
* Le tag de fermeture `</mathgraph-player>` est obligatoire, la syntaxe `<mathgraph-player fig="…" />` ne fonctionnera pas (comme pour tous les customElements)
* Vous pouvez utiliser les attributs width et height (mettre des nombres sans unité, cela sera la taille en pixels du svg affiché)
* L'attribut `svgId` est possible pour imposer l'id qui sera mis sur le svg de la figure créée (utile si vous voulez manipuler cette figure ensuite avec du code javascript)
* Si vous voulez afficher une figure inline, vous pouvez lui donner le style `display: inline-block` (lui mettre inline ne fonctionnera pas), avec une directive css, un attribut style mis sur `<mathgraph-player>` ou en js.
* Vous pouvez mettre dans la même page des tags `<mathgraph-editor>` et `<mathgraph-player>`.

Avec du code javascript
-----------------------

Vous pouvez ajouter à mtgOption `loadApi: true` pour avoir les méthodes de l'api ([MtgApi]) sur l'objet construit (qui sera donc un [MtgAppLecteurApi] plutôt qu'un [MtgAppLecteur]).

a) Voici un exemple avec deux figures

```html
<!-- qq part dans la page, chargement du js -->
<script src="https://www.mathgraph32.org/js/mtgLoad/mtgLoad.min.js"></script>

<!-- avant ou après le chargement du js, un div pour y mettre une figure, id arbitraire -->
<div id="fig1"></div>
<!-- une 2e figure -->
<div id="fig2"></div>

<!-- après chargement du js ET div, le chargement proprement dit -->
<script type="application/javascript">
// facultatif mais conseillé, mettre le code dans une iife
// (https://developer.mozilla.org/fr/docs/Glossaire/IIFE)
(function () {
  'use strict'
  if (typeof mtgLoad === 'function') {
    var svgOptions = {
      width: 300, 
      height: 200, 
      idSvg: 'svgFig1' // facultatif, mais nécessaire pour utiliser les méthodes qui prennent un idDoc en paramètre
    } 
    var mtgOptions = {
      isEditable: false, // on veut juste le lecteur
      fig: 'le code base64 de la figure à charger'
    }
    mtgLoad('fig1', svgOptions, mtgOptions, function (error, mtgAppLecteur) {
      if (error) return console.error(error)
      console.log('fig1 chargée')
      // on peut utiliser ici mtgAppLecteur, cf doc pour les méthodes disponibles   
    })
    var svgOptions2 = {
      width: 500, 
      height: 400, 
      idSvg: 'svgFig2'
    }
    var mtgOptions2 = {
      isEditable: false, // on veut juste le lecteur
      fig: 'le code base64 de la figure à charger'
    }
    mtgLoad('fig2', svgOptions2, mtgOptions2, function (error, mtgAppLecteur) {
      // ATTENTION, probablement appelé après la callback de chargement de fig1,
      // mais ce n'est pas garanti !
      if (error) return console.error(error)
      console.log('fig2 chargée')
      // on peut utiliser ici mtgAppLecteur, cf doc pour les méthodes disponibles
      // c'est la même instance du lecteur que dans la callback de chargement de fig1   
    })
  } else {
    console.error(Error('Mathgraph n’est pas correctement chargé'))
  } 
})()
</script>
``` 

Idem avec la syntaxe async/await (ça restreint aux navigateurs pas trop vieux, cf [caniuse](https://caniuse.com/?search=await))

```js
(async function () {
  try {
    const svgOptions = {
      width: 300, 
      height: 200, 
      idSvg: 'svgFig1' // facultatif, mais nécessaire pour utiliser les méthodes qui prennent un idDoc en paramètre
    } 
    const mtgOptions = {
      isEditable: false, // on veut juste le lecteur
      fig: 'le code base64 de la figure à charger'
    }
    const mtgAppLecteur = await mtgLoad('fig1', svgOptions, mtgOptions)
    console.log('fig1 chargée')
    
    // on peut utiliser ici mtgAppLecteur, cf doc pour les méthodes disponibles
    // mais on peut aussi appeler mtgLoad une 2e fois
    const svgOptions2 = {
      width: 500, 
      height: 400, 
      idSvg: 'svgFig2'
    }
    const mtgOptions2 = {
      isEditable: false, // on veut juste le lecteur
      fig: 'le code base64 de la figure à charger'
    }
    // inutile de récupérer mtgAppLecteur, on l'a déjà
    await mtgLoad('fig2', svgOptions2, mtgOptions2)
  } catch (error) {
    console.error(error)
  } 
})()
```

b) Deuxième exemple avec trois figures, utilisant la syntaxe avec promesse (ne pas donner de callback à mtgLoad pour qu'il renvoie une promesse), pour regrouper le code post-chargement

On suppose que la page html a chargé mtgLoad.min.js et crée les divs figN, puis qu'elle charge ce js :

```js
const figs = [
  // pour chaque figure on précise ici ses options
  {
    idContainer: 'fig1',
    svgOptions: {
      width: 500, 
      height: 400, 
      idSvg: 'svgFig1'
    },
    mtgOptions: {
      fig: 'le code de la figure'
    }
  }, {
    idContainer: 'petiteFigure',
    svgOptions: {
      width: 100, 
      height: 50 
    },
    mtgOptions: {
      fig: 'le code de la figure'
    }
  }, {
    idContainer: 'superFigure',
    svgOptions: {
      width: 600, 
      height: 600 
    },
    mtgOptions: {
      fig: 'le code de la figure'
    }
  }
]
// pour chaque figure on récupère une promesse de chargement, 
// on lance tout en parallèle, 
// et quand toutes seront résolues on continue
Promise.all(figs.map(({idContainer, svgOptions, mtgOptions}) => mtgLoad(idContainer, svgOptions, mtgOptions)))
  .then(results => {
    // results est le tableau des valeurs des promesses résolues, avec la même instance du player pour chacune, la 1re valeur nous suffit donc
    const mtgAppPlayer = results[0]
    // on peut l'utiliser…
  })
  .catch(error => console.error(error))
```

ou avec async / await
```js
try {
  const results = await Promise.all(figs.map(({ idContainer, svgOptions, mtgOptions }) => mtgLoad(idContainer, svgOptions, mtgOptions)))
  // results est le tableau des valeurs des promesses résolues, avec la même instance du player pour chacune, la 1re valeur nous suffit donc
  const mtgAppPlayer = results[0]
  // on peut l'utiliser…
} catch (error) {
  console.error(error)
}
```
