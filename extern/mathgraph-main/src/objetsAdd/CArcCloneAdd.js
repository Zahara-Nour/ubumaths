/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CArcClone from 'src/objets/CArcClone'
import CArcDeCercleAncetre from 'src/objets/CArcDeCercleAncetre'
import { getStr } from 'src/kernel/kernel'
export default CArcClone

CArcClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('ArcClone') + ' ' + getStr('of') + ' ' + this.arc.getName()
}
CArcClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CArcDeCercleAncetre.prototype.depDe4Rec.call(this, p) || this.arc.depDe4Rec(p))
}
CArcClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.arc.estDefPar(listeOb)
}
CArcClone.prototype.contientParDefinition = function (po) {
  return this.arc.contientParDefinition(po)
}
