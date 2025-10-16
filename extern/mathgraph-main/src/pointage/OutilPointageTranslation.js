/*
 * Created by yvesb on 09/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPointage from './OutilPointage'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
export default OutilPointageTranslation
/**
 * Outil de pointage servant pour l'outil de translation de la figure
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageTranslation (app) {
  OutilPointage.call(this, app)
}
OutilPointageTranslation.prototype = new OutilPointage()

OutilPointageTranslation.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageTranslation.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageTranslation.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;

  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  this.xclic = point.x
  this.yclic = point.y
  this.isTranslating = true
}

OutilPointageTranslation.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}

OutilPointageTranslation.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageTranslation.prototype.devicemove = function (evt, type, fonc) {
  if (!this.isTranslating) return
  this.app.outilTranslationFigure.cursor = 'move'
  const app = this.app
  const doc = app.doc
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  // if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const svg = this.app.svgFigure
  const point = fonc(svg, evt, app.zoomFactor)
  const x = point.x
  const y = point.y
  const decx = x - this.xclic
  const decy = y - this.yclic
  if ((decx !== 0) && (decy !== 0)) {
    const list = app.listePr
    const modif = list.translateDe(decx, decy)
    this.xclic = x
    this.yclic = y
    if (modif) {
      list.positionne(false, app.dimf)
      list.update(app.svgFigure, app.doc.couleurFond, true, true) // Modifié version 6.4.8
    }
  }
}

OutilPointageTranslation.prototype.deviceup = function () {
  this.app.doc.type = '' // Pour autoriser à nouveau tous les événements souris ou touch
  this.app.outilTranslationFigure.cursor = 'default'
  this.isTranslating = false
}

OutilPointageTranslation.prototype.touchend = function () {
  this.deviceup()
}

OutilPointageTranslation.prototype.touchcancel = function () {
  this.deviceup()
}

OutilPointageTranslation.prototype.mouseup = function () {
  this.deviceup()
}
