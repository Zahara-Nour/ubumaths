génération automatique de la doc avec jsdoc
===========================================

On utilise jsdoc pour générer la documentation du code.

Le template par défaut n'est pas terrible, car on a une liste très longue de classes dans le menu, et quand on en consulte une on a pas de liste des méthodes => on passe son temps à scroller.

Avec le theme [docdash](https://github.com/clenemt/docdash), c'est un peu mieux, mais faut lui préciser en options :

```js
  "docdash": {
    "static": true,
    "search": true,
    "collapse": true
  }
```

On pourra essayer d'autres thèmes, cf https://github.com/search?q=jsdoc+theme

Essais réalisés
---------------

* [minami](https://github.com/nijikokun/minami) : pas terrible, on a bien la liste des classes et des méthodes dans le menu mais les méthodes sont dépliées par défaut, et ça scrolle pas automatiquement dans le menu quand on consulte une classe => vraiment pas pratique


