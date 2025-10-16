/*
 * Created by yvesb on 25/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Color from '../types/Color'
import StyleTrait from '../types/StyleTrait'
import CDroitePerpendiculaire from '../objets/CDroitePerpendiculaire'
import CMarqueAngleDroit from '../objets/CMarqueAngleDroit'
import OutilParDtPt from './OutilParDtPt'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'
export default OutilDtPer
/**
 * Outil servant à créer 'une droite perpendiculaire
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtPer (app) {
  OutilParDtPt.call(this, app, 'DtPer', 32786, true)
}

OutilDtPer.prototype = new OutilParDtPt()

OutilDtPer.prototype.objet = function (pt, dt) {
  const app = this.app
  return new CDroitePerpendiculaire(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt, dt)
}

OutilDtPer.prototype.creeObjet = function () {
  const app = this.app
  const pasDejaCree = OutilParDtPt.prototype.creeObjet.call(this, !app.autoComplete)
  if (!pasDejaCree) return false
  if (!app.autoComplete) return true
  const coul = app.getCouleur()
  const coulRemp = new Color(coul.red, coul.green, coul.blue, defaultSurfOpacity)

  // Si app.autoComplete est à true et si la perpendiculaire n'a pas été déjà créé, on rajoute une marque
  // d'angle perpendiculaire
  const list = app.listePr
  const len = list.longueur()
  const perp = list.get(len - 1) // a été rajouté à liste par OutilParDtPt.prototype.creeObjet
  // En mode autoComplete on rajoute une marque d'angle droit
  const mad = new CMarqueAngleDroit(list, null, false, coulRemp, false,
    StyleTrait.stfc(list), app.getStyleMarqueAngle(), 13, perp)
  list.add(mad)
  mad.positionneEtCreeAffichage(false, app.dimf, app.svgFigure, app.doc.couleurFond)
  this.saveFig()
  this.reselect()
  return true
}

OutilDtPer.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const dp = this.objet(this.app.mousePoint, this.droite1)
  app.ajouteObjetVisuel(dp)
  const coul = app.getCouleur()
  const coulRemp = app.autoComplete ? new Color(coul.red, coul.green, coul.blue, defaultSurfOpacity) : Color.black
  const styleMarqueAngle = app.autoComplete ? app.getStyleMarqueAngle() : StyleMarqueAngle.marqueSimple
  const mad = new CMarqueAngleDroit(list, null, false, coulRemp, false,
    StyleTrait.stfc(list), styleMarqueAngle, 13, dp)
  app.ajouteObjetVisuel(mad)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtPer.prototype.creationPointPossible = function () {
  return true
}

OutilDtPer.prototype.preIndication = function () {
  return 'DtPer'
}

OutilDtPer.prototype.isLineTool = function () {
  return true
}

// Si on est en mode complétion automatique on met aussi les styles de marques
// d'angle dans la palette de droite quand cet outil est activé (pour la marque d'angle droit)
OutilDtPer.prototype.isAngleTool = function () {
  return this.app.autoComplete
}
