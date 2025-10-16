/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSolutionEquation from '../objets/CSolutionEquation'
import { chaineNombre, getStr } from '../kernel/kernel'
import SolutionEqDlg from '../dialogs/SolutionEqDlg'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CSolutionEquation

CSolutionEquation.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) || this.a.depDe4Rec(p) ||
    this.b.depDe4Rec(p) || this.incertitude.depDe4Rec(p) || this.equation.depDe4Rec(p))
}

CSolutionEquation.prototype.infoHist = function () {
  const variables = [this.inconnue, undefined]
  let ch = this.getNom() + ' : ' + getStr('chinfo98') + ' ' + getStr('chinfo99') + ' ' +
    this.equation.chaineCalculSansPar(variables) + '\n' + getStr('chinfo100') + ' ' + this.a.chaineInfo() + ' ' +
    getStr('et') + ' ' + this.b.chaineInfo() + '\n' +
    getStr('chinfo102') + ' ' + this.incertitude.chaineInfo()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.solution, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CSolutionEquation.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CSolutionEquation.prototype.modifDlg = function (app, callBack1, callBack2) {
  new SolutionEqDlg(app, this, true, callBack1, callBack2)
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
CSolutionEquation.prototype.estDefiniParObjDs = function (listeOb) {
  return this.dependDeAuMoinsUn(listeOb) && this.equation.estDefiniParObjDs(listeOb) &&
  this.a.estDefiniParObjDs(listeOb) &&
  this.b.estDefiniParObjDs(listeOb) &&
  this.incertitude.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CSolutionEquation.prototype.estConstantPourConst = function () {
  return this.a.estConstantPourConst() && this.b.estConstantPourConst() && this.incertitude.estConstantPourConst() && this.equation.estConstantPourConst()
}
