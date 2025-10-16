/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import CListeObjets from '../objets/CListeObjets'
import AddSupObjMacDlg from '../dialogs/AddSupObjMacDlg'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilAddObjMac

/**
 * Outil servant à majouter des objets à une macro gérant une liste d'objets
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilAddObjMac (app) {
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'AddObjMac', 32993, true, false, false, false)
}

OutilAddObjMac.prototype = new Outil()

OutilAddObjMac.prototype.select = function () {
  const app = this.app
  const self = this
  Outil.prototype.select.call(this)
  this.buttonStop = false
  this.listAdd = new CListeObjets() // Contiendra la liste des objets à rajouter
  this.list = null
  new AddSupObjMacDlg(app, false, 'AddObjMac', function (mac) {
    self.macro = mac // La macro à modifier
    app.outilPointageActif = app.outilPointageCre
    app.outilPointageCre.aDesigner = NatObj.NTtObj
    // On crée une liste formée des objets de la liste de la macro et qui sont masqués de façon
    // à pouvoir les démasquer et les faire clignoter
    self.list = new CListeObjets()
    const listAssociee = mac.listeAssociee
    for (const el of listAssociee.col) {
      self.excluDeDesignation(el)
      self.ajouteClignotementDe(el)
      if (el.masque) {
        self.list.add(el)
        el.montre()
      }
    }
    self.excluDeDesignation(mac) // On ne doit pas désigner la macro elle-même
    self.resetClignotement()
    app.indication('indAdObj')
  })
}

OutilAddObjMac.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (elg.index > this.macro.index) {
    new AvertDlg(this.app, 'AdImp')
    return
  }
  if (!this.buttonStop) {
    this.buttonStop = true
    app.showStopButton(true)
  }
  this.listAdd.add(elg)
  this.excluDeDesignation(elg)
  this.ajouteClignotementDe(elg)
}

OutilAddObjMac.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  const app = this.app
  app.showStopButton(false)
  if (this.list !== null) {
    this.list.montreTout(false) // On cache à nouveau les objets de la macro qui  étaient cachés
    this.list.retireTout()
    app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  }
}

OutilAddObjMac.prototype.actionFin = function () {
  this.macro.listeAssociee.ajouteElementsDe(this.listAdd)
  this.app.activeOutilCapt()
}

OutilAddObjMac.prototype.activationValide = function () {
  return this.app.listePr.listeMacrosAvecListeModif(false).noms.length > 0
}
