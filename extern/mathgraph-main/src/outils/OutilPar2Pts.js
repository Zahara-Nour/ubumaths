/*
 * Created by yvesb on 21/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Outil from './Outil'
export default OutilPar2Pts
/**
 * Outil ancêtre des outils servant à créer un objet par clic sur deux objets de la figure
 * L'objet créé peut être graphique ou non graphique
 * @param {MtgApp} app L'application propriétaire
 * @param toolName Le nom de l'outil
 * @param toolIndex L'index de l'outil dans la version Java
 * @param avecClig Boolean : true si l'outil utilise le clignotement
 * @param bReselectAfterCre true si on appelle reselect après creeObjet (utilisé pour CMesure Abscisse)
 * @constructor
 */
function OutilPar2Pts (app, toolName, toolIndex, avecClig, bReselectAfterCre) {
  Outil.call(this, app, toolName, toolIndex, avecClig)
  this.bReselectAfterCre = arguments.length > 4 ? bReselectAfterCre : true
}

OutilPar2Pts.prototype = new Outil()
OutilPar2Pts.prototype.constructor = OutilPar2Pts

OutilPar2Pts.prototype.nomsPointsIndisp = function () {
  return false
}

OutilPar2Pts.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point1 = null
  this.point2 = null
  this.point1Nomme = false
  this.point2Nomme = false
  this.objetCree = false
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  app.indication(this.indication(1), this.preIndication())
}

/**
 * Fonction renvoyant l'id de la chaîne de de caractères d'indication au niveau ind (1 ou 2)
 * @param ind
 * @returns {string}
 */
OutilPar2Pts.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'ind2Pt1'
    case 2 : return 'ind2Pt2'
  }
}

OutilPar2Pts.prototype.deselect = function () {
  Outil.prototype.deselect.call(this)
  const app = this.app
  if (this.nomsPointsIndisp() && !this.objetCree) {
    if ((this.point1 !== null) && this.point1Nomme) {
      this.point1.donneNom('')
      this.point1.updateName(app.svgFigure)
    }
    if ((this.point2 !== null) && this.point2Nomme) {
      this.point2.donneNom('')
      this.point2.updateName(app.svgFigure)
    }
  }
  this.point1 = null
  this.point2 = null
}

OutilPar2Pts.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  if (this.point1 === null) {
    this.point1 = elg
    this.app.indication(this.indication(2), this.preIndication())
    if (this.nomsPointsIndisp()) {
      if (this.point1.nom === '') {
        this.point1.donneNom(app.listePr.genereNomPourPoint())
        this.point1.nomMasque = false
        this.point1.updateName(app.svgFigure)
        this.point1Nomme = true
      }
    }
    this.ajouteObjetsVisuels()
    this.excluDeDesignation(this.point1)
    this.ajouteClignotementDe(this.point1)
    this.resetClignotement()
    // app.indication(chaineIndication(2)); A revoir mtgApp
  } else {
    // if (this.point2 == null) { // Modification car sur les périphériques mobiles au relachement du doigt on traite un objet proche du pointeur
    if ((this.point2 === null) && (elg !== this.point1)) {
      // Ajout version 5.0
      this.point2 = elg
      if (this.nomsPointsIndisp()) {
        if (this.point2.nom === '') {
          this.point2.donneNom(app.listePr.genereNomPourPoint())
          this.point2.nomMasque = false
          this.point2.updateName(app.svgFigure)
          this.point2Nomme = true
        }
      }
      this.ajouteClignotementDe(this.point2) // Ajout version 5.0
      this.objetCree = this.creeObjet()
      if (this.bReselectAfterCre) this.reselect()
    }
  }
}

OutilPar2Pts.prototype.isReadyForTouchEnd = function () {
  return this.point1 !== null
}

OutilPar2Pts.prototype.isWorking = function () {
  return this.point1 !== null
}

OutilPar2Pts.prototype.actionApresPoint2 = function () {}
