/*
 * Created by yvesb on 30/04/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
export default OutilAnimation
/**
 * Outil servant animer un point lié de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilAnimation (app) {
  Outil.call(this, app, 'Animation', 32896, true)
}
OutilAnimation.prototype = new Outil()

OutilAnimation.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  app.macroAnimation.pointLieAssocie = null
  // this.obj = null;
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  // On fait clignoter les points mobiles libres
  app.listeClignotante.ajoutePointsLiesNonPun(app.listePr)
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  // même lorsqu'il est phase de masquage
  this.resetClignotement()
  app.indication('indAnim')
}

OutilAnimation.prototype.deselect = function () {
  const app = this.app
  const doc = app.doc
  const macroAnimation = app.macroAnimation
  macroAnimation.termineAction(app.svgFigure, app.dimf, doc.couleurFond, false)
  Outil.prototype.deselect.call(this)
}

OutilAnimation.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const doc = app.doc
  const list = app.listePr
  const macroAnimation = app.macroAnimation
  macroAnimation.resetTimer()
  app.cacheDesignation()
  this.annuleClignotement()
  // Ligne suivante nécessaire car une lors d'une annulation d'action la liste a été rechargée
  macroAnimation.listeProprietaire = list
  // macroAnimation.nombrePointsPourAnimation = frame.pref_moveNbPoints;
  // macroAnimation.frequenceAnimationMacro = frame.pref_moveFreq;
  // macroAnimation.animationCyclique = frame.pref_moveCyclic;
  macroAnimation.pointLieAssocie = elg // elg est le point lié à animer
  macroAnimation.metAJour()
  list.macroEnCours = macroAnimation
  macroAnimation.execute(app.svgFigure, app.dimf, doc.couleurFond)
  app.outilPointageActif = app.outilPointageExecMac
}
