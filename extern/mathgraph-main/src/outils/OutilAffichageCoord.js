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
import NatCal from '../types/NatCal'
import NatObj from '../types/NatObj'
import Color from '../types/Color'
import StyleEncadrement from '../types/StyleEncadrement'
import AffichageDlg from '../dialogs/AffichageDlg'

export default OutilAffichageCoord
/**
 * Outil servant à créer une image libre sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilAffichageCoord (app) {
  Outil.call(this, app, 'AffichageCoord', 32017, true)
}
OutilAffichageCoord.prototype = new Outil()

OutilAffichageCoord.prototype.select = function () {
  Outil.prototype.select.call(this)
  this.obj = null
  this.endroitClique = false
  const app = this.app
  app.outilPointageActif = app.outilPointageClic
  app.outilPointageActif.reset()
  app.indication('indEndroitAff', 'AffichageCoord')
}

OutilAffichageCoord.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  const list = app.listePr
  const self = this
  if (this.endroitClique) {
    this.obj = elg
    this.ajouteClignotementDe(elg)
    new AffichageDlg(app, 'AffichageCoord', 1, function (rep, nbDec, taille, styleEnc, effFond, coulFond, horAlign, verAlign) {
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
    app.indication('indCoord')
    app.outilPointageActif = app.outilPointageCre
    app.outilPointageActif.aDesigner = NatObj.NTtPoint
    app.outilPointageActif.reset()
  }
}

OutilAffichageCoord.prototype.suite = function (rep, nbDec, taillePolice, styleEnc, effFond, coulFond, horAlign, verAlign) {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  const proto = app.docConsAv.getPrototype(app.decimalDot ? 'Coord' : 'CoordSepVirg')
  proto.get(0).elementAssocie = rep
  proto.get(1).elementAssocie = this.obj
  const impProto = new CImplementationProto(list, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('AffichageCoord')
  const com = impProto.premierFinal(NatObj.NCommentaire)
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

OutilAffichageCoord.prototype.activationValide = function () {
  return this.app.listePr.nombreObjetsCalcul(NatCal.NRepere) > 0
}

OutilAffichageCoord.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilAffichageCoord.prototype.isDisplayTool = function () {
  return true
}
