/*
 * Created by yvesb on 18/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilObjetPar3Objets
/**
 * Outil ancêtre des outils servant à créer un objet en cliquant deux objets
 * Les descendants doivent forunir une foncion creeObjet(ob1,ob2)
 * @param {MtgApp} app L'application propriétaire
 * @param toolName Le nom de l'outil
 * @param toolIndex L'index de l'outil dans la version Java
 * @param avecClig Boolean : true si l'outil utilise le clignotement
 * @param nat1 La nature du premier objet il faut cliquer
 * @param nat2 La nature du deuième objet il faut cliquer
 * @param nat3 La nature du troisième objet il faut cliquer
 * @constructor
 * @extends Outil
 */
function OutilObjetPar3Objets (app, toolName, toolIndex, avecClig, nat1, nat2, nat3) {
  Outil.call(this, app, toolName, toolIndex, avecClig)
  this.nat1 = nat1
  this.nat2 = nat2
  this.nat3 = nat3
}

OutilObjetPar3Objets.prototype = new Outil()
OutilObjetPar3Objets.prototype.constructor = OutilObjetPar3Objets

OutilObjetPar3Objets.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.ob1 = null
  this.ob2 = null
  const app = this.app
  app.outilPointageActif = this.app.outilPointageCre
  app.outilPointageActif.aDesigner = this.nat1
  app.outilPointageActif.reset()
  app.indication(this.indication(1), this.preIndication())
}

OutilObjetPar3Objets.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (this.ob1 === null) {
    this.ob1 = elg
    this.ajouteClignotementDe(elg)
    this.excluDeDesignation(elg)
    this.resetClignotement()
    app.outilPointageActif.aDesigner = this.nat2
    app.indication(this.indication(2), this.preIndication())
  } else {
    if (this.ob2 === null) {
      this.ob2 = elg
      this.ajouteClignotementDe(elg)
      this.excluDeDesignation(elg)
      this.ajouteObjetsVisuels()
      app.outilPointageActif.aDesigner = this.nat3
      app.indication(this.indication(3), this.preIndication())
    } else {
      this.ob3 = elg
      this.annuleClignotement()
      this.creeObjet()
      this.deselect()
      this.select()
    }
  }
}

OutilObjetPar3Objets.prototype.creeObjet = function () {
  const app = this.app
  const ob = this.objet(this.ob1, this.ob2, this.ob3)
  app.ajouteElement(ob)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    ob.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilObjetPar3Objets.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const ob = this.objet(this.ob1, this.ob2, app.mousePoint)
  app.ajouteObjetVisuel(ob)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilObjetPar3Objets.prototype.isReadyForTouchEnd = function () {
  return false
}
