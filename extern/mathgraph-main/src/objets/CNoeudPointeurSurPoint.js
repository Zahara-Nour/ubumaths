/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COb from './COb'
export default CNoeudPointeurSurPoint

/**
 * Classe servant à contenir un pointeur sur un point.
 * Lorsqu'un tel objet est enregistré dans un flux binaire, c'est l'idice du point
 * dans la liste qui est enregistré.
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet donc du point.
 * @param {CPt} pointeurSurPoint  Le point.
 * @returns {CNoeudPointeurSurPoint}
 */
function CNoeudPointeurSurPoint (listeProprietaire, pointeurSurPoint) {
  COb.call(this, listeProprietaire)
  this.pointeurSurPoint = pointeurSurPoint
}

CNoeudPointeurSurPoint.prototype = new COb()
CNoeudPointeurSurPoint.prototype.constructor = CNoeudPointeurSurPoint
CNoeudPointeurSurPoint.prototype.superClass = 'COb'
CNoeudPointeurSurPoint.prototype.className = 'CNoeudPointeurSurPoint'

CNoeudPointeurSurPoint.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.pointeurSurPoint)
  return new CNoeudPointeurSurPoint(listeCible, listeCible.get(ind1, 'CPt'))
}
CNoeudPointeurSurPoint.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointeurSurPoint === ancienPoint) this.pointeurSurPoint = nouveauPoint
}
CNoeudPointeurSurPoint.prototype.read = function (inps, list) {
  COb.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.pointeurSurPoint = list.get(ind1, 'CPt')
}
CNoeudPointeurSurPoint.prototype.write = function (oups, list) {
  const ind1 = list.indexOf(this.pointeurSurPoint)
  oups.writeInt(ind1)
}
