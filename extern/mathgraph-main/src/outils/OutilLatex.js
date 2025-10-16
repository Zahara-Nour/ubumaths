/*
 * Created by yvesb on 14/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CLatex from '../objets/CLatex'
import CCommentaire from '../objets/CCommentaire'
import LatexDlg from '../dialogs/LatexDlg'
import AvertDlg from '../dialogs/AvertDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import addQueue from 'src/kernel/addQueue'
export default OutilLatex
/**
 * Outil servant à créer un affichage de valeur libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilLatex (app) {
  Outil.call(this, app, 'Latex', 32010, true)
}
OutilLatex.prototype = new Outil()

OutilLatex.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff', 'Latex')
}

OutilLatex.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  this.comClig = new CCommentaire(list, null, false, Color.black, point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans, false,
    app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, getStr('AffIci'), null, false)
  this.comClig.positionne(false, app.dimf)
  this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.ajouteClignotementDe(this.comClig)
  this.resetClignotement()
  const self = this
  this.latex = new CLatex(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', null, false)
  new LatexDlg(app, this.latex, false, function () { self.callBackOK() }, function () { self.callBackCancel() })
}

OutilLatex.prototype.callBackOK = function callBackOK () {
  const app = this.app
  app.ajouteElement(this.latex)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.latex.setReady4MathJax()
    addQueue(() => this.latex.creeAffichage(app.svgFigure, false, app.doc.couleurFond))
    this.annuleClignotement()
    this.saveFig()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
  app.activeOutilCapt()
}

OutilLatex.prototype.callBackCancel = function () {
  this.app.activeOutilCapt()
}

OutilLatex.prototype.isDisplayTool = function () {
  return true
}
