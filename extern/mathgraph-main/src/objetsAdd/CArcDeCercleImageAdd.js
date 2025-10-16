/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CArcDeCercleImage from '../objets/CArcDeCercleImage'
import CArcDeCercleAncetre from '../objets/CArcDeCercleAncetre'
import { getStr } from '../kernel/kernel'
export default CArcDeCercleImage

CArcDeCercleImage.prototype.antecedentDirect = function () {
  return this.transformation
}

CArcDeCercleImage.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo37') + ' ' + this.antecedent.getName() + ' ' +
    getStr('par') + ' ' + this.transformation.complementInfo()
}

CArcDeCercleImage.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  return this.arc.distancePoint(xp, yp, masquage)
}

CArcDeCercleImage.prototype.distancePointPourSurface = function (xp, yp, masquage) {
  if (!this.existe) return -1
  return this.arc.distancePointPourSurface(xp, yp, masquage)
}

CArcDeCercleImage.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && this.transformation.imageModifiableParMenu()
}

CArcDeCercleImage.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) {
    return (this.transformation === po.transformation) && (po.antecedent.appartientCercleParDefinition(this.antecedent))
  } else return true
}

CArcDeCercleImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CArcDeCercleAncetre.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.transformation.depDe4Rec(p))
}

CArcDeCercleImage.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  return this.arc.tikz(dimf, nomaff, coefmult, bu)
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CArcDeCercleImage.prototype.estImageParTrans = function () {
  return true
}

CArcDeCercleImage.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.transformation.estDefPar(listeOb)
}
