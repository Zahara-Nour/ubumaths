/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CElementBase from './CElementBase'
import CPointDansBipoint from './CPointDansBipoint'

export default CBipoint

/**
 * Classe représentant un couple de points utilisée pour les intersections
 * droite-cercle ou cercle-cercle.
 * @constructor
 * @extends CElementBase
 * @param {CListeObjets} listeProprietaire
 * @param {CImplementationProto} impProto
 * @param {boolean} estElementFinal
 * @returns {CBipoint}
 */
function CBipoint (listeProprietaire, impProto, estElementFinal) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CElementBase.call(this, listeProprietaire)
  else {
    CElementBase.call(this, listeProprietaire, impProto, estElementFinal)
  }
  this.point1 = new CPointDansBipoint()
  this.point2 = new CPointDansBipoint()
}
CBipoint.prototype = new CElementBase()
CBipoint.prototype.constructor = CBipoint
CBipoint.prototype.superClass = 'CElementBase'
CBipoint.prototype.className = 'CBipoint'

CBipoint.prototype.getNature = function () {
  return NatObj.NBipoint
}
CBipoint.prototype.setClone = function (ptel) {
  CElementBase.prototype.setClone.call(this, ptel)
  ptel.point1.existe = this.point1.existe
  ptel.point1.x = this.point1.x
  ptel.point1.y = this.point1.y
  ptel.point2.existe = this.point2.existe
  ptel.point2.x = this.point2.x
  ptel.point2.y = this.point2.y
}
CBipoint.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.point1.existe || this.point2.existe
}
/**
 * Fonction qui renvoie un des deux éléments dont il représente l'intersection.
 * @param {number} indice  L'indice de l'élément (0 ou 1)
 * @returns {void}
 */
CBipoint.prototype.elementAssocie = function (indice) {
  return null
}
