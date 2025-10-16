/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating onlinhe dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointDansRepere from '../objets/CPointDansRepere'
import CPt from '../objets/CPt'
import PtParCoordDlg from '../dialogs/PtParCoordDlg'
import { getStr } from '../kernel/kernel'
export default CPointDansRepere

CPointDansRepere.prototype.info = function () {
  return this.getName() + ' : ' + getStr('chinfo140') + ' (' + this.abs.chaineInfo() + ';' +
    this.ord.chaineInfo() + ') '
}

CPointDansRepere.prototype.infoHist = function () {
  return this.info() + '\n' + getStr('chinfo32') + ' ' + this.rep.getNom()
}

CPointDansRepere.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.rep.depDe4Rec(p) || this.abs.depDe4Rec(p) || this.ord.depDe4Rec(p))
}

CPointDansRepere.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPointDansRepere.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PtParCoordDlg(app, this, true, callBack1, callBack2)
}

CPointDansRepere.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb) &&
  this.abs.estDefiniParObjDs(listeOb) &&
  this.ord.estDefiniParObjDs(listeOb)
}
