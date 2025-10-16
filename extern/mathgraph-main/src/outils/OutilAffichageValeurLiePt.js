/*
 * Created by yvesb on 13/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import CValeurAffichee from '../objets/CValeurAffichee'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import AffichageValeurDlg from '../dialogs/AffichageValeurDlg'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import AvertDlg from '../dialogs/AvertDlg'
import addQueue from 'src/kernel/addQueue'
export default OutilAffichageValeurLiePt
/**
 * Outil servant à créer une droite horizontale
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilAffichageValeurLiePt (app) {
  OutilObjetPar1Objet.call(this, app, 'AffichageValeurLiePt', 32821, true, NatObj.NTtPoint)
}

OutilAffichageValeurLiePt.prototype = new OutilObjetPar1Objet()

OutilAffichageValeurLiePt.prototype.indication = function () {
  return 'indAffLie'
}

OutilAffichageValeurLiePt.prototype.preIndication = function () {
  return 'AffVal'
}

OutilAffichageValeurLiePt.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const list = app.listePr
  this.valaff = new CValeurAffichee(list, null, false, app.getCouleur(), 0, 0, 0, 0, false, elg, app.dys ? 18 : 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, null, '', '', 2, null, false)
  const self = this
  new AffichageValeurDlg(app, this.valaff, false, function () { self.callBackOK() }, function () { self.callBackCancel() })
}

// Pas d'objets visuels pour cet outil
OutilAffichageValeurLiePt.prototype.ajouteObjetsVisuels = function () {}

/**
 * Fonction de callback créant l'objet si la boîte de dialoge a été validée
 */
OutilAffichageValeurLiePt.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.valaff)
  if (app.verifieDernierElement(1)) {
    // L'élément créé existe bien et a été ajouté à la liste
    this.valaff.setReady4MathJax() // Ajouté version 6.4.1
    // addQueue Ajouté version 6.4.1
    addQueue(() => this.valaff.creeAffichage(app.svgFigure, false, app.doc.couleurFond))
    // Ce code doit être après le addQueue précédent, car même s'il va être exécuté avant ce qui a été empilé,
    // il peut ajouter des actions sur la pile (qui doivent s'exécuter après ce qu'on vient d'empiler)
    this.annuleClignotement()
    this.saveFig()
    app.activeOutilCapt()
  } else {
    new AvertDlg(app, 'DejaCree')
  }
}

OutilAffichageValeurLiePt.prototype.callBackCancel = function () {
  this.app.activeOutilCapt()
}

OutilAffichageValeurLiePt.prototype.isDisplayTool = function () {
  return true
}
