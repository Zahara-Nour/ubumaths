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
import CPolygone from '../objets/CPolygone'
import CNoeudPointeurSurPoint from '../objets/CNoeudPointeurSurPoint'
import NatObj from '../types/NatObj'
import CSurfacePolygone from '../objets/CSurfacePolygone'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilPolygone

/**
 * Outil servant à créer un polygone
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPolygone (app) {
  Outil.call(this, app, 'Polygone', 32864, true)
}

OutilPolygone.prototype = new Outil()

OutilPolygone.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.listeNoeuds = []
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NTtPoint
  app.outilPointageCre.reset()
  app.indication(this.indication(), this.preIndication())
}

OutilPolygone.prototype.deselect = function () {
  this.listeNoeuds.length = 0
  Outil.prototype.deselect.call(this)
  this.app.showStopButton(false)
}

OutilPolygone.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  const ln = this.listeNoeuds
  ln.push(new CNoeudPointeurSurPoint(list, elg))
  this.ajouteClignotementDe(elg)
  if (ln.length === 3) app.showStopButton(true)
  if (ln.length === 1) {
    this.ajouteObjetsVisuels()
    this.resetClignotement()
    // frame.indication(getStr("polygone2"));
  } else {
    if (elg === ln[0].pointeurSurPoint) {
      if (ln.length <= 3) {
        this.deselect()
        const self = this
        new AvertDlg(app, 'ch41', function () {
          self.select()
        })
      } else this.creeObjet()
    } else {
      app.listeExclusion.retireTout()
      this.excluDeDesignation(elg)
      this.ajouteObjetsVisuels()
      this.resetClignotement()
    }
  }
}

OutilPolygone.prototype.creeObjet = function () {
  const app = this.app
  const ln = this.listeNoeuds
  const doc = app.doc
  const listePr = app.listePr
  const coul = app.getCouleur()
  const coulFond = doc.couleurFond
  const listeNoeudsClone = []
  for (let i = 0; i < ln.length; i++) listeNoeudsClone.push(ln[i].getClone(app.listePr, app.listePr))
  const poly = new CPolygone(listePr, null, false, coul, false, app.getStyleTrait(), listeNoeudsClone)
  app.ajouteElement(poly)
  if (app.verifieDernierElement(1)) {
    this.annuleClignotement()
    poly.creeAffichage(app.svgFigure, false, coulFond)
    // Spécial pour les exercices de construction, on crée une surface remplissant le polygone
    if (app.estExercice) {
      coul.opacity = 0.2 // Car l'opacité est à 1 par défaut pour la création de polygone
      const surf = new CSurfacePolygone(listePr, null, false, coul, false, app.getStyleRemplissage(), poly)
      app.ajouteElement(surf)
      surf.creeAffichage(app.svgFigure, false, coulFond)
    }
    this.saveFig()
    this.nbPtsCrees = 0
  } else new AvertDlg(app, 'DejaCree')
  this.reselect()
}

OutilPolygone.prototype.actionFin = function () {
  this.listeNoeuds.push(new CNoeudPointeurSurPoint(this.app.listePr, this.listeNoeuds[0].pointeurSurPoint))
  this.creeObjet()
}

OutilPolygone.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const coul = app.getCouleur()
  const listePr = app.listePr
  const ln = this.listeNoeuds
  app.supprimeObjetsVisuels()
  const listeNoeudsClone = []
  for (let i = 0; i < ln.length; i++) listeNoeudsClone.push(ln[i].getClone(listePr, listePr))
  listeNoeudsClone.push(new CNoeudPointeurSurPoint(app.listePr, app.mousePoint))
  listeNoeudsClone.push(ln[0].getClone(app.listePr, app.listePr))
  const poly = new CPolygone(listePr, null, false, coul, false, app.getStyleTrait(), listeNoeudsClone)
  app.ajouteObjetVisuel(poly)
  if (app.estExercice) {
    coul.opacity = 0.2
    const surf = new CSurfacePolygone(listePr, null, false, coul, false, app.getStyleRemplissage(), poly)
    app.ajouteObjetVisuel(surf)
  }
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilPolygone.prototype.isReadyForTouchEnd = function () {
  return false
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilPolygone.prototype.creationPointPossible = function () {
  return true
}

OutilPolygone.prototype.indication = function () {
  return 'indCrPoly'
}

OutilPolygone.prototype.preIndication = function () {
  return 'Polygone'
}

OutilPolygone.prototype.isLineTool = function () {
  return true
}
