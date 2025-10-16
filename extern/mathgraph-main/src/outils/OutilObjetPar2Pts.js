/*
 * Created by yvesb on 26/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPar2Pts from './OutilPar2Pts'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilObjetPar2Pts

/**
 * Outil servant à créer un objet graphique en cliquant sur deux points de la figure
 * Hérite de OutilPar2Pts
 * @param {MtgApp} app L'application propriétaire
 * @param toolName Le nom de l'outil
 * @param toolIndex L'index de l'outil dans la version Java
 * @param avecClig Boolean : true si l'outil utilise le clignotement
 * @constructor
 */
function OutilObjetPar2Pts (app, toolName, toolIndex, avecClig) {
  OutilPar2Pts.call(this, app, toolName, toolIndex, avecClig)
}

OutilObjetPar2Pts.prototype = new OutilPar2Pts()
OutilObjetPar2Pts.prototype.constructor = OutilObjetPar2Pts

/**
 * Fonction créant l'objet. Si bSave est à true, on enregistre la figure
 * @param {boolean} bSave
 * @returns {boolean} true si l'objet a pu être créé
 */
OutilObjetPar2Pts.prototype.creeObjet = function (bSave = true) {
  const app = this.app
  const ob = this.objet(this.point1, this.point2)
  app.ajouteElement(ob)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    ob.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement()
    if (bSave) {
      this.saveFig()
    }
    this.nbPtsCrees = 0
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilObjetPar2Pts.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const ob = this.objet(this.point1, app.mousePoint)
  app.ajouteObjetVisuel(ob)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}
