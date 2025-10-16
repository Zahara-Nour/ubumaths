/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CSousListeObjets from '../objets/CSousListeObjets'
import NatObj from '../types/NatObj'
import CAffLiePt from '../objets/CAffLiePt'
import MacAnimParVarDlg from 'src/dialogs/MacAnimParVarDlg'
import CMacroAnimAvecTraceParVar from 'src/objets/CMacroAnimAvecTraceParVar'

export default OutilMacAnimParVarTr

/**
 * Outil servant à créer une macro d'animation de point lié sans trace
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacAnimParVarTr (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacAnimParVarTr', 32953)
}

OutilMacAnimParVarTr.prototype = new OutilMac()

OutilMacAnimParVarTr.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacAnimParVarTr.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacAnimParVarTr.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  const self = this
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroAnimAvecTraceParVar(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', this.liste, null, false, true, true, 10, 100, 0, true, false)
    new MacAnimParVarDlg(app, true, this.mac, false,
      function () {
        self.annuleClignotement()
        self.ajouteClignotementDe(self.comClig)
        app.outilPointageActif = app.outilPointageObjetClignotant
        app.outilPointageActif.aDesigner = NatObj.NTtObjPourLieu
        self.resetClignotement()
        // On fait clignoter objets dépendant du point lié cliqué
        app.listeClignotante.ajouteObjetsParNatureDependantDe(list, NatObj.NTtObjPourLieu, self.mac.variableAssociee, false)
        app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
        app.indication('indAnimTr')
      },
      function () {
        app.activeOutilCapt()
      })
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
OutilMacAnimParVarTr.prototype.actionFin = function () {
  this.creeObjet()
}
