/*
 * Created by yvesb on 28/11/2016.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CDeriveePartielle from '../objets/CDeriveePartielle'
import { getStr } from '../kernel/kernel'
import CFoncNVar from '../objets/CFoncNVar'
import DeriveePartielleDlg from '../dialogs/DeriveePartDlg'
export default CDeriveePartielle

/**
 * Fonction renvoyant un tableau de chaîne de caractères représentant les noms des variables utilisée pour la fonction
 * @returns {string}
 */
CDeriveePartielle.prototype.getVariable = function () {
  return this.fonctionAssociee.getVariable()
}

CDeriveePartielle.prototype.info = function () {
  const nomsVariables = this.getVariable()
  let ch = this.getNom() + '('
  for (let i = 0; i < this.nbVar; i++) {
    ch = ch + nomsVariables[i]
    if (i !== this.nbVar - 1) { ch = ch + ',' }
  }
  return ch + ') : ' + getStr('Fonction') + ' ' + getStr('ch190')
}

CDeriveePartielle.prototype.infoHist = function () {
  return this.getNom() + ' : ' + getStr('Fonction') + ' ' + getStr('ch190') + '\n' + this.fonctionAssociee.getNom() + ' ' +
    getStr('ch191') + ' ' + this.getVariable()[this.indiceVariableDerivation]
}

CDeriveePartielle.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CDeriveePartielle.prototype.modifDlg = function (app, callBack1, callBack2) {
  new DeriveePartielleDlg(app, this, true, callBack1, callBack2)
}

CDeriveePartielle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CFoncNVar.prototype.depDe4Rec.call(this, p) || this.fonctionAssociee.depDe4Rec(p))
}

CDeriveePartielle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb)
}
