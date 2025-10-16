/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { distancePointPoint } from '../kernel/kernel'
import CSurface from './CSurface'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
export default CSurfaceLieuDeuxPoints

/**
 * Classe représentant une surface délimitée par un lieu de points et deux points.
 * Utile pour représenter graphiquement des intégrales.
 * Les points sont reliés à chaque extrémité du lieu (qui ne doit pas être fermé) et reliés entre eux.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CLieuDeBase} bord  Le lieu de points bord de la surface.
 * @param {CPt} point1  Le premier point définissant le bord.
 * @param {CPt} point2  Le deuxième point définissant le bord.
 * @returns {CSurfaceLieuDeuxPoints}
 */
function CSurfaceLieuDeuxPoints (listeProprietaire, impProto, estElementFinal, couleur, masque,
  styleRemplissage, bord, point1, point2) {
  if (arguments.length === 1) {
    CSurface.call(this, listeProprietaire)
    this.pointDebutLieu = new CPointBase()
    this.pointFinLieu = new CPointBase()
    /* Modifié version MtgApp
    this.segmentDebut = new CSegment();
    this.segmentFin = new CSegment();
    this.segmentDroite = new CSegment();
     */
    this.segmentDebut = new CSegment(listeProprietaire, null, null)
    this.segmentFin = new CSegment(listeProprietaire, null, null)
    this.segmentDroite = new CSegment(listeProprietaire, null, null)
  } else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, styleRemplissage, bord)
    this.point1 = point1
    this.point2 = point2
    this.abscisses = new Array(bord.infoLieu.nombreDePoints + 3)
    this.ordonnees = new Array(bord.infoLieu.nombreDePoints + 3)
    this.pointDebutLieu = new CPointBase()
    this.pointFinLieu = new CPointBase()
    this.segmentDebut = new CSegment(listeProprietaire, this.pointDebutLieu, point1)
    this.segmentFin = new CSegment(listeProprietaire, point2, this.pointFinLieu)
    this.segmentDroite = new CSegment(listeProprietaire, point1, point2)
  }
}
CSurfaceLieuDeuxPoints.prototype = new CSurface()
CSurfaceLieuDeuxPoints.prototype.constructor = CSurfaceLieuDeuxPoints
CSurfaceLieuDeuxPoints.prototype.superClass = 'CSurface'
CSurfaceLieuDeuxPoints.prototype.className = 'CSurfaceLieuDeuxPoints'

CSurfaceLieuDeuxPoints.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.point1)
  const ind3 = listeSource.indexOf(this.point2)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CSurfaceLieuDeuxPoints(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CLieuDeBase'),
    listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'))
}
CSurfaceLieuDeuxPoints.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  if (ptel.existe) {
    this.nombrePointsLigne = ptel.nombrePointsLigne
    const nbPointsADecaler = this.nombrePointsLigne + 2
    for (let i = 0; i < nbPointsADecaler; i++) {
      this.abscisses[i] = ptel.abscisses[i]
      this.ordonnees[i] = ptel.ordonnees[i]
    }
  }
}
CSurfaceLieuDeuxPoints.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
  liste.add(this.point1)
  liste.add(this.point2)
}
CSurfaceLieuDeuxPoints.prototype.confonduAvec = function (p) {
  const res = CSurface.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return (this.point1 === p.point1) && (this.point2 === p.point2)
}
CSurfaceLieuDeuxPoints.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSurface.prototype.depDe.call(this, p) ||
    this.point1.depDe(p) || this.point2.depDe(p))
}
CSurfaceLieuDeuxPoints.prototype.dependDePourBoucle = function (p) {
  return CSurface.prototype.dependDePourBoucle.call(this, p) || this.point1.dependDePourBoucle(p) || this.point2.dependDePourBoucle(p)
}
CSurfaceLieuDeuxPoints.prototype.dependDePourCapture = function (p) {
  return CSurface.prototype.dependDePourCapture.call(this, p) ||
    this.point1.dependDePourCapture(p) || this.point2.dependDePourCapture(p)
}
CSurfaceLieuDeuxPoints.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.bord?.existe && this.point1?.existe && this.point2?.existe
  if (!this.existe) return
  const nbLignes = this.bord.nombreLignes
  // On recopie les coordonnées des points du lieu
  let i = 0
  for (let k = 0; k < nbLignes; k++) {
    const ideb = this.bord.infoLignes[k].indicePremierPoint
    for (let j = 0; j < this.bord.infoLignes[k].nombrePoints; j++) {
      const ind = ideb + j
      this.abscisses[i] = this.bord.absPoints[ind]
      this.ordonnees[i] = this.bord.ordPoints[ind]
      i++
    }
  }
  this.nombrePointsLigne = i
  this.x1 = this.abscisses[0]
  this.y1 = this.ordonnees[0]
  const x4 = this.abscisses[this.nombrePointsLigne - 1]
  const y4 = this.ordonnees[this.nombrePointsLigne - 1]
  this.pointDebutLieu.placeEn(this.x1, this.y1)
  this.pointFinLieu.placeEn(x4, y4)
  this.x2 = this.point1.x
  this.y2 = this.point1.y
  this.x3 = this.point2.x
  this.y3 = this.point2.y
  // Dans la mesure du posible, on s'arrange pour que le lieu soit
  // convexe
  if ((distancePointPoint(this.x1, this.y1, this.x3, this.y3) < distancePointPoint(this.x1, this.y1, this.x2, this.y2)) &&
    (distancePointPoint(x4, y4, this.x2, this.y2) < distancePointPoint(x4, y4, this.x3, this.y3))) {
    const xaux = this.x3
    const yaux = this.y3
    this.x3 = this.x2
    this.y3 = this.y2
    this.x2 = xaux
    this.y2 = yaux
    this.segmentDebut.point2 = this.point2
    this.segmentFin.point1 = this.point1
  } else {
    this.segmentDebut.point2 = this.point1
    this.segmentFin.point1 = this.point2
  }
  this.abscisses[this.nombrePointsLigne] = this.x3
  this.ordonnees[this.nombrePointsLigne] = this.y3
  this.abscisses[this.nombrePointsLigne + 1] = this.x2
  this.ordonnees[this.nombrePointsLigne + 1] = this.y2
  this.segmentDebut.positionne(infoRandom, dimfen)
  this.segmentDroite.positionne(infoRandom, dimfen)
  this.segmentFin.positionne(infoRandom, dimfen)
  this.existe = (this.segmentDebut.existe) && (this.segmentDroite.existe) && (this.segmentFin.existe)
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CSurfaceLieuDeuxPoints.prototype.creePoints = function () {
  let j; let points = ''
  for (j = 0; j < this.nombrePointsLigne + 2; j++) {
    points = points + this.abscisses[j] + ','
    points = points + this.ordonnees[j] + ' '
  }
  return points
}
CSurfaceLieuDeuxPoints.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
  this.segmentDebut.point1 = this.pointDebutLieu
  this.segmentDebut.point2 = this.point1
  this.segmentFin.point1 = this.point2
  this.segmentFin.point2 = this.pointFinLieu
  this.segmentDroite.point1 = this.point1
  this.segmentDroite.point2 = this.point2
  if (list.className !== 'CPrototype') {
    this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 2)
    this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 2)
  }
}
CSurfaceLieuDeuxPoints.prototype.write = function (oups, list) {
  CSurface.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
}
