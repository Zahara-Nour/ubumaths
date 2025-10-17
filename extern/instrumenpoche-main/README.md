Lecteur Instrumenpoche
======================

Usage
-----

Dans n'importe quelle page web, ajouter 

```html
<div id="monDiv"></div>
<script type="application/javascript" src="https://instrumenpoche.sesamath.net/iep/js/iepLoad.min.js" ></script>
<script type="application/javascript">
  // le script précédent procure une fct globale iepLoad qui s'utilise comme suit
  iepLoad('monDiv', 'https://example.com/scriptIep.xml', function (error, iepApp) {
    // cette callback est facultative mais elle permet de gérer une erreur de chargement ici
    // si error est null|undefined, iepApp est fourni pour utilisation éventuelle
  })
  // on peut ajouter des options, passer un HTMLElement plutôt qu'un id, ou la string du xml plutôt que son url
  // cf src/iepLoad.js pour les options possibles
</script>
```

Pour un usage dans un autre projet, vous ajouter instrumenpoche en dépendance dans votre package.json
```json5
  "dependencies": {
    // …
    "instrumenpoche": "git+https://framagit.org/Sesamath/instrumenpoche.git",
    // …
  }
```
 
puis l'utiliser avec

```js
import iepLoadPromise from 'instrumenpoche'

iepLoadPromise(container, xml, options).then(iepApp => {
  // la figure est chargée
}).catch(error => {
  // il y a eu un pb
})
```
ou bien (idem avec la syntaxe async/await)
```js
import iepLoadPromise from 'instrumenpoche'

try {
  const iepApp = await iepLoadPromise(container, xml, options)
  // la figure est chargée et l'animation lancée, si l'on veut rester en pause au début
  // (en attendant une option autostart)
  // le premier doc (le seul pour le moment)
  const doc = iepApp.docs[0]
  // pause
  doc.pause()
  // et retour au début
  doc.reset()
} catch (error) {
  // gérer l'erreur pour prévenir l'utilisateur du pb
}
```


**Attention**, il faudra passer node_modules/instrumenpoche par babel pour un usage avec des navigateurs es5 seulement
 (instrumenpoche est en es6, il utilise notamment Promise & fetch)

Développement
-------------

(On utilise ci-dessous pnpm mais ça fonctionne aussi avec npm)

`pnpm start` puis aller sur http://localhost:8081/ pour afficher les exemples proposés


Vous pouvez ajouter vos exemples en ajoutant des fichiers dans devServer/fixtures (et incrémenter l'index max dans devServer/index.js)
