/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLatex from '../objets/CLatex'
import { chaineNombre, ConvRadDeg, getStr } from '../kernel/kernel'
import LatexDlg from '../dialogs/LatexDlg'
import ModifAffFinalDlg from '../dialogs/ModifAffFinalDlg'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import TikzColor from '../types/TikzColor'

export default CLatex

CLatex.prototype.info = function () {
  return this.getName() + ' : ' + getStr('chinfo167')
}

CLatex.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += ' ' + getStr('liea') + ' ' + this.pointLie.nom
  return ch + this.infoAngle()
}

CLatex.prototype.modifDlg = function (app, callBack1, callBack2) {
  (this.estElementFinal && this.utiliseValDyn()) ? new ModifAffFinalDlg(app, this, callBack1, callBack2) : new LatexDlg(app, this, true, callBack1, callBack2)
}

CLatex.prototype.setReady4MathJaxEvenMasked = function () {
  this.typeset()
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CLatex.prototype.genereNom = function () {
  CLatex.ind++
  return getStr('rlat') + CLatex.ind
}

CLatex.prototype.setCloneTikz = function (ptel) {
  this.setClone(ptel)
  this.chaineLatex = ptel.chaineLatex // Ajout version 4.8.1 pour exportation Tikz
}

/*
CLatex.prototype.tikz = function(dimf, nomaff, coefmult, bu) {
  var list = this.listeProprietaire;
  var ang = String(this.angText.rendValeurRadian()*ConvRadDeg);
  var style = "";
  switch (this.alignementVertical) {
    case CAffLiePt.alignVerLow :
      style = "above ";
      break;
    case CAffLiePt.alignVerTop :
      style = "below ";
  }
  switch (this.alignementHorizontal) {
    case CAffLiePt.alignHorLeft :
      style += "right";
      break;
    case CAffLiePt.alignHorRight :
      style += "left,";
  }
  if (style !== "") style += ",";
  var tikzCoul = this.tikzCouleur();
  style += tikzCoul + ",";
  if (this.encadrement !== StyleEncadrement.Sans) style +=  "draw="+ tikzCoul + ",";
  if (this.effacementFond) style += "fill=" + TikzColor.colorString(this.couleurFond) +",";
  var dinsepx = list.tikzLongueur(4, dimf, bu)*coefmult;
  var dinsepy = list.tikzLongueur(4, dimf, bu)*coefmult;
  var insepx = chaineNombre(dinsepx,2);
  var insepy = chaineNombre(dinsepy,2);
  style += "inner xsep ="  + insepx + "cm,inner ysep =" + insepy + "cm";
  var x = list.tikzXcoord(this.xNom + this.decX - 7, dimf, bu);
  var y = list.tikzYcoord(this.yNom + this.decY -2, dimf, bu);
  return  "\\node at " + "(" + chaineNombre(x, 3) +", " + chaineNombre(y, 3) +
    ") [align=left," +"rotate=" + ang+ "," + style + ",font= \\sf " + this.tikzFont(dimf, this.taillePolice, coefmult, bu) + "] {$" + this.chaineLatex + "$};";
}
*/

CLatex.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  const ang = String(this.angText.rendValeurRadian() * ConvRadDeg)
  let x0 = this.xNom + this.decX
  let y0 = this.yNom + this.decY
  let style = ''
  switch (this.alignementVertical) {
    case CAffLiePt.alignVerLow :
      style = 'above '
      y0 += 2
      break
    case CAffLiePt.alignVerTop :
      style = 'below '
      y0 -= 2
  }
  switch (this.alignementHorizontal) {
    case CAffLiePt.alignHorLeft :
      style += 'right '
      x0 -= 2
      break
    case CAffLiePt.alignHorRight :
      x0 += 2
      style += 'left '
  }
  const x = list.tikzXcoord(x0, dimf, bu)
  const y = list.tikzYcoord(y0, dimf, bu)

  style += ',' + this.tikzCouleur() + ','
  if (this.encadrement !== StyleEncadrement.Sans) {
    style += 'draw=' + this.tikzCouleur() + ','
    const dinsepx = list.tikzLongueur(2, dimf, bu)
    const dinsepy = list.tikzLongueur(4, dimf, bu)
    const insepx = chaineNombre(dinsepx, 2)
    const insepy = chaineNombre(dinsepy, 2)
    style += 'inner xsep =' + insepx + 'cm,inner ysep =' + insepy + 'cm,'
  }
  if (this.effacementFond) style += 'fill=' + TikzColor.colorString(this.couleurFond) + ','
  const ch = '$' + this.chaineLatex + '$'
  if (ang === '0') {
    return '\\node at ' + '(' + chaineNombre(x, 3) + ', ' + chaineNombre(y, 3) +
      ') [' + style + ',' + style + 'font= \\sf ' + this.tikzFont(dimf, this.taillePolice, coefmult, bu) + '] {' + ch + '};'
  } else {
    return '\\node at ' + '(' + chaineNombre(x, 3) + ', ' + chaineNombre(y, 3) + ') [rotate=' + ang + ',' + style + 'font= \\sf ' +
      this.tikzFont(dimf, this.taillePolice, coefmult, bu) + '] {' + ch + '};'
  }
}

/**
 * Fonction remplaçant dans les codes LaTeX spéciaux MathGraph32 \Lat oldTag par newTag
 * @param {string} oldTag
 * @param {string} newTag
 */
CLatex.prototype.replaceTag = function (oldTag, newTag) {
  this.chaineCommentaire = this.chaineCommentaire.replaceAll('\\Lat{' + oldTag + '}', '\\Lat{' + newTag + '}')
}
