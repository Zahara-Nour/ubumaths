/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObj'
import CListeObjets from '../objets/CListeObjets'
import CSousListeObjets from '../objets/CSousListeObjets'
import AddSupObjMacDlg from '../dialogs/AddSupObjMacDlg'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilSupObjMac

/**
 * Outil servant à majouter des objets à une macro gérant une liste d'objets
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilSupObjMac (app) {
  // Dernier paramètre à false car cet outil n'a pas d'icône associée
  Outil.call(this, app, 'SupObjMac', 32994, true, false, false, false)
}

OutilSupObjMac.prototype = new Outil()

OutilSupObjMac.prototype.select = function () {
  const app = this.app
  const self = this
  Outil.prototype.select.call(this)
  this.buttonStop = false
  this.listAdd = new CListeObjets() // Contiendra la liste des objets à retirer
  this.list = null
  new AddSupObjMacDlg(app, true, 'AddObjMac', function (mac) {
    self.macro = mac // La macro à modifier
    app.outilPointageActif = app.outilPointageObjetClignotant
    app.outilPointageActif.aDesigner = NatObj.NTtObj
    // On crée une liste formée des objets de la liste de la macro et qui sont masqués de façon
    // à pouvoir les démasquer et les faire clignoter
    self.list = new CListeObjets()
    const listAssociee = mac.listeAssociee
    for (const el of listAssociee.col) {
      self.ajouteClignotementDe(el)
      if (el.masque) {
        self.list.add(el)
        el.montre()
      }
    }
    self.resetClignotement()
    app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour qu'on puisse désigner l'objet quand il est masqué par le clignotement
    app.indication('indSupObj')
  })
}

OutilSupObjMac.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (this.macro.listeAssociee.longueur() - this.listAdd.longueur() === 1) {
    new AvertDlg(this.app, 'SupImp')
    return
  }
  if (!this.buttonStop) {
    this.buttonStop = true
    app.showStopButton(true)
  }
  this.listAdd.add(elg)
  this.excluDeDesignation(elg)
  this.enleveDeClign(elg)
}

OutilSupObjMac.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  const app = this.app
  app.showStopButton(false)
  if (this.list !== null) {
    this.list.montreTout(false) // On cache à nouveau les objets de la macro qui  étaient cachés
    this.list.retireTout()
    app.listePr.update(app.svgFigure, app.doc.couleurFond, true) // true pour que les objets masqués soient masqués
  }
}

OutilSupObjMac.prototype.actionFin = function () {
  const listeAssociee = this.macro.listeAssociee
  const list = new CSousListeObjets()
  for (const el of listeAssociee.col) {
    if (!this.listAdd.contains(el)) list.add(el)
  }
  this.macro.listeAssociee = list
  this.app.activeOutilCapt()
  // On met à jour les dépendances
  this.app.listePr.initialiseDependances()
}

OutilSupObjMac.prototype.activationValide = function () {
  return this.app.listePr.listeMacrosAvecListeModif(true).noms.length > 0
}
