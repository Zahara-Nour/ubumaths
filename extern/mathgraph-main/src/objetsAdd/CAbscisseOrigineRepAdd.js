/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAbscisseOrigineRep from '../objets/CAbscisseOrigineRep'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
import InfoRepDlg from '../dialogs/InfoRepDlg'
export default CAbscisseOrigineRep

CAbscisseOrigineRep.prototype.info = function () {
  return this.getNom() + ' : ' + getStr('AbsOrRep') + ' ' + this.rep.getNom()
}

CAbscisseOrigineRep.prototype.infoHist = function () {
  let ch = this.nomCalcul + ' : ' + getStr('AbsOrRep') + ' ' + this.rep.getNom()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.value, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CAbscisseOrigineRep.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CAbscisseOrigineRep.prototype.modifDlg = function (app, callBack1, callBack2) {
  new InfoRepDlg(app, this, 0, true, callBack1, callBack2)
}

CAbscisseOrigineRep.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) || this.rep.depDe4Rec(p))
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string} Le nom généré
 */
CAbscisseOrigineRep.prototype.genereNom = function () {
  CAbscisseOrigineRep.ind++
  return 'absor' + CAbscisseOrigineRep.ind
}

CAbscisseOrigineRep.prototype.estDefiniParObjDs = function (listeOb) {
  return this.rep.estDefPar(listeOb)
}
