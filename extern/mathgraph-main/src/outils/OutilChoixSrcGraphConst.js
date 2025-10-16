/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import NatObj from '../types/NatObjAdd'
import CListeObjets from '../objets/CListeObjets'
export default OutilChoixSrcGraphConst

/**
 * Outil servant à cliquer sur des objets pour les rajouter à al liste des objets sources choisis pour une construction
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilChoixSrcGraphConst (app) {
  // Attention : Pour cet outil le troisième pramètre est "CreationConst" pour que l'icône de app.outilGestionConst soit
  // désactivée quand on désactive l'outil (cet outil n'a pas d'icône)
  // Dernier paramètre à false car pas d'icône associée
  Outil.call(this, app, 'CreationConst', -1, true, false, false, false)
}

OutilChoixSrcGraphConst.prototype = new Outil()

OutilChoixSrcGraphConst.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  this.listObj = new CListeObjets()
  this.excluDesignationObjDepObjSrc() // pour ne pas désigner des objets dépendants des objest sources déjà choisis
  app.outilPointageActif = app.outilPointageCre
  app.listeClignotante.ajouteElementsDe(app.listeSrcG)
  app.outilPointageActif.aDesigner = NatObj.NObjGraphPourSourcesProto
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indSrcGr')
  app.showStopButton(true)
}

OutilChoixSrcGraphConst.prototype.deselect = function () {
  this.app.showStopButton(false)
  Outil.prototype.deselect.call(this)
}

OutilChoixSrcGraphConst.prototype.traiteObjetDesigne = function (elg) {
  this.excluDesignationObjDepDe(elg)
  this.ajouteClignotementDe(elg)
  this.listObj.add(elg)
}

/**
 * Fonction appelée quand on appuyé sur le bouton STOP
 */
OutilChoixSrcGraphConst.prototype.actionFin = function () {
  this.app.listeSrcG.ajouteElementsDe(this.listObj)
  this.listObj.retireTout()
  this.listObj = null
  this.app.activeOutilCapt()
}
