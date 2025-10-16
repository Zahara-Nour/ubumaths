/*
 * Created by yvesb on 14/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CLatex from '../objets/CLatex'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import LatexDlg from '../dialogs/LatexDlg'
import AvertDlg from '../dialogs/AvertDlg'
import addQueue from 'src/kernel/addQueue'
export default OutilLatexLiePt
/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilLatexLiePt (app) {
  OutilObjetPar1Objet.call(this, app, 'LatexLiePt', 32011, true, NatObj.NTtPoint)
}

OutilLatexLiePt.prototype = new OutilObjetPar1Objet()

OutilLatexLiePt.prototype.indication = function () {
  return 'indAffLie'
}

OutilLatexLiePt.prototype.preIndication = function () {
  return 'Latex'
}

OutilLatexLiePt.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  this.latex = new CLatex(list, null, false, app.getCouleur(), 0, 0, 0, 0, false, elg, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', null, false)
  const self = this
  new LatexDlg(app, this.latex, false, function () { self.callBackOK() }, function () { self.callBackCancel() })
}

OutilLatexLiePt.prototype.ajouteObjetsVisuels = function () {}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilLatexLiePt.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.latex)
  const self = this
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    // Modification version 6.4 : Il faut passer par la pile d'appels au cas où le texte à afficher commmence et finit par un $
    addQueue(function () {
      self.latex.creeAffichage(self.app.svgFigure, false, app.doc.couleurFond)
    })

    // this.latex.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond, app.doc.opacity);
    this.annuleClignotement()
    this.saveFig()
    app.activeOutilCapt()
  } else new AvertDlg(app, 'DejaCree')
}

OutilLatexLiePt.prototype.callBackCancel = function () {
  this.app.activeOutilCapt()
}

OutilLatexLiePt.prototype.isDisplayTool = function () {
  return true
}
