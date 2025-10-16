/*
 * Created by yvesb on 14/06/2022.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CMatriceDecomp from 'src/objets/CMatriceDecomp'
import { getStr } from 'src/kernel/kernel'
import CCalculAncetre from 'src/objets/CCalculAncetre'
import MatriceDecompDlg from 'src/dialogs/MatriceDecompDlg'

export default CMatriceDecomp

CMatriceDecomp.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('MatDecomp')
}

CMatriceDecomp.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('MatDecomp') + ' ' + getStr('of') + ' ' + this.nb.getNom()
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

CMatriceDecomp.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.nb.depDe4Rec(p))
}

CMatriceDecomp.prototype.estDefiniParObjDs = function (listeOb) {
  return this.nb.estDefiniParObjDs(listeOb)
}

CMatriceDecomp.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMatriceDecomp.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MatriceDecompDlg(app, this, true, callBack1, callBack2)
}
