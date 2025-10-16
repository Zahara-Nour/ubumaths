/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CImplementationProto from '../objets/CImplementationProto'
import CCalcul from '../objets/CCalcul'
import Nat from '../types/Nat'
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObj'
import AffichageDlg from '../dialogs/AffichageDlg'

export default OutilAffichageEqLie

/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilAffichageEqLie (app) {
  Outil.call(this, app, 'AffichageEqLie', 32015, true)
}
OutilAffichageEqLie.prototype = new Outil()

OutilAffichageEqLie.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.point = null
  this.obj = null
  const app = this.app
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  app.indication('indAffLie', 'AffichageEq')
}

OutilAffichageEqLie.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const self = this
  if (this.point === null) {
    this.point = elg
    this.ajouteClignotementDe(this.point)
    this.resetClignotement()
    app.outilPointageActif.aDesigner = Nat.or(NatObj.NDroite, NatObj.NCercle)
    app.outilPointageActif.reset()
    app.indication('indEq', 'AffichageEq')
  } else {
    this.obj = elg
    this.ajouteClignotementDe(elg)
    new AffichageDlg(app, 'AffichageEqLie', 2, function (rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign) {
      self.suite(rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign)
    },
    function () {
      app.activeOutilCapt()
    })
  }
}

OutilAffichageEqLie.prototype.suite = function (rep, nbDec, taillePolice, styleEnc, effFond, coulFond, horAlign, verAlign) {
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
  latex.pointLie = this.point
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

OutilAffichageEqLie.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilAffichageEqLie.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilAffichageEqLie.prototype.isDisplayTool = function () {
  return true
}
