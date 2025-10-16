/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CCommentaire from '../objets/CCommentaire'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import { getStr } from '../kernel/kernel'
import AddQueue from '../kernel/addQueue'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilMac

/**
 * Outil ancêtre de tous les outils servant à créer des macros
 * @param {MtgApp} app Application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {number} toolIndex de l'outil
 * @constructor
 * @extends Outil
 */
function OutilMac (app, toolName, toolIndex) {
  if (arguments.length === 0) return
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, toolName, toolIndex, true, false, false, false)
}

OutilMac.prototype = new Outil()

OutilMac.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.mac = null
  this.comClig = null
  app.outilPointageActif = app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff')
}

OutilMac.prototype.creeObjet = function () {
  const app = this.app
  this.annuleClignotement()
  app.ajouteElement(this.mac)
  if (app.verifieDernierElement(1)) {
    this.mac.setReady4MathJax()
    AddQueue(() => {
      this.mac.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    })
    this.saveFig()
    app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
  app.activeOutilCapt()
}

/**
 * Fonction utilisée par tous les outils de création de macro, ajoutant à this un commentaire
 * clignotant et lançant le clignotement
 */
OutilMac.prototype.addComClign = function (point) {
  const app = this.app
  this.comClig = new CCommentaire(app.listePr, null, false, Color.black, point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop,
    getStr('AffIci'))
  this.comClig.positionne(false, app.dimf)
  this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.ajouteClignotementDe(this.comClig)
  this.resetClignotement()
}

OutilMac.prototype.isDisplayTool = function () {
  return true
}
