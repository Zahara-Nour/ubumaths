/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilMac from './OutilMac'
import CMacroBoucleAvecTrace from '../objets/CMacroBoucleAvecTrace'
import CAffLiePt from '../objets/CAffLiePt'
import NatObj from '../types/NatObj'
import CSousListeObjets from '../objets/CSousListeObjets'
import MacBoucDlg from '../dialogs/MacBoucDlg'

export default OutilMacBoucTr

/**
 * Outil servant à créer une macro affectant une valeur à une variable
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMacBoucTr (app) {
  if (arguments.length === 0) return
  OutilMac.call(this, app, 'MacBoucTr', 33033)
}

OutilMacBoucTr.prototype = new OutilMac()

OutilMacBoucTr.prototype.select = function () {
  this.liste = new CSousListeObjets()
  OutilMac.prototype.select.call(this)
}

OutilMacBoucTr.prototype.deselect = function () {
  OutilMac.prototype.deselect.call(this)
  this.app.showStopButton(false)
  this.liste = null
}

OutilMacBoucTr.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  if (this.mac === null) {
    this.addComClign(point)
    this.mac = new CMacroBoucleAvecTrace(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft,
      CAffLiePt.alignVerTop, '', '', null, 10, true, null, null, null)
    new MacBoucDlg(app, this.mac, false, function () {
      app.outilPointageActif = app.outilPointageCre
      app.outilPointageActif.aDesigner = NatObj.NTtObjPourLieu
      app.outilPointageActif.reset()
      app.indication('indAnimTr')
    },
    function () { app.activeOutilCapt() })
  } else {
    if (this.liste.longueur() === 0) this.app.showStopButton(true)
    this.liste.add(elg)
    this.ajouteClignotementDe(elg)
  }
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilMacBoucTr.prototype.actionFin = function () {
  this.mac.listeAssociee = this.liste
  this.creeObjet()
}
