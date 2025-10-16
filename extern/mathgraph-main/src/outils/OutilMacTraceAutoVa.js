/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroTraceAutoParVariable from '../objets/CMacroTraceAutoParVariable'
import CSousListeObjets from '../objets/CSousListeObjets'
import MacTraceAutoVaDlg from '../dialogs/MacTraceAutoVaDlg'
import NatObj from '../types/NatObj'
import NatCal from '../types/NatCal'
import CAffLiePt from '../objets/CAffLiePt'

export default OutilMacTraceAutoVa

/**
 * Outil servant à créer une macro d'animation de point lié sans trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacTraceAutoVa (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacTraceAutoVa', 32952)
}

OutilMacTraceAutoVa.prototype = new OutilMac()

OutilMacTraceAutoVa.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacTraceAutoVa.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacTraceAutoVa.prototype.traiteObjetDesigne = function (elg, point) {
  const self = this
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    const mac = new CMacroTraceAutoParVariable(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', this.liste, null, 100, 0)
    this.mac = mac
    new MacTraceAutoVaDlg(app, this.mac, false,
      function () {
        app.outilPointageActif = app.outilPointageObjetClignotant
        app.outilPointageActif.aDesigner = NatObj.NTtObjPourLieu
        // On fait clignoter objets dépendant de la variable choisie
        self.resetClignotement()
        app.listeClignotante.ajouteObjetsParNatureDependantDe(list, NatObj.NTtObjPourLieu, mac.variableAssociee, false)
        app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
        app.indication('indAnimTr')
      },
      function () { app.activeOutilCapt() })
  } else {
    if (this.liste.longueur() === 0) this.app.showStopButton(true)
    this.liste.add(elg)
    this.excluDeDesignation(elg)
    this.enleveDeClign(elg)
  }
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacTraceAutoVa.prototype.actionFin = function () {
  this.creeObjet()
}

OutilMacTraceAutoVa.prototype.activationValide = function () {
  const list = this.app.listePr
  return (list.nombreObjetsCalcul(NatCal.NVariable) > 0)
}
