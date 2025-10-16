/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSegmentClone from '../objets/CSegmentClone'
import CSegment from '../objets/CSegment'
import { getStr } from '../kernel/kernel'
export default CSegmentClone

CSegmentClone.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('SegClone') + ' ' + getStr('of') + ' ' + this.segment.getNom()
}
/**
 *
 * @returns {string}
 */
CSegmentClone.prototype.getNom = function () {
  return this.nom
}

CSegmentClone.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSegment.prototype.depDe4Rec.call(this, p) ||
    this.segment.depDe4Rec(p))
}

CSegmentClone.prototype.estDefiniParObjDs = function (listeOb) {
  return this.segment.estDefPar(listeOb)
}
