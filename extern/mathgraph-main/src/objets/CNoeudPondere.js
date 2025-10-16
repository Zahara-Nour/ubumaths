/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COb from './COb'
import CValeur from './CValeur'
export default CNoeudPondere

/**
 * Classe utilisée pour définir les points pondérés dans les barycentres.
 * @constructor
 * @extends COb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CPt} pointAssocie  Le point.
 * @param {CValeur} poids  Le coefficient du point pondéré.
 * @returns {CNoeudPondere}
 */
function CNoeudPondere (listeProprietaire, pointAssocie, poids) {
  if (arguments.length === 1) COb.call(this, listeProprietaire)
  else {
    COb.call(this, listeProprietaire)
    this.pointAssocie = pointAssocie
    this.poids = poids
  }
}
CNoeudPondere.prototype = new COb()
CNoeudPondere.prototype.constructor = CNoeudPondere
CNoeudPondere.prototype.superClass = 'COb'
CNoeudPondere.prototype.className = 'CNoeudPondere'

CNoeudPondere.prototype.getClone = function (listeSource, listeCible) {
  const poidsClone = this.poids.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.pointAssocie)
  return new CNoeudPondere(listeCible, listeCible.get(ind1, 'CPt'), poidsClone)
}
CNoeudPondere.prototype.positionne = function (infoRandom, dimfen) {
  this.poids.positionne(infoRandom, dimfen)
  this.existe = this.poids.existe
}
CNoeudPondere.prototype.initialisePourDependance = function () {
  this.poids.initialisePourDependance()
}
CNoeudPondere.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointAssocie === ancienPoint) this.pointAssocie = nouveauPoint
}
CNoeudPondere.prototype.read = function (inps, list) {
  COb.prototype.read.call(this, inps, list)
  this.poids = new CValeur()
  this.poids.read(inps, list)
  const ind1 = inps.readInt()
  this.pointAssocie = list.get(ind1, 'CPt')
}
CNoeudPondere.prototype.write = function (oups, list) {
  COb.prototype.write.call(this, oups, list)
  this.poids.write(oups, list)
  const ind1 = list.indexOf(this.pointAssocie)
  oups.writeInt(ind1)
}
