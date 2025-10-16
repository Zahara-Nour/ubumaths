/*
 * Created by yvesb on 11/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Pointeur from '../types/Pointeur'
import OutilPointage from '../pointage/OutilPointage'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
export default OutilPointageRapporteur

/**
 * Outil servant à finir d'utiliser les outils utilisant un rapporteur virtuel
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageRapporteur (app) {
  OutilPointage.call(this, app)
  this.objetDesigne = null // Sera l'objet transmis à l'outil après d'éventuelles boîtes de dialogue de choix
}
OutilPointageRapporteur.prototype = new OutilPointage()

OutilPointageRapporteur.prototype.reset = function () {
  this.ptPointLieCercle = null
}

OutilPointageRapporteur.prototype.associePointLie = function (ptInit) {
  this.ptPointLieCercle = ptInit
}

OutilPointageRapporteur.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}
OutilPointageRapporteur.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageRapporteur.prototype.devicemove = function (evt, type, fonc) {
  const app = this.app
  const doc = app.doc
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  // if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const svg = app.svgFigure
  const point = fonc(svg, evt, app.zoomFactor)
  const x = point.x
  const y = point.y
  // var poss = this.ptPointLieCercle.testDeplacement(cadre.dimf,mouseEvent.getX(),
  //   mouseEvent.getY(), pointres, pointabs);
  const pointres = { x: 0, y: 0 }
  const abs = new Pointeur()
  const poss = this.ptPointLieCercle.testDeplacement(app.dimf, x, y, pointres, abs)
  if (poss) {
    this.ptPointLieCercle.donneAbscisse(abs.getValue())
    app.listeObjetsVisuels.positionne(false, app.dimf)
    app.listeObjetsVisuels.update(svg, app.doc.couleurFond, true)
  }
}

OutilPointageRapporteur.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageRapporteur.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageRapporteur.prototype.devicedown = function (evt, type, fonc) {
  this.app.outilActif.creeObjet()
}

OutilPointageRapporteur.prototype.touchend = function (evt) {
  if (this.app.outilActif.isReadyForTouchEnd()) this.devicedown(evt, 'touch', touchPosition)
}
