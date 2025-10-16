/*
 * Created by yvesb on 03/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPar2Pts from './OutilPar2Pts'
import CImplementationProto from '../objets/CImplementationProto'
import CVecteur from '../objets/CVecteur'
import StyleFleche from '../types/StyleFleche'
import MotifPoint from '../types/MotifPoint'
import StyleTrait from '../types/StyleTrait'
import Color from '../types/Color'
import CPointBase from '../objets/CPointBase'
import { getStr } from '../kernel/kernel'

export default OutilMesLongOr
/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesLongOr (app) {
  OutilPar2Pts.call(this, app, 'MesLongOr', 33100, true)
}

OutilMesLongOr.prototype = new OutilPar2Pts()

OutilMesLongOr.prototype.preIndication = function () {
  return 'MesLong'
}

OutilMesLongOr.prototype.creeObjet = function () {
  let proto, impProto
  const app = this.app
  const li = app.listePr
  const indiceImpInitial = li.longueur()
  this.annuleClignotement()
  const meslon = li.pointeurMesLong(this.point1, this.point2)
  if (meslon !== null) { // La longueur a déjà été amesurée. On l'affiche simplement en épousant le segment
    proto = this.app.docCons.getPrototype('AffValOr')
    proto.get(0).elementAssocie = meslon
    proto.get(1).elementAssocie = this.point1
    proto.get(2).elementAssocie = this.point2
    impProto = new CImplementationProto(li, proto)
    impProto.implemente(this.app.dimf, proto)
  } else {
    // On charge la construction qui est contenue dans this.app.docConst et qui mersure la longueur et l'affiche en épousant le segemnt
    proto = this.app.docCons.getPrototype('MesLongOr')
    proto.get(0).elementAssocie = this.point1
    proto.get(1).elementAssocie = this.point2
    impProto = new CImplementationProto(li, proto)
    impProto.implemente(this.app.dimf, proto)
  }
  impProto.nomProto = getStr('MesLongOr')
  const ind = li.longueur() - 1
  const aff = li.get(ind) // L'affichage de la longueur mesurée
  aff.donneCouleur(app.getCouleur())
  aff.positionne(false, app.dimf)
  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  return true
}

OutilMesLongOr.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  const list = app.listeObjetsVisuels
  const b = Color.black
  const stfp = StyleTrait.stfp(list)
  const li = app.listeObjetsVisuels
  const pt1 = new CPointBase(li, null, false, b, true, 0, 0, true, '', 13, MotifPoint.pixel,
    false, false, this.point1.x, this.point1.y)
  // Pour les deux lignes suivantes on n'appelle pas ajouteObjetVisuel car les deux objets seront affichés plus tard
  li.add(pt1)
  li.add(app.mousePoint)
  // li.afficheTout(0, app.svgFigure, true, app.doc.couleurFond, app.doc.opacity)
  // Attention : la liste visuelle doit avoir une longueur unité
  li.pointeurLongueurUnite = app.listePr.pointeurLongueurUnite
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('MesLongOr')
  proto.get(0).elementAssocie = pt1
  proto.get(1).elementAssocie = app.mousePoint
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(app.dimf, proto)
  const ind = li.longueur() - 1
  const aff = li.get(ind) // L'affichage de la longueur mesurée
  aff.donneCouleur(app.getCouleur())
  // li.afficheTout(2, app.svgFigure, true, app.doc.couleurFond, app.doc.opacity)
  // On crée deux vecteurs provisoires pour avoir une double flèche
  const v1 = new CVecteur(list, null, false, b, false, stfp, this.point1, app.mousePoint, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(v1)
  const v2 = new CVecteur(list, null, false, b, false, stfp, app.mousePoint, this.point1, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(v2)
  app.afficheObjetVisuels(2) // Ajout version 6.4.4
}

OutilMesLongOr.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}

OutilMesLongOr.prototype.nomsPointsIndisp = function () {
  return true
}

OutilMesLongOr.prototype.isDisplayTool = function () {
  return true
}
