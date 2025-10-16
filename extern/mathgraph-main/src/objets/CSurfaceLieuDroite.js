/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurface from './CSurface'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
import { projetteOrtho } from 'src/kernel/kernelVect'

export default CSurfaceLieuDroite

/**
 * Classe repésentant une surface délimitée par un lieu de points (non fermé)
 * et une droite. Les extrémités du lieu sotn projetés orthogonalement sur l'axe
 * des abscisses pour délimiter le bord.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CLieuDeBase} bord  Le lieu de points bord de la surface.
 * @param {CDroite} droiteAssociee  La droite sur laquelle on projette les extrémités du lieu.
 * @returns {CSurfaceLieuDroite}
 */
function CSurfaceLieuDroite (listeProprietaire, impProto, estElementFinal, couleur, masque,
  styleRemplissage, bord, droiteAssociee) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, styleRemplissage, bord)
    this.droiteAssociee = droiteAssociee
    this.abscisses = new Array(bord.infoLieu.nombreDePoints + 4)
    this.ordonnees = new Array(bord.infoLieu.nombreDePoints + 4)
  }
  this.pointDebut = new CPointBase()
  this.pointProjeteDebut = new CPointBase()
  this.pointFin = new CPointBase()
  this.pointProjeteFin = new CPointBase()
  this.segmentDebut = new CSegment(listeProprietaire, this.pointDebut, this.pointProjeteDebut)
  this.segmentFin = new CSegment(listeProprietaire, this.pointFin, this.pointProjeteFin)
  this.segmentDroite = new CSegment(listeProprietaire, this.pointProjeteDebut, this.pointProjeteFin)
  this.point2 = { x: 0, y: 0 }
  this.point3 = { x: 0, y: 0 }
  // On crée les tableaux devant recevoir les coordonnées. Le + 3 est du aux deux points projetés
  // sur la droite
}
CSurfaceLieuDroite.prototype = new CSurface()
CSurfaceLieuDroite.prototype.constructor = CSurfaceLieuDroite
CSurfaceLieuDroite.prototype.superClass = 'CSurface'
CSurfaceLieuDroite.prototype.className = 'CSurfaceLieuDroite'

CSurfaceLieuDroite.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.droiteAssociee)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CSurfaceLieuDroite(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CLieuDeBase'),
    listeCible.get(ind2, 'CDroite'))
}
CSurfaceLieuDroite.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.droiteAssociee)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CSurfaceLieuDroite(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage, listeCible.get(ind1, 'CLieuDeBase'),
    listeCible.get(ind2, 'CDroite'))
}
CSurfaceLieuDroite.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  if (ptel.existe) {
    this.nbPointsLigne = ptel.nbPointsLigne
    const nbPointsADecaler = this.nbPointsLigne + 3
    for (let i = 0; i < nbPointsADecaler; i++) {
      this.abscisses[i] = ptel.abscisses[i]
      this.ordonnees[i] = ptel.ordonnees[i]
    }
  }
}
CSurfaceLieuDroite.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
  liste.add(this.droiteAssociee)
}
CSurfaceLieuDroite.prototype.confonduAvec = function (p) {
  const res = CSurface.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return this.droiteAssociee === p.droiteAssociee
}
CSurfaceLieuDroite.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSurface.prototype.depDe.call(this, p) || this.droiteAssociee.depDe(p))
}
CSurfaceLieuDroite.prototype.dependDePourBoucle = function (p) {
  return CSurface.prototype.dependDePourBoucle.call(this, p) || this.droiteAssociee.dependDePourBoucle(p)
}
CSurfaceLieuDroite.prototype.dependDePourCapture = function (p) {
  return CSurface.prototype.dependDePourCapture.call(this, p) || this.droiteAssociee.dependDePourCapture(p)
}
CSurfaceLieuDroite.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = (this.bord.existe) && (this.droiteAssociee.existe)
  if (!this.existe) return
  // On recopie les coordonnées des points du bord
  let i = 0
  for (let k = 0; k < this.bord.nombreLignes; k++) {
    const ideb = this.bord.infoLignes[k].indicePremierPoint
    for (let j = 0; j < this.bord.infoLignes[k].nombrePoints; j++) {
      const ind = ideb + j
      this.abscisses[i] = this.bord.absPoints[ind]
      this.ordonnees[i] = this.bord.ordPoints[ind]
      i++
    }
  }
  this.nbPointsLigne = i
  const x1 = this.abscisses[0]
  const y1 = this.ordonnees[0]
  projetteOrtho(x1, y1, this.droiteAssociee.point_x, this.droiteAssociee.point_y,
    this.droiteAssociee.vect, this.point2)
  const x4 = this.abscisses[this.nbPointsLigne - 1]
  const y4 = this.ordonnees[this.nbPointsLigne - 1]
  projetteOrtho(x4, y4, this.droiteAssociee.point_x, this.droiteAssociee.point_y,
    this.droiteAssociee.vect, this.point3)
  this.pointDebut.placeEn(x1, y1)
  this.pointProjeteDebut.placeEn(this.point2.x, this.point2.y)
  this.pointFin.placeEn(x4, y4)
  this.pointProjeteFin.placeEn(this.point3.x, this.point3.y)
  this.abscisses[this.nbPointsLigne] = this.point3.x
  this.ordonnees[this.nbPointsLigne] = this.point3.y
  this.abscisses[this.nbPointsLigne + 1] = this.point2.x
  this.ordonnees[this.nbPointsLigne + 1] = this.point2.y
  this.abscisses[this.nbPointsLigne + 2] = x1
  this.ordonnees[this.nbPointsLigne + 2] = y1
  this.segmentDebut.positionne(infoRandom, dimfen)
  this.segmentDroite.positionne(infoRandom, dimfen)
  this.segmentFin.positionne(infoRandom, dimfen)
  this.existe = (this.segmentDebut.existe) & (this.segmentDroite.existe) && (this.segmentFin.existe)
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CSurfaceLieuDroite.prototype.creePoints = function () {
  let j; let points = ''
  for (j = 0; j < this.nbPointsLigne + 3; j++) {
    points = points + this.abscisses[j] + ','
    points = points + this.ordonnees[j] + ' '
  }
  return points
}
CSurfaceLieuDroite.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.droiteAssociee = list.get(ind1, 'CDroite')
  // On crée les tableaux devant recevoir les coordonnées. Le + 4 est du aux deux points projetés
  // sur la droite et au cas d'un lieu fermé
  this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + 4)
  this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + 4)
}
CSurfaceLieuDroite.prototype.write = function (oups, list) {
  CSurface.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.droiteAssociee)
  oups.writeInt(ind1)
}
