/*
 * Created by yvesb on 02/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import Outil from './Outil'
import Nat from '../types/Nat'
import NatObj from '../types/NatObj'
import CPointLieDroite from '../objets/CPointLieDroite'
import CPointLieCercle from '../objets/CPointLieCercle'
import CPointLieLigne from '../objets/CPointLieLigne'
import CPointLieLieuParPtLie from '../objets/CPointLieLieuParPtLie'
import CPointLieLieuParVar from '../objets/CPointLieLieuParVar'
import Pointeur from '../types/Pointeur'
import AvertDlg from '../dialogs/AvertDlg'
export default OutilPtLie

/**
 * Outil servant à créer un point lié
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilPtLie (app) {
  Outil.call(this, app, 'PtLie', 32800, false)
}

OutilPtLie.prototype = new Outil()

OutilPtLie.prototype.select = function () {
  Outil.prototype.select.call(this)
  const app = this.app
  this.objet = null
  this.app.outilPointageActif = app.outilPointageCre
  app.outilPointageCre.aDesigner = Nat.or(NatObj.NTteDroite, NatObj.NTtCercle, NatObj.NPolygone,
    NatObj.NLigneBrisee, NatObj.NLieu)
  app.outilPointageCre.reset()
  app.indication('indPtLie')
}

OutilPtLie.prototype.traiteObjetDesigne = function (elg, point) {
  if (this.objet === null) {
    this.objet = elg
    this.creeObjet(elg, point)
    this.deselect()
    this.select()
  }
}

OutilPtLie.prototype.creeObjet = function (objet, point) {
  const app = this.app
  const li = app.listePr
  let pt // Le point lié à créer
  const coul = app.getCouleur()
  const stylePoint = app.getStylePoint()
  const taille = app.getTaillePoliceNom()
  if (objet.estDeNature(NatObj.NTteDroite)) {
    pt = new CPointLieDroite(li, null, false, coul, false, 0, 3, false, '',
      taille, stylePoint, false, false, 0, objet)
  } else
    if (objet.estDeNature(NatObj.NTtCercle)) {
      pt = new CPointLieCercle(li, null, false, coul, false, 0, 3, false, '',
        taille, stylePoint, false, false, 0, objet)
    } else
      if (objet.estDeNature(Nat.or(NatObj.NLigneBrisee, NatObj.NPolygone))) {
        pt = new CPointLieLigne(li, null, false, coul, false, 0, 3, false, '', taille, stylePoint, false, false, 0, objet)
      } else
        if (objet.estDeNature(NatObj.NLieu)) {
          if (objet.className === 'CLieuDePoints') {
            pt = new CPointLieLieuParPtLie(li, null, false, coul, false, 0, 3,
              false, '', taille, stylePoint, false, false, 0, objet)
          } else {
            pt = new CPointLieLieuParVar(li, null, false, coul, false, 0, 3,
              false, '', taille, stylePoint, false, false, 0, objet)
          }
        }
  const abs = new Pointeur()
  const pointres = { x: 0, y: 0 }
  pt.testDeplacement(app.dimf, point.x, point.y, pointres, abs)
  pt.donneAbscisse(abs.getValue())
  app.ajouteElement(pt)
  const verif = app.verifieDernierElement(1)
  if (verif) {
    pt.creeAffichage(app.svgFigure, false, app.doc.couleurFond)
    this.saveFig()
  } else new AvertDlg(app, 'DejaCree')
  return verif
}

OutilPtLie.prototype.isReadyForTouchEnd = function () {
  return false
}

OutilPtLie.prototype.isPointTool = function () {
  return true
}
