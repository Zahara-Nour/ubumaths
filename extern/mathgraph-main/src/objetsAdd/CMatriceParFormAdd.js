/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMatriceParForm from '../objets/CMatriceParForm'
import CCalcul from '../objets/CCalcul'
import { chaineNombre, getStr } from '../kernel/kernel'
import MatriceParFormDlg from '../dialogs/MatriceParFormDlg'

export default CMatriceParForm

CMatriceParForm.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('MatriceParForm')
}

CMatriceParForm.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('MatriceParForm') + ' ' + this.nbrow.chaineInfo() + 'x' + this.nbcol.chaineInfo()
  ch += '\n' + getStr('Formule') + ' : ' + this.calcul.chaineCalculSansPar(['i', 'j'])
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  else {
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

CMatriceParForm.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalcul.prototype.depDe4Rec.call(this, p) ||
    this.calcul.depDe4Rec(p) || this.nbrow.depDe4Rec(p) || this.nbcol.depDe4Rec(p))
}

/**
 * Sert à savoir si un objet est défini uniquement par des objets figurant dans une liste
 * Attention : cette fonction est spéciale pour cet objet
 * En effet, un objet calcul descendant de CCAlculBase ne faisant référence
 * qu'à des constantes renvoie true dans EstDefiniParObjetDans
 * Il faut donc qu'en plus le calcul dépende d'au moins un des objets sources
 * @param listeOb
 * @returns {boolean}
 */
CMatriceParForm.prototype.estDefiniParObjDs = function (listeOb) {
  return this.dependDeAuMoinsUn(listeOb) && this.calcul.estDefiniParObjDs(listeOb) &&
    this.nbrow.estDefiniParObjDs(listeOb) && this.nbcol.estDefiniParObjDs(listeOb)
}

CMatriceParForm.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMatriceParForm.prototype.modifDlg = function (app, callBack1, callBack2) {
  new MatriceParFormDlg(app, this, true, callBack1, callBack2)
}
