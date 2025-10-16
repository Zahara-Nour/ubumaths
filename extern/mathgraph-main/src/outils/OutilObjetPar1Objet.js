/*
 * Created by yvesb on 27/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilObjetPar1Objet
/**
 * Outil ancêtre des outils servant à créer un objet en cliquant sur un seul objet
 * @param {MtgApp} app L'application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {number} toolIndex L'index de l'outil dans la version Java
 * @param avecClig Boolean : true si l'outil utilise le clignotement
 * @param {Nat} nat  La nature des objets sur lesquels il faut cliquer
 * @param {boolean} bReselect  true si l'outil est réactivé aorès création de l'objet
 * @param {boolean} hasIcon true par défaut. A mettre à false si l'outil n'a pas d'icône associée.
 * @constructor
 */
function OutilObjetPar1Objet (app, toolName, toolIndex, avecClig, nat,
  bReselect = true, hasIcon = true) {
  Outil.call(this, app, toolName, toolIndex, avecClig, true, false, hasIcon)
  this.nat = nat
  this.bReselect = bReselect
}

OutilObjetPar1Objet.prototype = new Outil()
OutilObjetPar1Objet.prototype.constructor = OutilObjetPar1Objet

OutilObjetPar1Objet.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = this.nat
  app.outilPointageActif.reset()
  if (app.doc.type !== 'touch') this.ajouteObjetsVisuels()
  app.indication(this.indication(), this.preIndication())
}

OutilObjetPar1Objet.prototype.traiteObjetDesigne = function (elg) {
  this.creeObjet(elg)
  if (this.bReselect) this.reselect()
  else this.app.activeOutilCapt()
}

OutilObjetPar1Objet.prototype.creeObjet = function (elg) {
  const app = this.app
  const ob = this.objet(elg)
  app.ajouteElement(ob)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    ob.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
    this.nbPtsCrees = 0
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilObjetPar1Objet.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const ob = this.objet(app.mousePoint)
  app.ajouteObjetVisuel(ob)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilObjetPar1Objet.prototype.isReadyForTouchEnd = function () {
  return false
}
