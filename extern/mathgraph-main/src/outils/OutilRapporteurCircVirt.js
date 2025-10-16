/*
 * Created by yvesb on 12/02/2025.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from '../outils/Outil'
import NatObj from '../types/NatObj'
import CImplementationProto from '../objets/CImplementationProto'
import { getStr, uniteAngleDegre } from '../kernel/kernel'

export default OutilRapporteurCircVirt

/**
 * Outil servant à créer ajouter un rapporteur virtuel sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRapporteurCircVirt (app) {
  Outil.call(this, app, 'RapporteurCircVirt', 33040, true)
}

OutilRapporteurCircVirt.prototype = new Outil()

OutilRapporteurCircVirt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur l'extrémité gauche ou haute du curseur
  app.outilPointageActif = app.outilPointageClicOuPt
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indCurseur1', 'RapCirc')
}

OutilRapporteurCircVirt.prototype.traiteObjetDesigne = function () {
  const pt = this.app.outilPointageClicOuPt.objetDesigne // Le point qui a été créé ou sur lequel on a clique
  this.creeObjet(pt)
}

OutilRapporteurCircVirt.prototype.creeObjet = function (pt) {
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('RapporteurCirculaireTranslatable')
  this.annuleClignotement()
  proto.get(0).elementAssocie = pt
  const svgFig = app.svgFigure
  pt.nomMasque = true
  pt.updateName(svgFig, true)
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(app.dimf, proto)
  impProto.nomProto = getStr('RapCirc')
  this.saveFig()
  if (app.estExercice) app.listePourConst = app.listePourConstruction()
  li.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
  app.activeOutilCapt()
  return true
}

OutilRapporteurCircVirt.prototype.activationValide = function () {
  return this.app.listePr.uniteAngle === uniteAngleDegre
}
