/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTransformation from './CTransformation'
export default CTransParVect

/**
 * Classe représentant une translation définie par le vecteur de la translation.
 * @constructor
 * @extends CTransformation
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CVecteur} vecteurTrans  Le vecteur de la translation.
 * @returns {CTransParVect}
 */
function CTransParVect (listeProprietaire, impProto, estElementFinal, vecteurTrans) {
  if (arguments.length === 1) CTransformation.call(this, listeProprietaire)
  else {
    CTransformation.call(this, listeProprietaire, impProto, estElementFinal)
    this.vecteurTrans = vecteurTrans
  }
}
CTransParVect.prototype = new CTransformation()
CTransParVect.prototype.constructor = CTransParVect
CTransParVect.prototype.superClass = 'CTransformation'
CTransParVect.prototype.className = 'CTransParVect'

CTransParVect.prototype.natureTransformation = function () {
  return CTransformation.translationParVect
}

CTransParVect.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.vecteurTrans)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CTransParVect(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CVecteur'))
}
CTransParVect.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CTransformation.prototype.depDe.call(this, p) || this.vecteurTrans.depDe(p))
}
CTransParVect.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.vecteurTrans.dependDePourBoucle(p)
}
CTransParVect.prototype.positionne = function () {
  this.existe = this.vecteurTrans.existe
}
CTransParVect.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return (this.vecteurTrans === p.vecteurTrans)
  else return false
}
/**
 * Renvoie dans pointr.x et pointr.y les coordonnées du point image du point de coordonnées (x,y).
 * @param {number} x
 * @param {number} y
 * @param {Object} pointr
 * @returns {void}
 */
CTransParVect.prototype.transformePoint = function (x, y, pointr) {
  pointr.x = x + this.vecteurTrans.x2 - this.vecteurTrans.x1
  pointr.y = y + this.vecteurTrans.y2 - this.vecteurTrans.y1
}
/**
 * Renvoie dans le vecteur ur les coordonnées du vecteur image du vecteur u.
 * @param {Vect} u
 * @param {Vect} ur
 * @returns {void}
 */
CTransParVect.prototype.transformeVecteur = function (u, ur) {
  u.setCopy(ur)
}
CTransParVect.prototype.read = function (inps, list) {
  CTransformation.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.vecteurTrans = list.get(ind1, 'CVecteur')
}
CTransParVect.prototype.write = function (oups, list) {
  CTransformation.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.vecteurTrans)
  oups.writeInt(ind1)
}
