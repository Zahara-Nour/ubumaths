/*
 * Created by yvesb on 18/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CCommentaire from '../objets/CCommentaire'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import CommentaireDlg from '../dialogs/CommentaireDlg'
import AvertDlg from '../dialogs/AvertDlg'
import addQueue from 'src/kernel/addQueue'

export default OutilCommentaireLiePt

/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilCommentaireLiePt (app) {
  OutilObjetPar1Objet.call(this, app, 'CommentaireLiePt', 32860, true, NatObj.NTtPoint)
}

OutilCommentaireLiePt.prototype = new OutilObjetPar1Objet()

OutilCommentaireLiePt.prototype.indication = function () {
  return 'indAffLie'
}

OutilCommentaireLiePt.prototype.preIndication = function () {
  return 'Comment'
}

OutilCommentaireLiePt.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  this.comm = new CCommentaire(list, null, false, app.getCouleur(), 0, 0, 0, 0, false, elg, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', null, false)
  const self = this
  new CommentaireDlg(app, this.comm, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
}

OutilCommentaireLiePt.prototype.ajouteObjetsVisuels = function () {}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilCommentaireLiePt.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.comm)
  const self = this
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    // Modification version 6.4 : Il faut passer par la pile d'appels au cas où le texte à afficher commmence et finit par un $
    addQueue(() => this.comm.creeAffichage(self.app.svgFigure, false, app.doc.couleurFond))
    // Ce code doit être après le addQueue précédent, car même s'il va être exécuté avant ce qui a été empilé,
    // il peut ajouter des actions sur la pile (qui doivent s'exécuter après ce qu'on vient d'empiler)
    // this.comm.creeAffichage(this.app.svgFigure, false, app.doc.couleurFond, app.doc.opacity);
    this.annuleClignotement()
    this.saveFig()
    app.activeOutilCapt()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
}

OutilCommentaireLiePt.prototype.isDisplayTool = function () {
  return true
}
