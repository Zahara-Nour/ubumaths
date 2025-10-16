Dans cet exemple, on utilise le moteur de calcul de mathgraph sans afficher la figure.
<br>On suppose ici que la figure contient un calcul nommé <i>a</i> contenant comme formule <code>1</code>,
une fonction nommé <i>f</i> de la variable <i>x</i> avec comme formule <code>2\*x+3</code>.
et un calcul nommé <i>b</i> contenant comme formule <code>f(a)</code>.
<br> Nous souhaitons par exemple donner à <i>a</i> la valeur <i>pi/7</i>, à <i>f(x)</i>
la formule <code>5\*sin(pi*x)</code> et demander alors quelle est la valeur de <i>b</i>.
<br> Ci-dessous l'argument passé la fonction mtgAppLecteur.createList est le code Base 64
d'une telle figure (Attention : Ici l'unité de la figure est le radian)
```js
const mtgOptions = {
  loadCoreOnly: true
}
mtgLoad('', {}, mtgOptions, function (error, mtgAppLecteur) {
  if (error) return console.error(error)
  console.log('mtg dispo')
  const list = mtgAppLecteur.createList('TWF0aEdyYXBoSmF2YTEuMAAAABI+TMzNAAJmcv###wEA#wEAAAAAAAAAAASVAAAClgAAAQEAAAAAAAAAAAAAAAT#####AAAAAQAKQ0NhbGNDb25zdAD#####AAJwaQAWMy4xNDE1OTI2NTM1ODk3OTMyMzg0Nv####8AAAABAApDQ29uc3RhbnRlQAkh+1RELRj#####AAAAAQAHQ0NhbGN1bAD#####AAFhAAExAAAAAT#wAAAAAAAA#####wAAAAEABUNGb25jAP####8AAWYABTMqeCsz#####wAAAAEACkNPcGVyYXRpb24AAAAABAIAAAABQAgAAAAAAAD#####AAAAAgARQ1ZhcmlhYmxlRm9ybWVsbGUAAAAAAAAAAUAIAAAAAAAAAAF4AAAAAgD#####AAFiAARmKGEp#####wAAAAEADkNBcHBlbEZvbmN0aW9uAAAAAv####8AAAABAA9DUmVzdWx0YXRWYWxldXIAAAAB################')
  list.giveFormula2('a', 'pi/7')
  list.giveFormula2('f', '5*sin(pi*x)')
  list.calculateNG(false)
  const resul = list.valueOf('b')
  console.log('Résultat : ', resul)
})
```
Les fonctions disponibles pour utiliser la liste <i>list</i> ci-dessus sont notamment :

* <b>[calculateNG(infoRandom)](CListeObjets.html#calculateNG) :</b> Recalcule tous les éléments de la liste. Si infoRandom est true, tous les calculs aléatoires de la figure sont réactualisés.
* <b>[giveFormula2(nomCalcul, formule)](CListeObjets.html#giveFormula2)</b> : Donne à l'objet de nom <i>nomCalcul</i> la formule contenue dans <i>formule</i>
  <i>nomCalcul</i> peut être le nom d'un calcul réel, ou complexe ou le nom d'une fonction réelle ou complexe (de une ou plusieurs variables).
* <b>[valueOf(nomCalcul)](CListeObjets.html#valueOf)</b> : Renvoie la valeur actuelle du calcul (réel) de nom <i>nomCalcul</i> contenu dans la liste.
* <b>[getLatexFormula(nomCalcul)](CListeObjets.html#getLatexFormula)</b> : Renvoie une chaîne LaTeX contenant le code LaTeX représentant <i>nomCalcul</i>.
  <i>nomCalcul</i> peut être le nom d'un calcul réel, ou complexe ou le nom d'une fonction réelle ou complexe (de une ou plusieurs variables).
