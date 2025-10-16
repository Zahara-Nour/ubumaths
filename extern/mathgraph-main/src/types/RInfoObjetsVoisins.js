/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default RInfoObjetsVoisins

/**
 * Objet définissant les objets voisins. Utilisé pour les déplacements de souris.
 * @constructor
 */
function RInfoObjetsVoisins () {
  this.premierVoisin = null
  this.dernierVoisin = null
  this.nombreVoisins = 0
  this.premierVoisinRencontre = null
}

// Ajout version 4.6.8
RInfoObjetsVoisins.prototype.setClone = function (inf) {
  this.premierVoisin = inf.premierVoisin
  this.dernierVoisin = inf.dernierVoisin
  this.nombreVoisins = inf.nombreVoisins
  this.premierVoisinRencontre = inf.premierVoisinRencontre
}
