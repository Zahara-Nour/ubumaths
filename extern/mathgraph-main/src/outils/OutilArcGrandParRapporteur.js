/*
 * Created by yvesb on 14/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ConvDegRad, uniteAngleRadian } from '../kernel/kernel'
import CValeurAngle from '../objets/CValeurAngle'
import CGrandArcDeCercle from '../objets/CGrandArcDeCercle'
import OutilArcParRapporteur from '../outils/OutilArcParRapporteur'

export default OutilArcGrandParRapporteur

/**
 * Outil de création d'un grand arc de cercle par rapporteur
 * @param {MtgApp} app Application propriétaire
 * @param {string} toolName Le nom de l'outil
 * @param {number} toolIndex L'index de l'outil tel que dans la version Java
 * @constructor
 */
function OutilArcGrandParRapporteur (app, toolName, toolIndex) {
  if (arguments.length === 1) OutilArcParRapporteur.call(this, app, 'ArcGrandParRapporteur', 33037, true)
  else OutilArcParRapporteur.call(this, app, toolName, toolIndex)
}

OutilArcGrandParRapporteur.prototype = new OutilArcParRapporteur()

OutilArcGrandParRapporteur.prototype.ajouteArcVisuel = function (valang) {
  const app = this.app
  app.ajouteObjetVisuel(new CGrandArcDeCercle(app.listeVisuelle, null, false, app.getCouleur(), false, app.getStyleTrait(),
    this.point1, this.point2, null, valang))
}

OutilArcGrandParRapporteur.prototype.creeObjet = function () {
  const app = this.app
  const liste = app.listePr
  const svg = app.svgFigure
  let valeurAngle = this.ptMesureAngle.rendValeur()
  const indiceImpInitial = liste.longueur()

  // On arrondit au degré près en degrés
  // Modifié version 5.1.1
  // if (liste.uniteAngle == UniteAngle.Radian) valeurAngle = valeurAngle*CValeurAngle.convRadDeg;
  if (liste.uniteAngle === uniteAngleRadian) valeurAngle = valeurAngle * ConvDegRad
  // Modifié version 7.3 pour optimisation
  // if (valeurAngle !== Math.floor(valeurAngle)) valeurAngle = Math.floor(valeurAngle + 0.5)
  valeurAngle = Math.round(valeurAngle)
  if (valeurAngle === -180) valeurAngle = 180
  const valang = new CValeurAngle(liste, valeurAngle)
  const ptArc = new CGrandArcDeCercle(liste, null, false, app.getCouleur(), false, app.getStyleTrait(),
    this.point1, this.point2, null, valang)
  app.ajouteElement(ptArc)

  if (app.verifieDernierElement(1)) {
    this.saveFig()
    liste.afficheTout(indiceImpInitial, svg, true, app.doc.couleurFond)
  }
  this.deselect()
  this.select()
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilArcGrandParRapporteur.prototype.creationPointPossible = function () {
  return true
}

OutilArcGrandParRapporteur.prototype.isWorking = function () {
  return (this.point1 !== null) && (this.point2 !== null)
}

OutilArcGrandParRapporteur.prototype.isLineTool = function () {
  return true
}
