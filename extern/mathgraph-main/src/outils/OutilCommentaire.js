/*
 * Created by yvesb on 18/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CCommentaire from '../objets/CCommentaire'
import CommentaireDlg from '../dialogs/CommentaireDlg'
import AvertDlg from '../dialogs/AvertDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import addQueue from 'src/kernel/addQueue'
export default OutilCommentaire
/**
 * Outil servant à créer un affichage de valeur libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilCommentaire (app) {
  Outil.call(this, app, 'Commentaire', 32857, true)
}
OutilCommentaire.prototype = new Outil()

OutilCommentaire.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff', 'Comment')
}

OutilCommentaire.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  this.comClig = new CCommentaire(list, null, false, Color.black, point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop,
    getStr('AffIci'), null, false)
  this.comClig.positionne(false, app.dimf)
  this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.ajouteClignotementDe(this.comClig)
  this.resetClignotement()
  const self = this
  this.comm = new CCommentaire(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, '', null, false)
  new CommentaireDlg(app, this.comm, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
}

OutilCommentaire.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.comm)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.comm.setReady4MathJax() // Pour le cas où le commentaire commence et finit par un $
    addQueue(() => this.comm.creeAffichage(app.svgFigure, false, app.doc.couleurFond))
    // Ce code doit être après le addQueue précédent, car même s'il va être exécuté avant ce qui a été empilé,
    // il peut ajouter des actions sur la pile (qui doivent s'exécuter après ce qu'on vient d'empiler)
    this.annuleClignotement()
    this.saveFig()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
  app.activeOutilCapt()
}

OutilCommentaire.prototype.isDisplayTool = function () {
  return true
}
