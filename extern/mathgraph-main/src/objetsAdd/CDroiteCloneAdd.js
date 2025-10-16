/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteClone from '../objets/CDroiteClone'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'
export default CDroiteClone

CDroiteClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('DteClone') + ' ' + getStr('of') + ' ' + this.droite.getNom()
}
CDroiteClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) || this.droite.depDe4Rec(p))
}
CDroiteClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.droite.estDefPar(listeOb)
}
CDroiteClone.prototype.contientParDefinition = function (po) {
  return this.droite.contientParDefinition(po) || CDroite.prototype.contientParDefinition.call(this, po)
}
