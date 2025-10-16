/*
 * Created by yvesb on 11/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ConvDegRad, getStr, uniteAngleRadian } from '../kernel/kernel'
import StyleTrait from '../types/StyleTrait'
import CValeurAngle from '../objets/CValeurAngle'
import CValeur from '../objets/CValeur'
import CCalcul from '../objets/CCalcul'
import CRotation from '../objets/CRotation'
import OutilPar2Pts from './OutilPar2Pts'
import Color from '../types/Color'
import CSegment from '../objets/CSegment'
import CPointImage from '../objets/CPointImage'
import CDemiDroiteOA from '../objets/CDemiDroiteOA'
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
import CImplementationProto from '../objets/CImplementationProto'
import { defaultSurfOpacity } from '../objets/CMathGraphDoc'

export default OutilRapporteur

/**
 * Outil servant à créer l'image d'un objet par une rotation en utilisant un rapporteur visuel
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilRapporteur (app, toolName, toolIndex) {
  if (arguments.length === 1) OutilPar2Pts.call(this, app, 'Rapporteur', 33085, true)
  else OutilPar2Pts.call(this, app, toolName, toolIndex, true) // Pour l'appel par OutilArcParRapporteur
}

OutilRapporteur.prototype = new OutilPar2Pts()

OutilRapporteur.prototype.traiteObjetDesigne = function (elg, point) {
  const app = this.app
  if (this.point1 === null) {
    this.point1 = elg
    this.ajouteObjetsVisuels()
    this.excluDeDesignation(this.point1)
    this.ajouteClignotementDe(this.point1)
    this.resetClignotement()
    app.indication('Rap2')
    // app.indication(chaineIndication(2)); A revoir mtgApp
  } else {
    // if (this.point2 == null) { // Modification car sur les périphériques mobiles au relachement du doigt on traite un objet proche du pointeur
    if ((this.point2 === null) && (elg !== this.point1)) {
      // Ajout version 5.0
      this.point2 = elg
      this.ajouteObjetsVisuels()
      this.annuleClignotement()
      app.indication('Rap3')
    }
  }
}

OutilRapporteur.prototype.ajouteObjetsVisuels = function () {
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
    const ptrot = new CRotation(listeVisuelle, null, false, this.point1, valang)
    app.ajouteObjetVisuel(ptrot)
    const doc = app.doc
    // L'image qui est masquée
    const ptimrot = new CPointImage(listeVisuelle, null, false, app.getCouleur(), true, 0, 0, true, '', 16,
      MotifPoint.petitRond, false, this.point2, ptrot)
    app.ajouteObjetVisuel(ptimrot)
    // On crée un segment ne pointillés loignant les deux points cliqués
    const seg1 = new CSegment(listeVisuelle, null, false, bl, false, stfp, this.point1, this.point2)
    app.ajouteObjetVisuel(seg1)
    // On crée une demi-droite en pointillés (on ne sait pas si on est à l'intérieur
    // ou l'extérieur du rapporteur
    const dd = new CDemiDroiteOA(listeVisuelle, null, false, bl, false, stfp, this.point1, ptPointLie)
    app.ajouteObjetVisuel(dd)
    // On affiche la valeur liée au point précédent avec effacement de ce qu'il y a dessous
    const ptaff = new CValeurAffichee(listeVisuelle, null, false, Color.blue, 0, 0, 0, 0, false, ptimh, 16,
      StyleEncadrement.Sans, true, doc.couleurFond, CAffLiePt.alignHorCent,
      CAffLiePt.alignVerCent, ptmesag, '', '°', 0)
    app.ajouteObjetVisuel(ptaff)
    app.afficheObjetVisuels(inddeb) // Ajout version 6.4.4
    // On passe la main à l'outil de désignation ad hoc
    app.outilPointageActif = app.outilPointageRapporteur
    app.outilPointageActif.reset()
    app.outilPointageRapporteur.associePointLie(ptPointLie)
  }
}

OutilRapporteur.prototype.creeObjet = function () {
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
  const calc = new CCalcul(liste, null, false, liste.genereNomPourCalcul('ang', true), String(valeurAngle))
  app.ajouteElement(calc)
  const seg1 = new CSegment(liste, null, false, app.getCouleur(), false, app.getStyleTrait(), this.point1, this.point2)
  app.ajouteElement(seg1)
  app.verifieDernierElement(1) // Pour ne pas créer le segment s'il est déjà créé
  //
  const proto = app.docCons.getPrototype('AffAngle')
  this.annuleClignotement()
  proto.get(0).elementAssocie = calc
  proto.get(1).elementAssocie = this.point2
  proto.get(2).elementAssocie = this.point1
  const impProto = new CImplementationProto(liste, proto)
  impProto.implemente(this.app.dimf, proto)
  impProto.nomProto = getStr('Rapporteur')
  const ind = liste.longueur() - 1
  const aff = liste.get(ind) // L'affichage de la mesure
  aff.donneCouleur(app.getCouleur())
  aff.couleurFond = app.doc.couleurFond
  aff.taillePolice = 14
  const marque = liste.get(ind - 1)
  const color = app.getCouleur()
  color.opacity = defaultSurfOpacity
  marque.donneCouleur(color)
  marque.donneStyle(StyleTrait.stfc())
  marque.donneStyleMarque(app.getStyleMarqueAngle())
  const dd = liste.get(ind - 2) // La demi-droite
  dd.donneCouleur(app.getCouleur())
  dd.donneStyle(app.getStyleTrait())

  this.saveFig()
  // Corrigé version 5.6.4
  if (app.estExercice) app.listePourConst = app.listePourConstruction()

  liste.afficheTout(indiceImpInitial, svg, true, app.doc.couleurFond)
  this.deselect()
  this.select()
}

OutilRapporteur.prototype.activationValide = function () {
  return this.app.listePr.uniteAngle !== uniteAngleRadian
}

OutilRapporteur.prototype.isReadyForTouchEnd = function () {
  return (this.point1 !== null) && (this.point2 !== null)
}

OutilRapporteur.prototype.isWorking = function () {
  return (this.point2 !== null)
}

OutilRapporteur.prototype.isLineTool = function () {
  return true
}

OutilRapporteur.prototype.isAngleTool = function () {
  return true
}
