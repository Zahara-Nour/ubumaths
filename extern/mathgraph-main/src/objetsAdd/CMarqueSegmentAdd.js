/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMarqueSegment from '../objets/CMarqueSegment'
import CElementLigne from '../objets/CElementLigne'
import { getStr } from '../kernel/kernel'
export default CMarqueSegment

CMarqueSegment.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('MarqueSeg') + ' ' + this.segmentAssocie.point1.getName() +
    this.segmentAssocie.point2.getName()
}

CMarqueSegment.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementLigne.prototype.depDe4Rec.call(this, p) ||
    this.segmentAssocie.depDe4Rec(p))
}

CMarqueSegment.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist
  if ((!this.existe) || (masquage && this.masque)) return -1
  else {
    if (this.segment1.existe) {
      dist = this.segment1.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
    if (this.segment2.existe) {
      dist = this.segment2.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
    if (this.segment3.existe) {
      dist = this.segment3.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
    return -1
  }
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CMarqueSegment.prototype.genereNom = function () {
  CMarqueSegment.ind++
  return getStr('rmseg') + CMarqueSegment.ind
}

CMarqueSegment.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  if (this.segment1.existe && !this.segment1.horsFenetre) ch += this.segment1.tikz(dimf, nomaff, coefmult, bu)
  if (this.segment2.existe && !this.segment2.horsFenetre) ch += this.segment2.tikz(dimf, nomaff, coefmult, bu)
  if (this.segment3.existe && !this.segment3.horsFenetre) ch += this.segment3.tikz(dimf, nomaff, coefmult, bu)
  return ch
}

CMarqueSegment.prototype.estDefiniParObjDs = function (listeOb) {
  return this.segmentAssocie.estDefPar(listeOb)
}
