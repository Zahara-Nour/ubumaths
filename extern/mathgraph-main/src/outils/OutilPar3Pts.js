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
import NatObj from '../types/NatObj'

export default OutilPar3Pts

/**
 * Outil ancêtre des outils servant à créer un objet par clic sur trois objets de la figure
 * L'objet créé peut être graphique ou non graphique
 * @param {MtgApp} app L'application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {number} toolIndex L'index de l'outil dans la version Java
 * @param {boolean} avecClig Passer true si l'outil utilise le clignotement
 * @param {boolean} [bReactivation=true] true si on ractive l'outil après création de l'objet
 * @param {boolean} [baccept=false] Si true on accepte que le troisième point soit un des deux premiers
 * @constructor
 * @extends Outil
 */
function OutilPar3Pts (app, toolName, toolIndex, avecClig, bReactivation = true, baccept = false) {
  Outil.call(this, app, toolName, toolIndex, avecClig)
  this.bReactivation = Boolean(bReactivation)
  this.baccept = baccept
}

OutilPar3Pts.prototype = new Outil()
OutilPar3Pts.prototype.constructor = OutilPar3Pts

OutilPar3Pts.prototype.nomsPointsIndisp = function () {
  return false
}

// Sera redéfini seulement pour l'outil de mesure d'abscisse
OutilPar3Pts.prototype.actionApresPoint2 = function () {
}

OutilPar3Pts.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point1 = null
  this.point2 = null
  this.point3 = null
  this.point1Nomme = false
  this.point2Nomme = false
  this.point3Nomme = false
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
OutilPar3Pts.prototype.indication = function (ind) {
  switch (ind) {
    case 1 : return 'ind2Pt1'
    case 2 : return 'ind2Pt2'
    case 3 : return 'ind3Pt3'
  }
}

OutilPar3Pts.prototype.deselect = function () {
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
    if ((this.point3 !== null) && this.point3Nomme) {
      this.point3.donneNom('')
      this.point3.updateName(app.svgFigure)
    }
  }
  this.point1 = null
  this.point2 = null
  this.point3 = null
}

OutilPar3Pts.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  if (this.point1 === null) {
    // Ajout version 5.0
    this.point1 = elg
    app.indication(this.indication(2), this.preIndication())
    if (this.nomsPointsIndisp()) {
      if (this.point1.nom === '') {
        this.point1.donneNom(app.listePr.genereNomPourPoint(false))
        this.point1.updateName(app.svgFigure)
        this.point1Nomme = true
      }
    }
    this.excluDeDesignation(this.point1) // Ajout version 5.0
    this.ajouteClignotementDe(this.point1)
    this.resetClignotement()
  } else {
    if (this.point2 === null) {
      // Ajout version 5.0
      this.point2 = elg
      app.indication(this.indication(3), this.preIndication())
      if (this.nomsPointsIndisp()) {
        if (this.point2.nom === '') {
          this.point2.donneNom(app.listePr.genereNomPourPoint(false))
          this.point2.updateName(app.svgFigure)
          this.point2Nomme = true
        }
      }
      // Pour l'outil compas on accepte que lle troisième point soit un des deux premiers
      if (this.baccept) {
        this.app.listeExclusion.removeObj(this.point1)
      } else {
        this.excluDeDesignation(this.point2) // Ajout version 5.0
        this.resetClignotement()
      }
      this.ajouteClignotementDe(this.point2)
      this.ajouteObjetsVisuels()
      this.actionApresPoint2()
    } else {
      if (this.point3 === null) {
        this.point3 = elg
        if (this.nomsPointsIndisp()) {
          if (this.point3.nom === '') {
            this.point3.donneNom(app.listePr.genereNomPourPoint(false))
            this.point3.updateName(app.svgFigure)
            this.point3Nomme = true
          }
        }
        this.ajouteClignotementDe(this.point3) // Ajout version 5.0
        this.objetCree = this.creeObjet()
        // this.annuleClignotement();
        // this.deselect();
        // if (this.bReactivation) this.select();
        // else app.activeOutilCapt();
        if (this.bReactivation) this.reselect()
      }
    }
  }
}

OutilPar3Pts.prototype.isReadyForTouchEnd = function () {
  return this.point1 !== null && this.point2 !== null
}

OutilPar3Pts.prototype.isWorking = function () {
  return this.point1 !== null
}
