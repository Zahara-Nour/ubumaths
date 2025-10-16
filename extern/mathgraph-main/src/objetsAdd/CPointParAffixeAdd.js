/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointParAffixe from '../objets/CPointParAffixe'
import CPt from '../objets/CPt'
import PtParAffDlg from '../dialogs/PtParAffDlg'
import { getStr } from '../kernel/kernel'
export default CPointParAffixe

CPointParAffixe.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo164') + ' ' + this.affixe.chaineInfo() + ' ' +
    getStr('chinfo32') + ' ' + this.rep.getNom()
}

CPointParAffixe.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.rep.depDe4Rec(p) || this.affixe.depDe4Rec(p))
}

CPointParAffixe.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPointParAffixe.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PtParAffDlg(app, this, true, callBack1, callBack2)
}

CPointParAffixe.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb) &&
  this.affixe.estDefiniParObjDs(listeOb)
}
