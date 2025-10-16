/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import CMatrice from '../objets/CMatrice'
import CMatrice from '../objets/CMatrice'
import CCalculAncetre from '../objets/CCalculAncetre'
import { chaineNombre, getStr } from '../kernel/kernel'
import MatriceDlg from '../dialogs/MatriceDlg'
// export default CMatrice
export default CMatrice

CMatrice.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('Matrice') + ' ' + this.n + 'x' + this.p
}

CMatrice.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('Matrice') + ' ' + this.n + 'x' + this.p
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  else {
    for (let i = 0; i < this.n; i++) {
      ch += '\n'
      for (let j = 0; j < this.p; j++) {
        if (j !== 0) ch += '   '
        ch += this.tabVal[i][j].chaineInfo()
      }
    }
    ch += '\n' + getStr('Valeur') + ' :'
    for (let i = 0; i < this.n; i++) {
      ch += '\n'
      for (let j = 0; j < this.p; j++) {
        if (j !== 0) ch += '   '
        ch += chaineNombre(this.mat.get([i, j]), 12)
      }
    }
  }
  return ch
}

CMatrice.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let dep = false
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      dep = dep || this.tabVal[i][j].depDe4Rec(p)
      if (dep) break
    }
  }
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) || dep)
}

CMatrice.prototype.estDefiniParObjDs = function (listeOb) {
  let res = true
  for (let i = 0; (i < this.n) && res; i++) {
    for (let j = 0; (j < this.p) && res; j++) {
      res = res && this.tabVal[i][j].estDefiniParObjDs(listeOb)
    }
  }
  return res
}

CMatrice.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMatrice.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MatriceDlg(app, this, true, callBack1, callBack2)
}
