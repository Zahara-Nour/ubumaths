/*
 * Created by yvesb on 27/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPar3Pts from './OutilPar3Pts'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilObjetPar3Pts

/**
 *
 * Outil servant à créer un objet graphqie en cliquant sur trois points de la figure
 * Hérite de OutilPar3Pts
 * @param {MtgApp} app L'application propriétaire
 * @param toolName Le nom de l'outil
 * @param toolIndex L'index de l'outil dans la version Java
 * @param avecClig Boolean true si l'outil utilise le clignotement
 * @param {boolean} baccept Si true on accepte que le troisième point soit un des deux premiers
 * @constructor
 */
function OutilObjetPar3Pts (app, toolName, toolIndex, avecClig, baccept = false) {
  OutilPar3Pts.call(this, app, toolName, toolIndex, avecClig, true, baccept)
}

OutilObjetPar3Pts.prototype = new OutilPar3Pts()
OutilObjetPar3Pts.prototype.constructor = OutilObjetPar3Pts

/**
 * Fonction créant l'objet. Si bSave est à true, on enregistre la figure
 * @param {boolean} bSave
 * @returns {boolean} true si l'objet a pu être créé
 */
OutilObjetPar3Pts.prototype.creeObjet = function (bSave = true) {
  const app = this.app
  const ob = this.objet(this.point1, this.point2, this.point3)
  app.ajouteElement(ob)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    ob.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond)
    this.annuleClignotement()
    if (bSave) this.saveFig()
    this.nbPtsCrees = 0
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilObjetPar3Pts.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const ob = this.objet(this.point1, this.point2, app.mousePoint)
  app.ajouteObjetVisuel(ob)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}
