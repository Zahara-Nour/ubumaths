/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointBaseEnt from '../objets/CPointBaseEnt'
import PtBaseEntDlg from '../dialogs/PtBaseEntDlg'
import CPointAncetrePointsMobiles from '../objets/CPointAncetrePointsMobiles'
import { chaineNombre, getStr } from '../kernel/kernel'
export default CPointBaseEnt

CPointBaseEnt.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo139') + ' (' + chaineNombre(this.abs, 0) + ';' +
    chaineNombre(this.ord, 0) + ') ' + getStr('chinfo32') + ' ' + this.rep.getNom()
}

CPointBaseEnt.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let res = CPointAncetrePointsMobiles.prototype.depDe4Rec.call(this, p) || this.rep.depDe4Rec(p)
  if (!this.absLibres) res = res || this.absMin.depDe4Rec(p) || this.absMax.depDe4Rec(p)
  if (!this.ordLibres) res = res || this.ordMin.depDe4Rec(p) || this.ordMax.depDe4Rec(p)
  return this.memDep4Rec(res)
}

CPointBaseEnt.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPointBaseEnt.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PtBaseEntDlg(app, this, true, callBack1, callBack2)
}

CPointBaseEnt.prototype.estDefiniParObjDs = function (listeOb) {
  let res = this.rep.estDefPar(listeOb)
  if (!this.absLibres) res = res && this.absMin.estDefiniParObjDs(listeOb) && this.absMax.estDefiniParObjDs(listeOb)
  if (!this.ordLibres) res = res && this.ordMin.estDefiniParObjDs(listeOb) && this.ordMax.estDefiniParObjDs(listeOb)
  return res
}
