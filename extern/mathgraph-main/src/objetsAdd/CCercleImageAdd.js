/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCercleImage from '../objets/CCercleImage'
import CCercle from '../objets/CCercle'
import { getStr } from '../kernel/kernel'
export default CCercleImage

CCercleImage.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo35') + ' ' + this.antecedent.nom + ' ' +
    getStr('par') + ' ' + this.transformation.complementInfo()
}

CCercleImage.prototype.antecedentDirect = function () {
  return this.transformation
}

CCercleImage.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && this.transformation.imageModifiableParMenu()
}

CCercleImage.prototype.contientParDefinition = function (po) {
  if (po.estPointImage()) {
    return (this.transformation === po.transformation) && po.antecedent.appartientCercleParDefinition(this.antecedent)
  } else return true
}

CCercleImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCercle.prototype.depDe4Rec.call(this, p) ||
    this.antecedent.depDe4Rec(p) || this.transformation.depDe4Rec(p))
}

/**
 * Fonction qui renvoie true seulement pour les objets qui sont des objets images d'un autre par une transformation
 * @returns {boolean}
 */
CCercleImage.prototype.estImageParTrans = function () {
  return true
}

CCercleImage.prototype.estDefiniParObjDs = function (listeOb) {
  return this.antecedent.estDefPar(listeOb) &&
  this.transformation.estDefPar(listeOb)
}
