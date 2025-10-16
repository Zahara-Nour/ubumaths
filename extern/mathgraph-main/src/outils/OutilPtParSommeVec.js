/*
 * Created by yvesb on 06/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import CPointParSommeVect from '../objets/CPointParSommeVect'
import NatObj from '../types/NatObj'
import CVecteur from '../objets/CVecteur'
import CTransParVect from '../objets/CTransParVect'
import CPointImage from '../objets/CPointImage'
import StyleTrait from '../types/StyleTrait'
import StyleFleche from '../types/StyleFleche'
import Color from '../types/Color'
import AvertDlg from '../dialogs/AvertDlg'

export default OutilPtParSommeVec

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilPtParSommeVec (app) {
  Outil.call(this, app, 'PtParSommeVec', 32890)
}

OutilPtParSommeVec.prototype = new Outil()

OutilPtParSommeVec.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.vect1 = null // Le premier vecteur utilisé
  this.vect2 = null // Le deuxième vecteur utilisé
  const app = this.app
  const list = app.listePr
  this.pt = new CPointParSommeVect(list, null, false, app.getCouleur(), false, 3, 0, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, null, null, null)
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = NatObj.NVecteur
  app.outilPointageCre.reset()
  app.indication('indVect1', 'PtParSommeVec')
}

OutilPtParSommeVec.prototype.deselect = function () {
  this.annuleClignotement()
  this.vect1 = null
  this.vect2 = null
  this.pt = null
  Outil.prototype.deselect.call(this)
}

OutilPtParSommeVec.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  if (this.vect1 === null) {
    this.vect1 = elg
    this.excluDeDesignation(elg)
    this.ajouteClignotementDe(elg)
    this.resetClignotement()
    app.indication('indVect2', 'PtParSommeVec')
  } else {
    if (this.vect2 === null) {
      this.vect2 = elg
      this.ajouteClignotementDe(elg)
      app.outilPointageActif.aDesigner = NatObj.NTtPoint
      app.outilPointageActif.reset()
      app.indication('indPt', 'PtParSommeVec')
      this.ajouteObjetsVisuels()
    } else this.creeObjet(elg)
  }
}

OutilPtParSommeVec.prototype.creeObjet = function (point) {
  const app = this.app
  const list = app.listePr
  this.pt.antecedent = point
  this.pt.vecteur1 = this.vect1
  this.pt.vecteur2 = this.vect2
  app.ajouteElement(this.pt)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  // On recrée le point pour une éventuelle autre image avec le coefficient déjà choisi
  this.pt = new CPointParSommeVect(list, null, false, app.getCouleur(), false, 3, 0, false, '', app.getTaillePoliceNom(),
    app.getStylePoint(), false, null, this.vect1, this.vect2)
}

OutilPtParSommeVec.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const stfp = StyleTrait.stfp(list)
  const trans = new CTransParVect(list, null, false, this.vect1)
  app.ajouteObjetVisuel(trans)
  const ptim = new CPointImage(list, null, false, Color.black, true, 0, 0, true, '', 13, 0, false, app.mousePoint, trans)
  app.ajouteObjetVisuel(ptim)
  const ptParSommeVect = new CPointParSommeVect(list, null, false, app.getCouleur(), false, 3, 0, false, '',
    app.getTaillePoliceNom(), app.getStylePoint(), false, app.mousePoint, this.vect1, this.vect2)
  app.ajouteObjetVisuel(ptParSommeVect)
  let vect = new CVecteur(list, null, false, this.vect1.couleur, false, stfp, app.mousePoint, ptim, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vect)
  vect = new CVecteur(list, null, false, this.vect2.couleur, false, stfp, ptim, ptParSommeVect, StyleFleche.FlecheCourtePleine)
  app.ajouteObjetVisuel(vect)
  app.afficheObjetVisuels(0) // Ajout version 6.4.4
}

OutilPtParSommeVec.prototype.activationValide = function () {
  return (this.app.listePr.nombreObjetsParNatureVisibles(NatObj.NVecteur) >= 2)
}

OutilPtParSommeVec.prototype.isPointTool = function () {
  return true
}
