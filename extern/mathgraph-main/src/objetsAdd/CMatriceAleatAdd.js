/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMatriceAleat from '../objets/CMatriceAleat'
import CCalculAncetre from '../objets/CCalculAncetre'
import { getStr } from '../kernel/kernel'
import MatriceAleatDlg from '../dialogs/MatriceAleatDlg'

export default CMatriceAleat

CMatriceAleat.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('MatriceAleat')
}

CMatriceAleat.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('MatriceAleat') + ' ' + this.n + 'x' + this.p
  ch += '\n' + getStr('MatAleatComp') + this.min.chaineInfo() + ' ' + getStr('et') + ' ' +
    this.max.chaineInfo()
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  else {
    for (let i = 0; i < this.n; i++) {
      ch += '\n'
      for (let j = 0; j < this.p; j++) {
        if (j !== 0) ch += '   '
        ch += this.mat.get([i, j])
      }
    }
  }
  return ch
}

CMatriceAleat.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) || this.min.depDe4Rec(p) || this.max.depDe4Rec(p))
}

CMatriceAleat.prototype.estDefiniParObjDs = function (listeOb) {
  return (this.min.estDefiniParObjDs(listeOb)) && (this.max.estDefiniParObjDs(listeOb))
}

CMatriceAleat.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMatriceAleat.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MatriceAleatDlg(app, this, true, callBack1, callBack2)
}
