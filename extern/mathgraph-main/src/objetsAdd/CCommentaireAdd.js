/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCommentaire from '../objets/CCommentaire'
import CommentaireDlg from '../dialogs/CommentaireDlg'
import CAffLiePt from '../objets/CAffLiePt'
import { getStr } from '../kernel/kernel'
import ModifAffFinalDlg from '../dialogs/ModifAffFinalDlg'
export default CCommentaire

CCommentaire.prototype.info = function () {
  return this.getName() + ' : ' + getStr('Commentaire')
}
CCommentaire.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += ' ' + getStr('liea') + ' ' + this.pointLie.nom
  return ch + this.infoAngle()
}

CCommentaire.prototype.modifiableParMenu = function () {
  return true
}

CCommentaire.prototype.modifDlg = function (app, callBack1, callBack2) {
  (this.estElementFinal && this.utiliseValDyn()) ? new ModifAffFinalDlg(app, this, callBack1, callBack2) : new CommentaireDlg(app, this, true, callBack1, callBack2)
}

CCommentaire.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CAffLiePt.prototype.depDe4Rec.call(this, p) ||
    this.listValDynUsed.depDe4Rec(p))
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CCommentaire.prototype.genereNom = function () {
  CCommentaire.ind++
  return getStr('rcom') + CCommentaire.ind
}

CCommentaire.prototype.estDefiniParObjDs = function (listeOb) {
  return CAffLiePt.prototype.estDefiniParObjDs.call(this, listeOb) &&
    this.listValDynUsed.estDefiniParObjDs(listeOb)
}

/**
 * Renvoie true si le texte de l'affichage de texte (ou de LateX) dépend d'une valeur dynamique utilisée
 * @returns {boolean}
 */
CCommentaire.prototype.utiliseValDyn = function () {
  return this.listValDynUsed.longueur() > 0
}
