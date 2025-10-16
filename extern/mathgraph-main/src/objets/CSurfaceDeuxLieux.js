/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurface from './CSurface'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
export default CSurfaceDeuxLieux

/**
 * Classe représentant une surface délimitée par deux mieux de points.
 * @constructor
 * @extends CSurface
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleRemplissage} styleRemplissage  Entier donnant le style de remplissage.
 * @param {CElementGraphique} bord  Le premier bord de la surface (lieu de points).
 * @param {CLieuDeBase} deuxiemeLieu  Le deuxième bord (lieu de points).
 * @returns {CSurfaceDeuxLieux}
 */
function CSurfaceDeuxLieux (listeProprietaire, impProto, estElementFinal, couleur, masque, styleRemplissage,
  bord, deuxiemeLieu) {
  if (arguments.length === 1) CSurface.call(this, listeProprietaire)
  else {
    CSurface.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, styleRemplissage, bord)
    this.deuxiemeLieu = deuxiemeLieu
    this.abscisses = new Array(bord.infoLieu.nombreDePoints + 4)
    this.ordonnees = new Array(bord.infoLieu.nombreDePoints + 4)
  }
  this.pointDebutLieu1 = new CPointBase()
  this.pointDebutLieu2 = new CPointBase()
  this.pointFinLieu1 = new CPointBase()
  this.pointFinLieu2 = new CPointBase()
  this.segmentDebut = new CSegment(listeProprietaire, this.pointDebutLieu1, this.pointDebutLieu2)
  this.segmentFin = new CSegment(listeProprietaire, this.pointFinLieu1, this.pointFinLieu2)
}
CSurfaceDeuxLieux.prototype = new CSurface()
CSurfaceDeuxLieux.prototype.constructor = CSurfaceDeuxLieux
CSurfaceDeuxLieux.prototype.superClass = 'CSurface'
CSurfaceDeuxLieux.prototype.className = 'CSurfaceDeuxLieux'

CSurfaceDeuxLieux.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.bord)
  const ind2 = listeSource.indexOf(this.deuxiemeLieu)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CSurfaceDeuxLieux(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.styleRemplissage,
    listeCible.get(ind1, 'CLieuDeBase'), listeCible.get(ind2, 'CLieuDeBase'))
}
CSurfaceDeuxLieux.prototype.setClone = function (ptel) {
  CSurface.prototype.setClone.call(this, ptel)
  if (ptel.existe) {
    this.nombrePointsTraces = ptel.nombrePointsTraces
    for (let i = 0; i < this.nombrePointsTraces; i++) {
      this.abscisses[i] = ptel.abscisses[i]
      this.ordonnees[i] = ptel.ordonnees[i]
    }
  }
}
CSurfaceDeuxLieux.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.bord)
  liste.add(this.deuxiemeLieu)
}
CSurfaceDeuxLieux.prototype.confonduAvec = function (p) {
  const res = CSurface.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return this.deuxiemeLieu === p.deuxiemeLieu
}
CSurfaceDeuxLieux.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSurface.prototype.depDe.call(this, p) || this.deuxiemeLieu.depDe(p))
}
CSurfaceDeuxLieux.prototype.dependDePourBoucle = function (p) {
  return CSurface.prototype.dependDePourBoucle.call(this, p) || this.deuxiemeLieu.dependDePourBoucle(p)
}
CSurfaceDeuxLieux.prototype.dependDePourCapture = function (p) {
  return CSurface.prototype.dependDePourCapture.call(this, p) || this.deuxiemeLieu.dependDePourCapture(p)
}
CSurfaceDeuxLieux.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.bord?.existe && this.deuxiemeLieu?.existe
  if (!this.existe) return
  const nbLignesPremierLieu = this.bord.nombreLignes
  const nbLignesDeuxiemeLieu = this.deuxiemeLieu.nombreLignes
  const indicePremierPointLieu1 = this.bord.infoLignes[0].indicePremierPoint
  const indiceDernierPointLieu1 = this.bord.infoLignes[nbLignesPremierLieu - 1].indicePremierPoint +
      this.bord.infoLignes[nbLignesPremierLieu - 1].nombrePoints - 1
  const indicePremierPointLieu2 = this.deuxiemeLieu.infoLignes[0].indicePremierPoint
  const indiceDernierPointLieu2 = this.deuxiemeLieu.infoLignes[nbLignesDeuxiemeLieu - 1].indicePremierPoint +
      this.deuxiemeLieu.infoLignes[nbLignesDeuxiemeLieu - 1].nombrePoints - 1
  const x1 = this.bord.absPoints[indicePremierPointLieu1]
  const y1 = this.bord.ordPoints[indicePremierPointLieu1]
  const x4 = this.bord.absPoints[indiceDernierPointLieu1]
  const y4 = this.bord.ordPoints[indiceDernierPointLieu1]
  const x3 = this.deuxiemeLieu.absPoints[indiceDernierPointLieu2]
  const y3 = this.deuxiemeLieu.ordPoints[indiceDernierPointLieu2]
  const x2 = this.deuxiemeLieu.absPoints[indicePremierPointLieu2]
  const y2 = this.deuxiemeLieu.ordPoints[indicePremierPointLieu2]
  this.pointDebutLieu1.placeEn(x1, y1)
  this.pointFinLieu2.placeEn(x4, y4)
  // On recopie les coordonnées du premier lieu
  let i = 0
  for (let k = 0; k < nbLignesPremierLieu; k++) {
    const ideb = this.bord.infoLignes[k].indicePremierPoint
    for (let j = 0; j < this.bord.infoLignes[k].nombrePoints; j++) {
      const ind = ideb + j
      this.abscisses[i] = this.bord.absPoints[ind]
      this.ordonnees[i] = this.bord.ordPoints[ind]
      i++
    }
  }
  for (let k = nbLignesDeuxiemeLieu - 1; k >= 0; k--) {
    const deb = this.deuxiemeLieu.infoLignes[k].indicePremierPoint
    const nbPtsLieu2 = this.deuxiemeLieu.infoLignes[k].nombrePoints
    for (let j = 0; j < nbPtsLieu2; j++) {
      const ind = deb + nbPtsLieu2 - j - 1
      this.abscisses[i] = this.deuxiemeLieu.absPoints[ind]
      this.ordonnees[i] = this.deuxiemeLieu.ordPoints[ind]
      i++
    }
  }
  this.nombrePointsTraces = i
  this.pointDebutLieu2.placeEn(x2, y2)
  this.pointFinLieu1.placeEn(x3, y3)
  this.segmentDebut.positionne(infoRandom, dimfen)
  this.segmentFin.positionne(infoRandom, dimfen)
  this.existe = (this.segmentDebut.existe) && (this.segmentFin.existe)
}
/**
 * Fonction renvoyant une chaîne de caractères utilisée dans le svg élément
 * représentant la surface.
 * @returns {string}
 */
CSurfaceDeuxLieux.prototype.creePoints = function () {
  let j; let points = ''
  for (j = 0; j < this.nombrePointsTraces; j++) {
    points = points + this.abscisses[j] + ','
    points = points + this.ordonnees[j] + ' '
  }
  return points
}
CSurfaceDeuxLieux.prototype.read = function (inps, list) {
  CSurface.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.deuxiemeLieu = list.get(ind1, 'CLieuDeBase')
  if (list.className !== 'CPrototype') {
    this.abscisses = new Array(this.bord.infoLieu.nombreDePoints + this.deuxiemeLieu.infoLieu.nombreDePoints + 2)
    this.ordonnees = new Array(this.bord.infoLieu.nombreDePoints + this.deuxiemeLieu.infoLieu.nombreDePoints + 2)
  }
}
CSurfaceDeuxLieux.prototype.write = function (oups, list) {
  CSurface.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.deuxiemeLieu)
  oups.writeInt(ind1)
}
