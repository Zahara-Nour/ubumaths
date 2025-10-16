/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPointage from './OutilPointage'
import { preventDefault } from '../kernel/kernel'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
export default OutilPointageClic
/**
 * Outil de pointage servant aux outils de création d'objet en cliquanr sur un endroit quelconque de la figure
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageClic (app) {
  OutilPointage.call(this, app)
}
OutilPointageClic.prototype = new OutilPointage()

OutilPointageClic.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageClic.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageClic.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;

  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  // var dimf = app.dimf;
  // Ligne suivante devenue inutile depuis que les événements souris et touch sont interceptés pas un rectangle
  // if (point.x<0 || point.x>dimf.x || point.y<0 || point.y>dimf.y) return;
  // Les deux lignes suivantes sont nécessaires pour que, quand une boîte de dialogue va s'ouvrir, si on a cliqué
  // à l'endroit par exemple du bouton Annuler la boîte de referme tout de suite.
  preventDefault(evt)
  evt.stopPropagation()
  app.outilActif.traiteObjetDesigne(null, point)
}

OutilPointageClic.prototype.mouseup = function () {
  this.app.doc.type = '' // Pour autoriser à nouveau tout événement mouse ou touch
}
