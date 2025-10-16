/*
 * Created by yvesb on 14/05/2017.
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
import CEditeurFormule from '../objets/CEditeurFormule'
import EditeurFormuleDlg from '../dialogs/EditeurFormuleDlg'
import CAffLiePt from '../objets/CAffLiePt'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import NatCal from '../types/NatCal'
export default OutilEditeurFormule

/**
 *
 * @param {MtgApp} app
 * @constructor
 */
function OutilEditeurFormule (app) {
  Outil.call(this, app, 'EditeurFormule', 32036, true)
}
OutilEditeurFormule.prototype = new Outil()

OutilEditeurFormule.prototype.select = function () {
  const app = this.app
  Outil.prototype.select.call(this)
  app.outilPointageActif = this.app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff')
}

OutilEditeurFormule.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  this.comClig = new CCommentaire(list, null, false, Color.black, point.x, point.y, 0, 0, false, null, 13, StyleEncadrement.Sans, false,
    app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, getStr('AffIci'))
  this.comClig.positionne(false, app.dimf)
  this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
  this.ajouteClignotementDe(this.comClig)
  this.resetClignotement()
  const self = this
  this.editeur = new CEditeurFormule(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 14,
    StyleEncadrement.Sans, false, app.doc.couleurFond, null, '', 12, false, '=', false, true, true, false)
  /*
  this.comm = new CCommentaire(list, null, false, app.getCouleur(), point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans,
    false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop, "")
  new CommentaireDlg(app, this.comm, false, function() {self.callBackOK()}, function() {self.app.activeOutilCapt()});
  */
  new EditeurFormuleDlg(app, this.editeur, false, function () { self.callBackOK() }, function () { self.app.activeOutilCapt() })
}

OutilEditeurFormule.prototype.callBackOK = function () {
  const app = this.app
  app.ajouteElement(this.editeur)
  this.annuleClignotement()
  this.saveFig()
  app.activeOutilCapt()
}

OutilEditeurFormule.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NCalculOuFonctionParFormule) > 0
}

OutilEditeurFormule.prototype.isDisplayTool = function () {
  return true
}
