/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CValeurAffichee from '../objets/CValeurAffichee'
import CAffLiePt from '../objets/CAffLiePt'
import AffichageValeurDlg from '../dialogs/AffichageValeurDlg'
import { getStr } from '../kernel/kernel'
export default CValeurAffichee

CValeurAffichee.prototype.info = function () {
  return this.nom + ' : ' + getStr('AffichageValeur') + ' ' + getStr('of') + ' ' + this.valeurAssociee.getNom()
}

CValeurAffichee.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += ' ' + getStr('liea') + ' ' + this.pointLie.getName()
  return ch + this.infoAngle()
}

CValeurAffichee.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CAffLiePt.prototype.depDe4Rec.call(this, p) ||
    this.valeurAssociee.depDe4Rec(p))
}

CValeurAffichee.prototype.modifiableParMenu = function () {
  return true // On peut modifier un affichage de valeur qui est élément final de construction
  // mais pas modifier la valeur à afficher
}

CValeurAffichee.prototype.modifDlg = function (app, callBack1, callBack2) {
  new AffichageValeurDlg(app, this, true, callBack1, callBack2)
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CValeurAffichee.prototype.genereNom = function () {
  CValeurAffichee.ind++
  return getStr('raffval') + CValeurAffichee.ind
}

CValeurAffichee.prototype.estDefiniParObjDs = function (listeOb) {
  return CAffLiePt.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.valeurAssociee.estDefPar(listeOb)
}
