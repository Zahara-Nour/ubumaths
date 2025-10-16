/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMarqueAngleDroit from '../objets/CMarqueAngleDroit'
import CMarqueAngleAncetre from '../objets/CMarqueAngleAncetre'
import { getStr } from '../kernel/kernel'

export default CMarqueAngleDroit

CMarqueAngleDroit.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo165') + ' ' + getStr('of') + ' ' + this.perp.getNom() +
    ' ' + getStr('et') + ' ' + this.perp.d.getNom()
}

CMarqueAngleDroit.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CMarqueAngleAncetre.prototype.depDe4Rec.call(this, p) ||
    this.perp.depDe4Rec(p))
}

CMarqueAngleDroit.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  return '\\draw' + this.tikzLineStyle(dimf, coefmult) + this.tikzPathAngleDroit(dimf, bu) + ';'
}

CMarqueAngleDroit.prototype.estDefiniParObjDs = function (listeOb) {
  return this.perp.estDefPar(listeOb)
}
