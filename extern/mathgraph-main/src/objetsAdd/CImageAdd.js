/*
 * Created by yvesb on 11/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CImage from '../objets/CImage'
import { getStr } from '../kernel/kernel'
import CAffLiePt from '../objets/CAffLiePt'
import ImageDlg from '../dialogs/ImageDlg'
export default CImage

CImage.prototype.modifiableParMenu = function () {
  return true
}

CImage.prototype.info = function () {
  return this.nom + ' : ' + getStr('Image')
}

CImage.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += ' ' + getStr('liea') + ' ' + this.pointLie.getName()
  return ch
}

CImage.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CAffLiePt.prototype.depDe4Rec.call(this, p) || this.largeur.depDe4Rec(p))
}

CImage.prototype.estDefiniParObjDs = function (listeOb) {
  return CAffLiePt.prototype.estDefiniParObjDs.call(this, listeOb) && this.largeur.estDefiniParObjDs(listeOb)
}

CImage.prototype.modifDlg = function (app, callBack1, callBack2) {
  new ImageDlg(app, this, true, callBack1, callBack2)
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CImage.prototype.genereNom = function () {
  CImage.ind++
  return getStr('rim') + CImage.ind
}

/* A revoir plus tard ...
CImage.prototype.tikz = function(dimf, nomaff, coefmult, bu) {
  var list = this.listeProprietaire;
  var style = "";
  switch (alignementVertical) {
    case CAffLiePt.alignVerLow :
      style = "above ";
      break;
    case CAffLiePt.alignVerTop :
      style = "below ";
  }
  switch (alignementHorizontal) {
    case CAffLiePt.alignHorLeft :
      style += "right";
      break;
    case CAffLiePt.alignHorRight :
      style += "left";
  }
  if (style !== "") style += ",";
  style += this.tikzCouleur() + ",";
  if (this.encadrement !== StyleEncadrement.Sans) style +=  "draw="+ this.tikzCouleur() + ",";
  if (this.effacementFond) style += "fill=" + TikzColor.colorString(this.couleurFond) +",";
  style += "inner xsep =0cm,inner ysep =0cm";
  var x = Math.round(xNom + decX);
  var y = Math.round(yNom + decY);
  var x1 = list.tikzXcoord(x, dimf, bu);
  var y1 = list.tikzYcoord(y, dimf, bu);
  // var widthcm = list.tikzLongueur(image.getWidth()*coefmult, dimf, bu);
  var widthcm = list.tikzLongueur(this.width*coefmult, dimf, bu);
  var ch = "{\\includegraphics[width=" + Kernel.chaineNombre(widthcm, 3)
    + "cm]{"+listeProprietaire.documentProprietaire.nomDocument().replace(".mgj", listeProprietaire.indexOfImage(this)+".png}");
  return  "\\node at " + "(" + Kernel.chaineNombre(x1, 3) +", " + Kernel.chaineNombre(y1, 3) +
    ") [align=left," + style + "] " + ch + "};";
}
*/

CImage.prototype.tikz = function () {
  return ''
}

CImage.prototype.adaptRes = function (coef) {
  CAffLiePt.prototype.adaptRes.call(this, coef)
  this.rectAff.width *= coef
  this.rectAff.height *= coef
}
