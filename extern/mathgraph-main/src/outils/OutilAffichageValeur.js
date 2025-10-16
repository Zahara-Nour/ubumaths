/*
 * Created by yvesb on 13/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CValeurAffichee from '../objets/CValeurAffichee'
import CCommentaire from '../objets/CCommentaire'
import AffichageValeurDlg from '../dialogs/AffichageValeurDlg'
import AvertDlg from '../dialogs/AvertDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import addQueue from 'src/kernel/addQueue'
export default OutilAffichageValeur
/**
 * Outil servant à créer un affichage de valeur libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilAffichageValeur (app) {
  Outil.call(this, app, 'AffichageValeur', 32815, true)
}
OutilAffichageValeur.prototype = new Outil()

OutilAffichageValeur.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff', 'AffVal')
}

OutilAffichageValeur.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  this.comClig = new CCommentaire(list, null, false, Color.black, point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans, false,
    Color.white, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, getStr('AffIci'), null, false)
  this.comClig.positionne(false, app.dimf)
  this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.ajouteClignotementDe(this.comClig)
  this.resetClignotement()
  const self = this
  this.affval = new CValeurAffichee(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, null, '', '', 2, null, false)
  new AffichageValeurDlg(app, this.affval, false, function () { self.callBackOK() }, function () { self.callBackCancel() })
}

OutilAffichageValeur.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.affval)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.affval.setReady4MathJax() // Ajouté version 6.4.1
    // addQueue Ajouté version 6.4.1
    addQueue(() => this.affval.creeAffichage(app.svgFigure, false, app.doc.couleurFond))
    // Ce code doit être après le addQueue précédent, car même s'il va être exécuté avant ce qui a été empilé,
    // il peut ajouter des actions sur la pile (qui doivent s'exécuter après ce qu'on vient d'empiler)
    this.annuleClignotement()
    this.saveFig()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
  app.activeOutilCapt()
}

OutilAffichageValeur.prototype.callBackCancel = function () {
  this.app.activeOutilCapt()
}

OutilAffichageValeur.prototype.isDisplayTool = function () {
  return true
}
