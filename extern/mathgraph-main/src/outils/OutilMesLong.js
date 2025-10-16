/*
 * Created by yvesb on 03/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLongueur from '../objets/CLongueur'
import OutilPar2Pts from './OutilPar2Pts'
import AvertDlg from '../dialogs/AvertDlg'
import CImplementationProto from '../objets/CImplementationProto'
import CVecteur from '../objets/CVecteur'
import StyleFleche from '../types/StyleFleche'
import MotifPoint from '../types/MotifPoint'
import StyleTrait from '../types/StyleTrait'
import Color from '../types/Color'
import CPointBase from '../objets/CPointBase'
import { getStr } from '../kernel/kernel'

export default OutilMesLong
/**
 * Outil servant à mesurer en cliquant sur deux points de la figure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesLong (app) {
  OutilPar2Pts.call(this, app, 'MesLong', 32813, true)
}

OutilMesLong.prototype = new OutilPar2Pts()

OutilMesLong.prototype.preIndication = function () {
  return 'MesLong'
}

OutilMesLong.prototype.creeObjet = function () {
  let ind, long, nbEltsCrees
  const app = this.app
  const li = app.listePr
  const leninit = li.longueur()
  const indiceImpInitial = li.longueur()
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('MesureLongueur')
  this.annuleClignotement()
  if (app.displayMeasures) {
    proto.get(0).elementAssocie = this.point1
    proto.get(1).elementAssocie = this.point2
    const impProto = new CImplementationProto(li, proto)
    impProto.implemente(this.app.dimf, proto)
    impProto.nomProto = getStr('MesLong')
    ind = li.longueur() - 1
    const aff = li.get(ind) // L'affichage de la longueur mesurée
    aff.donneCouleur(app.getCouleur())
    // On fait précéder l'affichage de la longueur de quelque chose du style AB= ?
    // aff.enTete = this.point1.nom + this.point2.nom + "=";
    aff.positionne(false, app.dimf)
    long = li.get(ind - 1)
    nbEltsCrees = ind + 1 - leninit
  } else {
    long = new CLongueur(li, null, false, this.point1, this.point2)
    app.ajouteElement(long)
    nbEltsCrees = 1
  }

  // On regarde si la longueur mesurée existe déjà
  const existeDeja = app.existeDeja(long)
  if (existeDeja) {
    new AvertDlg(app, 'DejaCree')
    app.detruitDerniersElements(nbEltsCrees)
  } else {
    this.saveFig()
    // Corrigé version 5.6.4
    if (app.estExercice) app.listePourConst = app.listePourConstruction()

    li.afficheTout(indiceImpInitial, app.svgFigure, true, app.doc.couleurFond)
  }
  return !existeDeja
}

OutilMesLong.prototype.ajouteObjetsVisuels = function () {
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
  // li.afficheTout(0, app.svgFigure, true, app.doc.couleurFond, app.doc.opacity) // Supprimé version 6.4 .4
  // Attention : la liste visuelle doit avoir une longueur unité
  li.pointeurLongueurUnite = app.listePr.pointeurLongueurUnite
  // On charge la construction qui est contenue dans this.app.docConst
  const proto = this.app.docCons.getPrototype('MesureLongueur')
  proto.get(0).elementAssocie = pt1
  proto.get(1).elementAssocie = app.mousePoint
  const impProto = new CImplementationProto(li, proto)
  impProto.implemente(app.dimf, proto)
  const ind = li.longueur() - 1
  const aff = li.get(ind) // L'affichage de la mesure
  aff.donneCouleur(app.getCouleur())
  // On crée deux vecteurs provisoires pour avoir une double flèche
  const v1 = new CVecteur(list, null, false, b, false, stfp, this.point1, app.mousePoint, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(v1)
  const v2 = new CVecteur(list, null, false, b, false, stfp, app.mousePoint, this.point1, StyleFleche.FlecheLonguePleine)
  app.ajouteObjetVisuel(v2)
  app.afficheObjetVisuels(2) // Ajout version 6.4.4
}

OutilMesLong.prototype.activationValide = function () {
  return this.app.listePr.pointeurLongueurUnite !== null
}

OutilMesLong.prototype.nomsPointsIndisp = function () {
  return true
}

OutilMesLong.prototype.isDisplayTool = function () {
  return true
}
