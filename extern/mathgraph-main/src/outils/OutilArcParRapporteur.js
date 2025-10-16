/*
 * Created by yvesb on 14/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { ConvDegRad, uniteAngleRadian } from '../kernel/kernel'
import StyleTrait from '../types/StyleTrait'
import CValeurAngle from '../objets/CValeurAngle'
import CValeur from '../objets/CValeur'
import CArcDeCercle from '../objets/CArcDeCercle'
import OutilRapporteur from '../outils/OutilRapporteur'
import Color from '../types/Color'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import MotifPoint from '../types/MotifPoint'
import CCercleOA from '../objets/CCercleOA'
import CDroiteDirectionFixe from '../objets/CDroiteDirectionFixe'
import CPointLieDroite from '../objets/CPointLieDroite'
import CPointLieCercle from '../objets/CPointLieCercle'
import CMesureAngleOriente from '../objets/CMesureAngleOriente'
import CMesureAngleGeometrique from '../objets/CMesureAngleGeometrique'
import CHomothetie from '../objets/CHomothetie'
import CValeurAffichee from '../objets/CValeurAffichee'
import CAffLiePt from '../objets/CAffLiePt'
import StyleEncadrement from '../types/StyleEncadrement'
import CResultatValeur from '../objets/CResultatValeur'

export default OutilArcParRapporteur

/**
 * Outil de création d'un arc de cercle par rapporteur
 * @param {MtgApp} app L'application propriétaire
 * @param toolName String : Le nom de l'outil
 * @param toolIndex Integer : L'index de l'outil tel que dans la version Java
 * @constructor
 */
function OutilArcParRapporteur (app, toolName, toolIndex) {
  if (arguments.length === 1) OutilRapporteur.call(this, app, 'ArcParRapporteur', 33036, true)
  else OutilRapporteur.call(this, app, toolName, toolIndex)
}

OutilArcParRapporteur.prototype = new OutilRapporteur()

OutilArcParRapporteur.prototype.ajouteObjetsVisuels = function () {
  const app = this.app
  let ptp = null
  const listeVisuelle = this.app.listeObjetsVisuels
  const stfc = StyleTrait.stfc(listeVisuelle)
  const stfp = StyleTrait.stfp(listeVisuelle)
  const bl = Color.black
  if (this.point2 === null) {
    ptp = this.ajouteRapporteur(this.point1) // Le pointeur renvoyé dans ptp est
    // un pointeur sur un point d'intersection d'une demi-droite avec un cercle.
    this.ptCercle = new CCercleOA(listeVisuelle, null, false, bl, false, stfc, this.point1, ptp)
    app.ajouteObjetVisuel(this.ptCercle)
    app.afficheObjetVisuels(0) // Ajout version 6.4.4
  } else {
    const inddeb = listeVisuelle.longueur()
    // Si le point dont on veut créer l'image a été désigné, le cercle précédent
    // devient fixe en remplaçant dans la liste visuelle le point souris
    // par Point2
    listeVisuelle.remplacePoint(app.mousePoint, this.point2)
    // Pour pouvoir initialiser l'abscisse du point lié, il faut mesurer
    // un angle orienté à partir d'une horizontale
    const ptdh = new CDroiteDirectionFixe(listeVisuelle, null, false, bl, true, 0, 0, true, '', 16, stfc, 1, this.point1, true, 1)
    app.ajouteObjetVisuel(ptdh)
    // On lui lie un point d'abscisse 1
    const ptld = new CPointLieDroite(listeVisuelle, null, false, bl, true, 0, 0, true, '', 16,
      MotifPoint.petitRond, false, false, 1, ptdh)
    app.ajouteObjetVisuel(ptld)
    // On mesure l'angle
    const ptmao = new CMesureAngleOriente(listeVisuelle, null, false, ptld, this.point1, this.point2, '')
    app.ajouteObjetVisuel(ptmao)
    app.listeObjetsVisuels.positionne(false, app.dimf)
    // On rajoute un point lié au cercle pointé par ptCercle
    // Son abscisse est son angle polaire en radians
    let ang = ptmao.rendValeur() * ConvDegRad
    if (ang < 0) ang = ang + 2 * Math.PI
    const ptPointLie = new CPointLieCercle(listeVisuelle, null, false, bl, true, 0, 0, false, '', 16,
      MotifPoint.petitRond, false, false, ang, this.ptCercle)
    app.ajouteObjetVisuel(ptPointLie)
    // On crée la mesure de l'angle orienté point2, point1, pointSouris
    this.ptMesureAngle = new CMesureAngleOriente(listeVisuelle, null, false, this.point2, this.point1, ptPointLie, '')
    app.ajouteObjetVisuel(this.ptMesureAngle)
    // On crée aussi la mesure de l'angle géométrique pour affichage sur le rapporteur
    const ptmesag = new CMesureAngleGeometrique(listeVisuelle, null, false, this.point2, this.point1, ptPointLie)
    app.ajouteObjetVisuel(ptmesag)
    // On crée une nouveau point écarté du rapporteur
    // Pour cela on crée une homothétie
    const ptHom2 = new CHomothetie(listeVisuelle, null, false, this.point1, new CValeur(listeVisuelle, 1.25))
    app.ajouteObjetVisuel(ptHom2)
    const ptimh = new CPointImage(listeVisuelle, null, false, bl, true, 0, 0, true, '', 16, MotifPoint.petitRond, false,
      ptPointLie, ptHom2)
    app.ajouteObjetVisuel(ptimh)
    // On crée l'image provisoire du point
    // D'abord une rotation
    const valang = new CValeurAngle(listeVisuelle, new CResultatValeur(listeVisuelle, this.ptMesureAngle))
    const doc = app.doc
    // On affiche la valeur liée au point précédent avec effacement de ce qu'il y a dessous
    const ptaff = new CValeurAffichee(listeVisuelle, null, false, Color.blue, 0, 0, 0, 0, false, ptimh, 16,
      StyleEncadrement.Sans, false, doc.couleurFond, CAffLiePt.alignHorCent,
      CAffLiePt.alignVerCent, ptmesag, '', '°', 0)
    app.ajouteObjetVisuel(ptaff)
    // L'arc de cercle
    // var ptArc = new CArcDeCercle(frame.cadreActif().listePr, null, false,
    //  frame.couleurActive(), false, frame.styleTraitActif(), point1, point2, null, valang);
    this.ajouteArcVisuel(valang)
    // On crée un segment pointillés (on ne sait pas si on est à l'intérieur
    // ou l'extérieur du rapporteur
    const ptseg1 = new CSegment(listeVisuelle, null, false, bl, false, stfp, this.point1, ptPointLie)
    app.ajouteObjetVisuel(ptseg1)
    app.afficheObjetVisuels(inddeb) // Ajout version 6.4.4
    // On passe la main à l'outil de désignation ad hoc
    app.outilPointageActif = app.outilPointageRapporteur
    app.outilPointageActif.reset()
    app.outilPointageRapporteur.associePointLie(ptPointLie)
  }
}

OutilArcParRapporteur.prototype.ajouteArcVisuel = function (valang) {
  const app = this.app
  app.ajouteObjetVisuel(new CArcDeCercle(app.listeVisuelle, null, false, app.getCouleur(), false, app.getStyleTrait(),
    this.point1, this.point2, null, valang))
}

OutilArcParRapporteur.prototype.creeObjet = function () {
  const app = this.app
  const liste = app.listePr
  const svg = app.svgFigure
  let valeurAngle = this.ptMesureAngle.rendValeur()
  const indiceImpInitial = liste.longueur()

  // On arrondit au degré près en degrés
  // Modifié version 5.1.1
  // if (liste.uniteAngle == UniteAngle.Radian) valeurAngle = valeurAngle*CValeurAngle.convRadDeg;
  if (liste.uniteAngle === uniteAngleRadian) valeurAngle = valeurAngle * ConvDegRad
  // Modifié version 7.3 pour optimisation
  // if (valeurAngle !== Math.floor(valeurAngle)) valeurAngle = Math.floor(valeurAngle + 0.5)
  valeurAngle = Math.round(valeurAngle)
  if (valeurAngle === -180) valeurAngle = 180
  const valang = new CValeurAngle(liste, valeurAngle)
  const ptArc = new CArcDeCercle(liste, null, false, app.getCouleur(), false, app.getStyleTrait(),
    this.point1, this.point2, null, valang)
  app.ajouteElement(ptArc)

  if (app.verifieDernierElement(1)) {
    this.saveFig()
    liste.afficheTout(indiceImpInitial, svg, true, app.doc.couleurFond)
  }
  this.deselect()
  this.select()
}

OutilArcParRapporteur.prototype.isWorking = function () {
  return (this.point1 !== null) && (this.point2 !== null)
}

OutilArcParRapporteur.prototype.isLineTool = function () {
  return true
}
