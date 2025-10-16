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
import { getStr } from '../kernel/kernel'
import CCalcul from '../objets/CCalcul'

export default OutilRegleVirt

/**
 * Outil servant à créer ajouter un rapporteur virtuel sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRegleVirt (app) {
  Outil.call(this, app, 'RegleVirt', 33042, true)
}

OutilRegleVirt.prototype = new Outil()

OutilRegleVirt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur l'extrémité gauche ou haute du curseur
  app.outilPointageActif = app.outilPointageClicOuPt
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indCurseur1', 'Regle')
}

OutilRegleVirt.prototype.traiteObjetDesigne = function () {
  const pt = this.app.outilPointageClicOuPt.objetDesigne // Le point qui a été créé ou sur lequel on a clique
  this.creeObjet(pt)
}

OutilRegleVirt.prototype.creeObjet = function (pt) {
  const app = this.app
  const li = app.listePr
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('RegleGradueeTranslatable')
  this.annuleClignotement()
  const nomCalc = li.genereDebutNomPourCalcul('gradmax', li.longueur() - 1, [])
  const calc = new CCalcul(li, null, false, nomCalc, '12')
  li.add(calc)
  calc.positionne()
  const indiceImpInitial = li.longueur()
  proto.get(0).elementAssocie = calc
  proto.get(1).elementAssocie = pt
  // On cache l nom du point
  pt.nomMasque = true
  const svgFig = app.svgFigure
  pt.updateName(svgFig, true)
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(this.app.dimf, proto)
  impProto.nomProto = getStr('Regle')
  this.saveFig()
  if (app.estExercice) app.listePourConst = app.listePourConstruction()
  li.afficheTout(indiceImpInitial, svgFig, true, app.doc.couleurFond)
  app.activeOutilCapt()
  return true
}

OutilRegleVirt.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}
