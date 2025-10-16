/*
 * Created by yvesb on 24/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Nat from '../types/Nat'
import Outil from './Outil'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilParDtPt
/**
 * Outil servant à créer un objet graphique en cliquant sur un poijt et uen droite de la figure
 * @param {MtgApp} app L'application propriétaire
 * @param {string} nomOutil Le nom de l'outil
 * @param {number} toolIndex L'index de l'outil dans la version Java
 * @param {boolean} avecClig true si l'outil utilise le clignotement
 * @constructor
 */
function OutilParDtPt (app, nomOutil, toolIndex, avecClig) {
  Outil.call(this, app, nomOutil, toolIndex, avecClig)
}

OutilParDtPt.prototype = new Outil()
OutilParDtPt.prototype.constructor = OutilParDtPt

OutilParDtPt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point1 = null
  this.droite1 = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = Nat.or(NatObj.NTtPoint, NatObj.NTteDroite)
  app.outilPointageActif.reset()
  app.indication(this.indication(1), this.preIndication())
}

OutilParDtPt.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  const app = this.app
  this.point1 = null
  this.droite1 = null
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = Nat.or(NatObj.NTtPoint, NatObj.NTteDroite)
  app.outilPointageActif.reset()
}

/**
 * Fonction renvoyant l'id de la chaîne de de caractères d'indication au niveau ind (1 ou 2)
 * @param ind
 * @returns {string}
 */
OutilParDtPt.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'indParDtePt1'
    case 2 : return 'indPt'
    case 3 : return 'indDte'
  }
}

// Corrigé version 6.6.2
OutilParDtPt.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if ((this.point1 === null) || (this.droite1 === null)) {
    if (elg.estDeNature(NatObj.NTtPoint)) {
      if (this.point1 === null) {
        this.point1 = elg
        if (this.droite1 !== null) {
          this.creeObjet()
          this.annuleClignotement()
        } else {
          this.resetClignotement()
          app.outilPointageCre.aDesigner = NatObj.NTteDroite
          this.excluDeDesignation(elg)
          this.ajouteClignotementDe(elg)
          app.indication(this.indication(3), this.preIndication())
        }
      }
    } else {
      if (this.droite1 === null) {
        this.droite1 = elg
        if (this.point1 !== null) {
          this.creeObjet()
          this.annuleClignotement()
        } else {
          app.indication(this.indication(2), this.preIndication())
          this.resetClignotement()
          app.outilPointageCre.aDesigner = NatObj.NTtPoint
          this.ajouteObjetsVisuels()
          this.excluDeDesignation(elg)
          this.ajouteClignotementDe(elg)
        }
      }
    }
  }
}

/**
 * Fonction créant l'objet. Si bSave est à true, on enregistre la figure
 * @param {boolean} bSave
 * @returns {boolean}
 */
OutilParDtPt.prototype.creeObjet = function (bSave = true) {
  const app = this.app
  const dte = this.objet(this.point1, this.droite1)
  app.ajouteElement(dte)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.annuleClignotement()
    dte.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.nbPtsCrees = 0
    if (bSave) {
      this.saveFig()
      this.reselect()
    }
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilParDtPt.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  app.ajouteObjetVisuel(this.objet(this.app.mousePoint, this.droite1))
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilParDtPt.prototype.isReadyForTouchEnd = function () {
  return this.point1 !== null || this.droite1 !== null
}

OutilParDtPt.prototype.isWorking = function () {
  return this.isReadyForTouchEnd()
}
