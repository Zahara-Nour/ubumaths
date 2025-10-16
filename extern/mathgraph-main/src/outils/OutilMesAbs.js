/*
 * Created by yvesb on 05/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { getStr } from '../kernel/kernel'
import OutilPar3Pts from './OutilPar3Pts'
import AvertDlg from '../dialogs/AvertDlg'
import CMesureAbscisse from '../objets/CMesureAbscisse'
import NatObj from '../types/NatObj'
import NomMesureDlg from '../dialogs/NomMesureDlg'
import { aligne } from 'src/kernel/kernelVect'

export default OutilMesAbs/**
 * Outil servant à mesurer l'abscisse d'un point sur une droite relativement à deux points de la droite
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesAbs (app) {
  OutilPar3Pts.call(this, app, 'MesAbs', 32817, true, false) // Dernier paramètre false car on réactive l'outil de capture après création
}

OutilMesAbs.prototype = new OutilPar3Pts()

OutilMesAbs.prototype.creeObjet = function () {
  const app = this.app
  const li = app.listePr
  const mes = new CMesureAbscisse(li, null, false, this.point1, this.point2, this.point3, '')
  app.ajouteElement(mes)
  const pasDejaCree = app.verifieDernierElement(1)
  if (pasDejaCree) {
    // La mesure existe bien et n'a pas été déjà créé
    this.annuleClignotement()
    const self = this
    const infoAnnul = {
      pt1: this.point1,
      pt2: this.point2,
      pt3: this.point3,
      pt1Cree: this.point1Cree,
      pt2Cree: this.point2Cree,
      pt1Nomme: this.point1Nomme,
      pt2Nomme: this.point2Nomme,
      pt3Nomme: this.point3Nomme
    }
    new NomMesureDlg(app, getStr('MesAbs') + ' ' + getStr('of') + ' ' + this.point3.nom + ' ' +
      getStr('dans') + ' (' + this.point1.nom + ',' + this.point2.nom + ')',
    function (st) { self.callBackAfterDlg(st, infoAnnul) },
    function () { self.callBackCancel(infoAnnul) })
  } else {
    new AvertDlg(app, 'DejaCree')
  }
  return pasDejaCree
}

OutilMesAbs.prototype.callBackAfterDlg = function (st) {
  const app = this.app
  const li = app.listePr
  const mes = li.get(li.longueur() - 1)
  mes.nomCalcul = st
  this.saveFig()
  app.activeOutilCapt()
  // li.afficheTout(infoAnnul.indiceImpInitial, app.svgFigure, true, app.doc.couleurFond, app.doc.opacity);
}

OutilMesAbs.prototype.callBackCancel = function (infoAnnul) {
  const app = this.app
  app.detruitDernierElement()
  this.objetCree = false // Pour que les points éventuellemnt nommés par l'outil soient dénommés.
  this.point1 = infoAnnul.pt1
  this.point2 = infoAnnul.pt2
  this.point3 = infoAnnul.pt3
  this.point1Cree = infoAnnul.pt1Cree
  this.point2Cree = infoAnnul.pt2Cree
  this.point1Nomme = infoAnnul.pt1Nomme
  this.point2Nomme = infoAnnul.pt2Nomme
  this.point3Nomme = infoAnnul.pt3Nomme
  this.deselect()
  app.activeOutilCapt()
}

OutilMesAbs.prototype.actionApresPoint2 = function () {
  const app = this.app
  const list = app.listePr
  this.annuleClignotement()
  for (let i = 0; i < list.longueur(); i++) {
    const elb = list.get(i)
    if (elb.estDeNature(NatObj.NTtPoint)) {
      if (!elb.masque && aligne(this.point1.x, this.point1.y, this.point2.x, this.point2.y, elb.x, elb.y)) { this.ajouteClignotementDe(elb) }
    }
  }
  app.outilPointageActif = app.outilPointageObjetClignotant
  app.outilPointageActif.aDesigner = NatObj.NTtPoint
  app.outilPointageActif.reset(false, true) // Deuxième paramètre true pour pouvoir désigner un objet clignotant
  this.resetClignotement()
}

OutilMesAbs.prototype.nomsPointsIndisp = function () {
  return true
}

OutilMesAbs.prototype.indication = function (ind) {
  switch (ind) {
    case 1: return 'intPtParAbs1'
    case 2: return 'intPtParAbs2'
    case 3: return 'indMesAbs3'
  }
}

OutilMesAbs.prototype.preIndication = function () {
  return 'MesAbs'
}
