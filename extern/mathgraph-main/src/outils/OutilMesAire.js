/*
 * Created by yvesb on 24/01/2017.
 */

/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatObj from '../types/NatObj'
import CMesureAire from '../objets/CMesureAire'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
import AvertDlg from '../dialogs/AvertDlg'
import NomMesureDlg from '../dialogs/NomMesureDlg'
import CMilieu from '../objets/CMilieu'
import Color from '../types/Color'
import MotifPoint from '../types/MotifPoint'
import CValeurAffichee from '../objets/CValeurAffichee'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from '../objets/CAffLiePt'
import CValeurAngle from '../objets/CValeurAngle'
import { getStr } from '../kernel/kernel'
export default OutilMesAire
/**
 * Outil servant à créer la mesure de l'aire d'un polygone
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesAire (app) {
  OutilObjetPar1Objet.call(this, app, 'MesAire', 33127, true, NatObj.NPolygone)
}

OutilMesAire.prototype = new OutilObjetPar1Objet()

OutilMesAire.prototype.indication = function () {
  return 'indPoly'
}

OutilMesAire.prototype.preIndication = function () {
  return 'MesAire'
}

OutilMesAire.prototype.creeObjet = function (elg) {
  const app = this.app
  const self = this
  this.ligne = elg
  new NomMesureDlg(app, this.tip, function (st) { self.callBackOK(st) }, function () { self.reselect() }, false)
}

OutilMesAire.prototype.callBackOK = function (st) {
  const app = this.app
  const list = app.listePr
  const ligne = this.ligne
  const mes = new CMesureAire(list, null, false, st, ligne)
  app.ajouteElement(mes)
  if (app.verifieDernierElement(1)) {
    // On vérifie que les points de la ligne sont bien nommés. Sinon on leur attribue un nom.
    for (let i = 0; i < ligne.colPoints.length; i++) {
      const ptp = ligne.colPoints[i].pointeurSurPoint
      if (ptp.nom === '') {
        ptp.donneNom(list.genereNomPourPoint())
        ptp.updateName(app.svgFigure, true)
      }
    }
    const nomSommets = ligne.nomSommetsPolygone()
    // Version 8.7.2 : Si, dans les préférences, on a demandé un affichage des mesures
    // on va créer le milieu (caché) du segment formé par les deux premiers points du polygone
    // (s'il n'existe pas déjà) et lui lier un affichage de valeur
    if (app.displayMeasures) {
      const svg = app.svgFigure
      const dimf = app.dimf
      const coulfond = app.doc.couleurFond
      const pt1 = ligne.colPoints[0].pointeurSurPoint
      const pt2 = ligne.colPoints[1].pointeurSurPoint
      let mil = new CMilieu(list, null, false, Color.black,
        false, 0, 3, true, '', app.pref_TaillePoliceNom,
        MotifPoint.petitRond, false, pt1, pt2)
      const milieuDejaCree = app.objetDejaCree(mil)
      if (milieuDejaCree) {
        mil = milieuDejaCree
      } else {
        list.add(mil)
        mil.positionneEtCreeAffichage(false, dimf, svg, coulfond)
      }
      const affVal = new CValeurAffichee(list, null, false, app.getCouleur(), 0, 0, 0, 0,
        false, mil, app.dys ? 18 : 16, StyleEncadrement.Sans, true, app.doc.couleurFond,
        CAffLiePt.alignHorCent, CAffLiePt.alignVerCent, mes,
        getStr('chinfo71') + ' ' + getStr('of') + ' ' + nomSommets + ' : ', '', 2,
        new CValeurAngle(list, 0), false)
      list.add(affVal)
      affVal.positionneEtCreeAffichage(false, dimf, svg, coulfond)
    }
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
}

// Pas d'objets visuels ici
OutilMesAire.prototype.ajouteObjetsVisuels = function () {
}

OutilMesAire.prototype.activationValide = function () {
  const list = this.app.listePr
  return list.pointeurLongueurUnite !== null && list.nombreObjetsParNatureVisibles(NatObj.NPolygone) > 0
}

OutilMesAire.prototype.isDisplayTool = function () {
  return true
}
