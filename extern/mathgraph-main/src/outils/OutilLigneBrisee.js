/*
 * Created by yvesb on 25/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import OutilPolygone from '../outils/OutilPolygone'
import CLigneBrisee from '../objets/CLigneBrisee'
import CNoeudPointeurSurPoint from '../objets/CNoeudPointeurSurPoint'
import CSegment from '../objets/CSegment'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilLigneBrisee

/**
 * Outil servant à créer un polygone
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilLigneBrisee (app) {
  Outil.call(this, app, 'LigneBrisee', 33056, true)
}

OutilLigneBrisee.prototype = new Outil()

OutilLigneBrisee.prototype.select = function () {
  OutilPolygone.prototype.select.call(this)
}

OutilLigneBrisee.prototype.deselect = function () {
  OutilPolygone.prototype.deselect.call(this)
}

OutilLigneBrisee.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  const ln = this.listeNoeuds
  this.ajouteClignotementDe(elg)
  if (ln.length === 2) app.showStopButton(true)
  if (ln.length === 0) {
    ln.push(new CNoeudPointeurSurPoint(list, elg))
    this.ajouteObjetsVisuels()
    this.excluDeDesignation(elg)
  } else
    if (elg === ln[0].pointeurSurPoint) {
      if (ln.length <= 2) {
        this.deselect()
        const self = this
        new AvertDlg(app, 'ch42', function () {
          self.select()
        })
      } else {
        app.listeExclusion.retireTout()
        this.excluDeDesignation(elg)
        ln.push(new CNoeudPointeurSurPoint(list, elg))
        this.ajouteObjetsVisuels()
      }
    } else {
      app.listeExclusion.retireTout()
      this.excluDeDesignation(elg)
      ln.push(new CNoeudPointeurSurPoint(list, elg))
      this.ajouteObjetsVisuels()
    }
}

OutilLigneBrisee.prototype.creeObjet = function () {
  const app = this.app
  const ln = this.listeNoeuds
  const listeNoeudsClone = []
  for (let i = 0; i < ln.length; i++) listeNoeudsClone.push(ln[i].getClone(app.listePr, app.listePr))
  const ligne = new CLigneBrisee(app.listePr, null, false, app.getCouleur(), false, app.getStyleTrait(), listeNoeudsClone)
  app.ajouteElement(ligne)
  if (app.verifieDernierElement(1)) {
    this.annuleClignotement()
    ligne.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
    this.nbPtsCrees = 0
  } else {
    new AvertDlg(app, 'DejaCree')
  }
  this.deselect()
  this.select()
}

OutilLigneBrisee.prototype.actionFin = function () {
  this.creeObjet()
}

OutilLigneBrisee.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const coul = app.getCouleur()
  const styleTrait = app.getStyleTrait()
  const ln = this.listeNoeuds
  const dernierPoint = ln[ln.length - 1].pointeurSurPoint
  if (ln.length >= 2) {
    // Le deuxième point du dernier segment des objets visuels est maintenant le dernier point cliqé
    list.get(list.longueur() - 1).point2 = dernierPoint
  }
  // On crée un segment joignant le dernier point entré au point souris
  const inddeb = list.longueur() // Ajout version 6.4.4
  app.ajouteObjetVisuel(new CSegment(list, null, false, coul, false, styleTrait, dernierPoint, app.mousePoint))
  app.afficheObjetVisuels(inddeb) // Ajout version 6.4.4
}

OutilLigneBrisee.prototype.isReadyForTouchEnd = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilLigneBrisee.prototype.creationPointPossible = function () {
  return true
}

OutilLigneBrisee.prototype.indication = function () {
  return 'indCrLigne'
}

OutilLigneBrisee.prototype.preIndication = function () {
  return 'LigneBrisee'
}

OutilLigneBrisee.prototype.isLineTool = function () {
  return true
}
