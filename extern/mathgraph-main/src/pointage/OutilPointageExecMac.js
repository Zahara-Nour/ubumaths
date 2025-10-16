/*
 * Created by yvesb on 11/02/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import { mousePosition, touchPosition } from '../kernel/kernelAdd'
import OutilPointage from './OutilPointage'

export default OutilPointageExecMac

/**
 * Outil de pointage servant exécuter des macros. Utilisé par OutilExecutionMacro
 * Hérite de OutilPointage
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageExecMac (app) {
  OutilPointage.call(this, app)
  this.objetDesigne = null // Sera l'objet transmis à l'outil après d'éventuelles boîtes de dialogue de choix
}
OutilPointageExecMac.prototype = new OutilPointage()

OutilPointageExecMac.prototype.mousemove = function (evt) {
  this.devicemove(evt, 'mouse', mousePosition)
}
OutilPointageExecMac.prototype.touchmove = function (evt) {
  this.devicemove(evt, 'touch', touchPosition)
}

OutilPointageExecMac.prototype.devicemove = function (evt, type, fonc) {
  const app = this.app
  const doc = app.doc
  const svg = app.svgFigure
  // Pour les devicemove on supprime les lignes suivantes car sur PC avec écran tactile et stylet
  // on peut avoir un mix des deux types d'événements
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if (app.pref_PointsAuto && (type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  const point = fonc(svg, evt, app.zoomFactor)
  const nbObjetsProches = doc.listePr.procheDe(NatObj.NMacro,
    point, app.infoProx, app.listeExclusion, false, type)
  app.outilExecutionMacro.cursor = (nbObjetsProches > 0) ? 'default' : 'crosshair'
}

OutilPointageExecMac.prototype.mousedown = function (evt) {
  this.devicedown(evt, 'mouse', mousePosition)
}

// Lignes ci-dessous supprimées versions 9.3.8 car sur tablette si on faisait un touch sur une macro
// pour la lancer elle s'arrêtait tout de suite car tout se passait comme si on faisait un deuxième clic
// immédiatement après le premier
// Sur tablette un touch sur le bouton lance un événement mousedown
/*
OutilPointageExecMac.prototype.touchstart = function (evt) {
  this.devicedown(evt, 'touch', touchPosition)
}
 */

OutilPointageExecMac.prototype.devicedown = function (evt, type, fonc) {
  let mac
  const app = this.app
  const liste = app.listePr
  const svg = app.svgFigure
  const doc = app.doc
  const dimf = app.dimf
  const couleurFond = doc.couleurFond
  // Sur les périphériques mobiles il peut y avoir deux événements générés quand on touche l'écran : onmousedown et ontouchstart
  // if (doc.type && (doc.type != type)) return;
  if ((type === 'mouse') && (doc.type === 'touch')) return
  doc.type = type
  if (liste.macroEnCours !== null) {
    mac = liste.macroEnCours.macroEnCours()
    if ((mac.className === 'CMacroPause') && (mac.dureePause === 0)) {
      mac.passageMacroSuiv(svg, dimf, couleurFond)
      return
    }
    if ((mac !== null) && (mac.className === 'CMacroApparition') && mac.executionPossible()) {
      mac.execute(svg, dimf, couleurFond, true)
      // Attention mac ne pointe plus forcément sur la macro en cours
      if ((liste.macroEnCours !== null) && !liste.macroEnCours.macroEnCours().executionEnCours) { liste.macroEnCours.passageMacroSuiv(svg, dimf, couleurFond) }
      return
    }
  }
  const point = fonc(svg, evt, app.zoomFactor)
  const info = app.infoProx.getClone()
  const nbObjetsProches = liste.procheDe(NatObj.NMacro,
    point, info, app.listeExclusion, false, type)
  if (nbObjetsProches > 0) {
    mac = info.infoParType[NatObj.indiceMacro].premierVoisin
    if (mac.executionEnCours) {
      mac.macroEnCours().termineAction(svg, dimf, couleurFond)
    } else {
      if (liste.macroEnCours !== null) return
      if (mac.executionPossible()) { // Ajout version 4.8
        liste.macroEnCours = mac
        mac.setMacroLanceuse(null)
        mac.initialise()
        mac.execute(svg, dimf, couleurFond, true)
        app.outilExecutionMacro.saveFig()
      }
    }
  } else {
    if (liste.macroEnCours !== null) {
      if (liste.macroEnCours.className === 'CMacroSuiteMacros') {
        mac = liste.macroEnCours.macroEnCours()
        if (mac.arretParClic()) {
          mac.termineAction(svg, dimf, couleurFond)
          liste.macroEnCours.passageMacroSuiv(svg, dimf, couleurFond)
        }
        // passageMacroSuiv redonne éventuellement un ordre paint() suivant la nature de la macro suivante
      } else {
        // Si la macro en cours est une macro d'apparition avec clic pour objet suivant
        // on ne la désactive que si on est au dernier objet
        mac = liste.macroEnCours.macroEnCours()
        if ((mac.className === 'CMacroApparition') && mac.executionEnCours) {
          // mac.actionDansPaint(cadre);
          // cadre.paneFigure.repaint();
          this.liste.update(svg, couleurFond)
        } else {
          if (mac.arretParClic()) {
            mac.termineAction(svg, dimf, couleurFond)
          }
        }
      }
    }
  }
}
