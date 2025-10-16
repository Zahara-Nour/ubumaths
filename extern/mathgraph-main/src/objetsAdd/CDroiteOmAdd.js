/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteOm from '../objets/CDroiteOm'
import CoefDirDlg from '../dialogs/CoefDirDlg'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'

export default CDroiteOm

CDroiteOm.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo152') + ' ' + this.m.chaineInfo() + ' ' +
    getStr('chinfo196') + ' ' + this.o.getName() + ' ' + getStr('chinfo32') + ' ' + this.rep.getNom()
}

CDroiteOm.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CDroiteOm.prototype.modifDlg = function (app, callBack1, callBack2) {
  new CoefDirDlg(app, this, true, callBack1, callBack2)
}

CDroiteOm.prototype.contientParDefinition = function (po) {
  return (this.o === po) || (CDroite.prototype.contientParDefinition.call(this, po))
}

CDroiteOm.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.rep.depDe4Rec(p) || this.m.depDe4Rec(p))
}

CDroiteOm.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb) &&
  this.o.estDefPar(listeOb) &&
  this.m.estDefiniParObjDs(listeOb)
}
