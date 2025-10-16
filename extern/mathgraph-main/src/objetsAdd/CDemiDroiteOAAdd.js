/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroiteOA from '../objets/CDemiDroiteOA'
import CDemiDroite from '../objets/CDemiDroite'
import { getStr } from '../kernel/kernel'
export default CDemiDroiteOA

CDemiDroiteOA.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('Ddte') + ' ' + '[' + this.o.getName() + this.a.getName() + ')'
}

CDemiDroiteOA.prototype.contientParDefinition = function (po) {
  return (this.a === po) || (this.o === po)
}

CDemiDroiteOA.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDemiDroite.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.a.depDe4Rec(p))
}

CDemiDroiteOA.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) &&
  this.a.estDefPar(listeOb)
}
