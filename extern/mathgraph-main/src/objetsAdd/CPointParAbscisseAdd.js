/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointParAbscisse from '../objets/CPointParAbscisse'
import CPt from '../objets/CPt'
import PtParAbsDlg from '../dialogs/PtParAbsDlg'
import { getStr } from '../kernel/kernel'

export default CPointParAbscisse

CPointParAbscisse.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo16') + ' ' + this.abscisse.chaineInfo() + ' ' +
    getStr('chinfo32') + ' ' + '(' + this.origine.getName() + ',' + this.extremite.getName() + ')'
}

CPointParAbscisse.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.origine.depDe4Rec(p) || this.extremite.depDe4Rec(p) || this.abscisse.depDe4Rec(p))
}

CPointParAbscisse.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CPointParAbscisse.prototype.modifDlg = function (app, callBack1, callBack2) {
  new PtParAbsDlg(app, this, true, callBack1, callBack2)
}

CPointParAbscisse.prototype.appartientDroiteParDefinition = function (droite) {
  /* Modifié version 6.9.1
  return CPt.prototype.appartientDroiteParDefinition.call(this, droite) ||
    (this.origine.appartientDroiteParDefinition(droite) && this.extremite.appartientDroiteParDefinition(droite))
   */
  return this.origine.appartientDroiteParDefinition(droite) && this.extremite.appartientDroiteParDefinition(droite)
}

CPointParAbscisse.prototype.estDefiniParObjDs = function (listeOb) {
  return this.origine.estDefPar(listeOb) &&
  this.extremite.estDefPar(listeOb) &&
  this.abscisse.estDefiniParObjDs(listeOb)
}
