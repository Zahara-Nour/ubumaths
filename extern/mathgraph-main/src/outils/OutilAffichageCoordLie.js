/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
import { getStr } from '../kernel/kernel'
import CImplementationProto from '../objets/CImplementationProto'
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObj'
import AffichageDlg from '../dialogs/AffichageDlg'

export default OutilAffichageCoordLie
/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilAffichageCoordLie (app) {
  Outil.call(this, app, 'AffichageCoordLie', 32021, true)
}
OutilAffichageCoordLie.prototype = new Outil()

OutilAffichageCoordLie.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.point = null
  this.obj = null
  const app = this.app
  app.outilPointageActif = app.outilPointageCre
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  app.indication('indAffLie', 'AffichageCoord')
}

OutilAffichageCoordLie.prototype.traiteObjetDesigne = function (elg) {
  const app = this.app
  const self = this
  if (this.point === null) {
    this.point = elg
    this.ajouteClignotementDe(this.point)
    this.resetClignotement()
    app.outilPointageActif.aDesigner = NatObj.NTtPoint
    app.outilPointageActif.reset()
    app.indication('indCoord')
  } else {
    this.obj = elg
    this.ajouteClignotementDe(elg)
    new AffichageDlg(app, 'AffichageCoordLie', 1, function (rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign) {
      self.suite(rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign)
    },
    function () {
      app.activeOutilCapt()
    })
  }
}

OutilAffichageCoordLie.prototype.suite = function (rep, nbDec, taillePolice, styleEnc, effFond, coulFond, horAlign, verAlign) {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  const proto = app.docConsAv.getPrototype(app.decimalDot ? 'Coord' : 'CoordSepVirg')
  proto.get(0).elementAssocie = rep
  proto.get(1).elementAssocie = this.obj
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('AffichageCoordLie')
  const com = impProto.premierFinal(NatObj.NCommentaire)
  com.pointLie = this.point
  com.xNom = this.point.x
  com.yNom = this.point.y
  com.donneCouleur(app.getCouleur())
  com.taillePolice = taillePolice
  com.encadrement = styleEnc
  com.effacementFond = effFond
  com.couleurFond = coulFond
  com.alignementHorizontal = horAlign
  com.alignementVertical = verAlign
  com.chaineCommentaire = com.chaineCommentaire.replace(/,2/g, ',' + nbDec)
  const indImpProto = list.indexOf(impProto)
  list.positionne(false, app.dimf)
  list.afficheTout(indImpProto, app.svgFigure, true, app.doc.couleurFond)
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  app.activeOutilCapt()
}

OutilAffichageCoordLie.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilAffichageCoordLie.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilAffichageCoordLie.prototype.isDisplayTool = function () {
  return true
}
