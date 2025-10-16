/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalcul from '../objets/CCalcul'
import { chaineNombre, getStr } from '../kernel/kernel'
import CalculDlg from '../dialogs/CalculDlg'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CCalcul

CCalcul.prototype.info = function () {
  return this.getNom() + ' = ' + this.calcul.chaineCalculSansPar()
}

CCalcul.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('Calcul') + '\n' + this.getNom() + ' = ' + this.calcul.chaineCalculSansPar()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.resultat, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CCalcul.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CCalcul.prototype.modifDlg = function (app, callBack1, callBack2) {
  new CalculDlg(app, this, true, true, callBack1, callBack2)
}

CCalcul.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) || this.calcul.depDe4Rec(p))
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
CCalcul.prototype.estDefiniParObjDs = function (listeOb) {
  return this.dependDeAuMoinsUn(listeOb) && this.calcul.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CCalcul.prototype.estConstantPourConst = function () {
  if (this.calcul === null) return false
  return this.calcul.estConstantPourConst()
}
