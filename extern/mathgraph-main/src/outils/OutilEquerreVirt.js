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

export default OutilEquerreVirt

/**
 * Outil servant à créer ajouter un rapporteur virtuel sur la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilEquerreVirt (app) {
  Outil.call(this, app, 'EquerreVirt', 33041, true)
}

OutilEquerreVirt.prototype = new Outil()

OutilEquerreVirt.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.point = null // Pointera sur l'extrémité gauche ou haute du curseur
  app.outilPointageActif = app.outilPointageClicOuPt
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset()
  this.resetClignotement()
  app.indication('indCurseur1', 'EquerreVirt')
}

OutilEquerreVirt.prototype.traiteObjetDesigne = function () {
  const pt = this.app.outilPointageClicOuPt.objetDesigne // Le point qui a été créé ou sur lequel on a clique
  this.creeObjet(pt)
}

OutilEquerreVirt.prototype.creeObjet = function (pt) {
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('EquerreTranslatable')
  this.annuleClignotement()
  proto.get(0).elementAssocie = pt
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(this.app.dimf, proto)
  impProto.nomProto = getStr('Equerre')
  this.saveFig()
  if (app.estExercice) app.listePourConst = app.listePourConstruction()
  li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  app.activeOutilCapt()
  return true
}
