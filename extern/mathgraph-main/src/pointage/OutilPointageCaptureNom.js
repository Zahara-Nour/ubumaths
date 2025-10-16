/*
 * Created by yvesb on 31/01/2017.
 */
import { cens } from 'src/kernel/dom'
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
import OutilPointage from './OutilPointage'
import { projetteOrtho } from 'src/kernel/kernelVect'
import { circleLensOpacity, decxLens, decyLens, radiusLens, ratioLens } from '../kernel/kernel'

export default OutilPointageCaptureNom

/**
 * Outil de pointage utilisé par l'outil de capture d'objet mobile
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageCaptureNom (app) {
  OutilPointage.call(this, app)
}
OutilPointageCaptureNom.prototype = new OutilPointage()

OutilPointageCaptureNom.prototype.reset = function () {
  OutilPointage.prototype.reset.call(this)
  this.app.elementCapture = null
}

OutilPointageCaptureNom.prototype.setLensPosition = function (x, y) {
  const app = this.app
  app.svgLens.setAttribute('display', 'block')
  if (!app.circleLens) {
    app.circleLens = cens('circle', {
      cx: '0',
      cy: '0',
      r: String(radiusLens),
      style: `fill:#fff000; fill-opacity: ${circleLensOpacity};`
    })
    // On met le cercle matérialisant la loupe dans le svg global qui est le parent du svg de la figure
    app.svgFigure.parentNode.appendChild(app.circleLens)
  }
  if (app.useLens) {
    let decy = decyLens
    if (y + ratioLens * decy - 0.5 * radiusLens < 0) decy = -decyLens
    app.svgLens.setAttribute('transform', `translate(${x},${y}) scale(${ratioLens}) translate(-${x},-${y}) translate(${decxLens},${decy})`)
    app.circleClip.setAttribute('cx', String(x))
    app.circleClip.setAttribute('cy', String(y))
    app.circleLens.setAttribute('cx', String(x + decxLens * ratioLens))
    app.circleLens.setAttribute('cy', String(y + decy * ratioLens))
  }
}

OutilPointageCaptureNom.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}
OutilPointageCaptureNom.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageCaptureNom.prototype.devicemove = function (evt, type, fonc) {
  let eltNomProche, nouvelleAbs, x1, y1, proj, decxn, decyn
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  // if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const elc = app.elementCapture
  const tab = fonc(svg, evt, app.zoomFactor)
  const xn = tab.x
  const yn = tab.y
  if (elc === null) {
    eltNomProche = app.listePr.premierObjetNomProcheDe(this.aDesigner, xn, yn, type, app.listeExclusion)
    // document.body.style.cursor = (eltNomProche !== null)? "pointer" : "default";
    app.outilActif.cursor = (eltNomProche !== null) ? 'pointer' : 'default'
  } else {
    if (elc.estDeNature(NatObj.NTtPoint)) {
      decxn = xn - this.xinit + elc.decX
      decyn = yn - this.yinit + elc.decY
      if (decyn < -180) decyn = -180
      else {
        if (decyn > 90) decyn = 90
      }
      if (decxn < -180) decxn = -180
      else {
        if (decxn > 90) decxn = 90
      }
      elc.decaleNom(decxn, decyn)
    } else {
      if (elc.estDeNature(NatObj.NDroite)) {
        x1 = elc.xNom + elc.decX + xn - this.xinit
        y1 = elc.yNom + elc.decY + yn - this.yinit
        proj = { x: 0, y: 0 }
        projetteOrtho(xn, yn, elc.point_x, elc.point_y, elc.vect, proj)
        if (elc.xext1 !== elc.xext2) nouvelleAbs = (proj.x - elc.xext1) / (elc.xext2 - elc.xext1)
        else nouvelleAbs = (proj.y - elc.yext1) / (elc.yext2 - elc.yext1)
        decxn = x1 - proj.x
        decyn = y1 - proj.y
        if (decyn < -90) decyn = -90
        else {
          if (decyn > 90) decyn = 90
        }
        if (decxn < -90) decxn = -90
        else {
          if (decxn > 90) decxn = 90
        }
        elc.decaleNom(decxn, decyn)
        elc.abscisseNom = nouvelleAbs
      }
    }
    this.xinit = xn
    this.yinit = yn
    elc.positionne(false, app.dimf)
    elc.updateNamePosition()
    // Il faut aussi mettre à jour les éventuels objets dupliqués de l'objet en cours d'édition
    const list = app.listePr
    for (const el of list.col) {
      if (el.estDeNature(NatObj.NObjetDuplique) && el.elementDuplique === elc) el.update(svg, doc.couleurFond)
    }
    if (app.useLens) {
      this.setLensPosition(xn, yn)
    }
  }
}

OutilPointageCaptureNom.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

OutilPointageCaptureNom.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}

OutilPointageCaptureNom.prototype.devicedown = function (evt, type, fonc) {
  const app = this.app
  const svg = app.svgFigure
  const doc = app.doc
  if (!doc.isActive) return
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  app.elementCapture = app.listePr.premierObjetNomProcheDe(this.aDesigner, point.x, point.y, type, app.listeExclusion)
  if (app.elementCapture !== null) {
    this.xinit = point.x
    this.yinit = point.y
  }
}

OutilPointageCaptureNom.prototype.deviceup = function () {
  const app = this.app
  app.doc.type = '' // Pour autoriser à nouveau tous les événements souris ou touch
  if (app.elementCapture) app.outilCaptNom.saveFig()
  app.elementCapture = null
  if (app.circleLens) {
    app.svgLens.setAttribute('display', 'none')
    app.svgFigure.parentNode.removeChild(app.circleLens)
    app.circleLens = null
  }
  document.body.style.cursor = 'default'
}

OutilPointageCaptureNom.prototype.touchend = function () {
  this.deviceup()
}

OutilPointageCaptureNom.prototype.touchcancel = function () {
  this.deviceup()
}

OutilPointageCaptureNom.prototype.mouseup = function () {
  this.deviceup()
}
