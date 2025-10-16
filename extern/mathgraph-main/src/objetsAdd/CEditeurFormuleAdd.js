/*
 * Created by yvesb on 06/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAffLiePt from '../objets/CAffLiePt'
import CEditeurFormule from '../objets/CEditeurFormule'
import EditeurFormuleDlg from '../dialogs/EditeurFormuleDlg'
import { getStr } from '../kernel/kernel'
import $ from 'jquery'

export default CEditeurFormule

/**
 * Fonction détruisant l'élément el et retirant son composant graphique s'il existe
 * @param svg Le svg de la figure
 */
CEditeurFormule.prototype.removegElement = function (svg) {
  CAffLiePt.prototype.removegElement.call(this, svg)
  if (this.affichageFormule) this.latex.removegElement(svg)
}

CEditeurFormule.prototype.modifiableParMenu = function () {
  return true
}

CEditeurFormule.prototype.modifDlg = function (app, callBack1, callBack2) {
  new EditeurFormuleDlg(app, this, true, callBack1, callBack2)
}

CEditeurFormule.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CAffLiePt.prototype.depDe4Rec.call(this, p) ||
    this.calculAssocie.depDe4Rec(p))
}

CEditeurFormule.prototype.info = function () {
  return getStr('EditeurFormule') + ' ' + getStr('of') + ' ' + this.calculAssocie.getNom()
}

CEditeurFormule.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += ' ' + getStr('liea') + ' ' + this.pointLie.nom
  return ch
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CEditeurFormule.prototype.genereNom = function () {
  CEditeurFormule.ind++
  return getStr('redit') + CEditeurFormule.ind
}

/**
 * Fonction utilisée dans la boîte de dialogue ProtocoleDlg et montrant ou cachant le g Element
 * représentant graphiquement l'objet.
 * Doit être redéfini pour les lieux d'objets qui contient eux-aussi de g elements et les éditeurs de formule
 * @param bshow Si true on montre le g Element sinon on le cache
 */
CEditeurFormule.prototype.showgElt = function (bshow) {
  CAffLiePt.prototype.showgElt.call(this, bshow)
  this.editeur.style.visibility = bshow ? 'visible' : 'hidden'
  if (this.affichageFormule && this.glatex) $(this.glatex).attr('visibility', bshow ? 'visible' : 'hidden')
}

CEditeurFormule.prototype.positionneTikz = function (infoRandom, dimfen) {
  // Il ne faut pas appeler CEditeurFormule.positionne()
  CAffLiePt.prototype.positionne.call(this, infoRandom, dimfen)
}

CEditeurFormule.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const calcul = this.calculAssocie
  if (this.affichageFormule) {
    this.chaineAAfficher += '$' + calcul.calcul.chaineLatexSansPar(calcul.variableFormelle()) + '$'
  } else this.chaineAAfficher += calcul.calcul.chaineCalcul(calcul.variableFormelle())
  return CAffLiePt.prototype.tikz.call(this, dimf, nomaff, coefmult, bu)
}

CEditeurFormule.prototype.estDefiniParObjDs = function (listeOb) {
  return CAffLiePt.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.calculAssocie.estDefPar(listeOb)
}
