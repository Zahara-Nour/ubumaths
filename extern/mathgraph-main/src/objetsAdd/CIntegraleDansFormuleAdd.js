/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CIntegraleDansFormule from '../objets/CIntegraleDansFormule'
import CCb from '../objets/CCb'
export default CIntegraleDansFormule

CIntegraleDansFormule.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) ||
    this.calculASommer.depDe4Rec(p) || this.bornea.depDe4Rec(p) || this.borneb.depDe4Rec(p))
}

CIntegraleDansFormule.prototype.estDefiniParObjDs = function (listeOb) {
  return this.calculASommer.estDefiniParObjDs(listeOb) &&
  this.bornea.estDefiniParObjDs(listeOb) &&
  this.borneb.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CIntegraleDansFormule.prototype.estConstantPourConst = function () {
  return this.calculASommer.estConstantPourConst() && this.bornea.estConstantPourConst() && this.borneb.estConstantPourConst()
}
