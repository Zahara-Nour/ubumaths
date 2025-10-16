/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CCommentaire from '../objets/CCommentaire'
import CAffLiePt from '../objets/CAffLiePt'
import CImplementationProto from '../objets/CImplementationProto'
import CCalcul from '../objets/CCalcul'
import Nat from '../types/Nat'
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObj'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import AffichageDlg from '../dialogs/AffichageDlg'

export default OutilAffichageEq
/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilAffichageEq (app) {
  Outil.call(this, app, 'AffichageEq', 32014, true)
}
OutilAffichageEq.prototype = new Outil()

OutilAffichageEq.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.obj = null
  this.endroitClique = false
  const app = this.app
  app.outilPointageActif = app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff', 'AffichageEq')
}

OutilAffichageEq.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  const self = this
  if (this.endroitClique) {
    this.obj = elg
    this.ajouteClignotementDe(elg)
    new AffichageDlg(app, 'AffichageEq', 2, function (rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign) {
      self.suite(rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign)
    },
    function () {
      app.activeOutilCapt()
    })
  } else {
    this.endroitClique = true
    this.point = point
    this.comClig = new CCommentaire(list, null, false, Color.black, point.x, point.y, 0, 0, false, null, 16, StyleEncadrement.Sans,
      false, app.doc.couleurFond, CAffLiePt.alignHorLeft, CAffLiePt.alignVerTop,
      getStr('AffIci'))
    this.comClig.positionne(false, app.dimf)
    this.comClig.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.ajouteClignotementDe(this.comClig)
    this.resetClignotement()
    app.indication('indEq', 'AffichageEq')
    app.outilPointageActif = app.outilPointageCre
    app.outilPointageActif.aDesigner = Nat.or(NatObj.NDroite, NatObj.NCercle)
    app.outilPointageActif.reset()
  }
}

OutilAffichageEq.prototype.suite = function (rep, nbDec, taillePolice, styleEnc, effFond, coulFond, horAlign, verAlign) {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  const isLine = this.obj.estDeNature(NatObj.NDroite)
  const proto = app.docConsAv.getPrototype(isLine ? 'EqDte' : 'EqCerc')
  proto.get(0).elementAssocie = rep
  const calc = new CCalcul(list, null, false, list.genereNomPourCalcul(getStr('nbdec'), false), String(nbDec))
  app.ajouteElement(calc)
  proto.get(1).elementAssocie = calc
  proto.get(2).elementAssocie = this.obj
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('AffichageEq')
  const latex = impProto.premierFinal(NatObj.NLatex)
  latex.xNom = this.point.x
  latex.yNom = this.point.y
  latex.donneCouleur(app.getCouleur())
  latex.taillePolice = taillePolice
  latex.encadrement = styleEnc
  latex.effacementFond = effFond
  latex.couleurFond = coulFond
  latex.alignementHorizontal = horAlign
  latex.alignementVertical = verAlign
  const indImpProto = list.indexOf(impProto)
  list.positionne(false, app.dimf)
  latex.setReady4MathJax()
  list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  app.activeOutilCapt()
}

OutilAffichageEq.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilAffichageEq.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilAffichageEq.prototype.isDisplayTool = function () {
  return true
}
