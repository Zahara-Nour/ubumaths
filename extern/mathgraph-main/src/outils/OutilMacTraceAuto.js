/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroTraceAuto from '../objets/CMacroTraceAuto'
import CSousListeObjets from '../objets/CSousListeObjets'
import MacTraceAutoDlg from '../dialogs/MacTraceAutoDlg'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacTraceAuto

/**
 * Outil servant à créer une macro d'animation de point lié sans trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacTraceAuto (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacTraceAuto', 32951)
}

OutilMacTraceAuto.prototype = new OutilMac()

OutilMacTraceAuto.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacTraceAuto.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacTraceAuto.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroTraceAuto(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', this.liste, null, 100, 0)
    new MacTraceAutoDlg(app, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageObjetClignotant
        app.outilPointageActif.aDesigner = NatObj.NPointLie
        app.listeClignotante.ajoutePointsLiesNonPun(list)
        app.outilPointageActif.reset(false, true)
        app.indication('indTrAuto')
      },
      function () { app.activeOutilCapt() })
  } else {
    const mac = this.mac
    if (mac.pointLieAssocie === null) {
      this.annuleClignotement()
      this.ajouteClignotementDe(this.comClig)
      // Le point lié associé va être rajouté ci-dessous
      mac.pointLieAssocie = elg
      app.outilPointageActif = app.outilPointageObjetClignotant
      app.outilPointageActif.aDesigner = NatObj.NTtObjPourLieu
      this.resetClignotement()

      // On fait clignoter objets dépendant du point lié cliqué
      app.listeClignotante.ajouteObjetsParNatureDependantDe(list, NatObj.NTtObjPourLieu, mac.pointLieAssocie, false)
      app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
      app.indication('indAnimTr')
    } else {
      if (this.liste.longueur() === 0) this.app.showStopButton(true)
      this.liste.add(elg)
      this.excluDeDesignation(elg)
      this.enleveDeClign(elg)
    }
  }
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacTraceAuto.prototype.actionFin = function () {
  this.creeObjet()
}
