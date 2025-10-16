/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CMesureAngleGeometrique from '../objets/CMesureAngleGeometrique'
import { chaineNombre, getStr } from '../kernel/kernel'
import CValDyn from '../objets/CValDyn'
export default CMesureAngleGeometrique

CMesureAngleGeometrique.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CValDyn.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.o.depDe4Rec(p) || this.b.depDe4Rec(p))
}

CMesureAngleGeometrique.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('chinfo29') + ' ' + this.getNom()
}

CMesureAngleGeometrique.prototype.infoHist = function () {
  let ch = this.info()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.mesure, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureAngleGeometrique.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.o.estDefPar(listeOb) &&
  this.b.estDefPar(listeOb)
}
