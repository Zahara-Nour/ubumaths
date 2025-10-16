/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { distancePointPoint, zero } from '../kernel/kernel'
import CPointAncetrePointsMobiles from './CPointAncetrePointsMobiles'
export default CPointInterieurCercle

/**
 * Point interieur à un cercle.
 * @constructor
 * @extends CPointAncetrePointsMobiles
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Decalage horizontal du nom
 * @param {number} decY  Decalage vertical du nom
 * @param {boolean} masque  true si l'objet est masque
 * @param {string} nom  Le nom eventuel de l'objet
 * @param {number} tailleNom  Indice de la taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {boolean} fixed  true si le point est punaisé
 * @param {CCercle} cercleAssocie  le cercle auquel le point est intérieur
 * @param {number} rapportHomothetie  le quotient entre la distance au centre et le rayon
 * @param {number} anglePolaire  l'angle polaire avec l'horizontale
 * @returns {void}
 */
function CPointInterieurCercle (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom,
  tailleNom, motif, marquePourTrace, fixed,
  cercleAssocie, rapportHomothetie, anglePolaire) {
  if (arguments.length === 1) CPointAncetrePointsMobiles.call(this, listeProprietaire)
  else {
    CPointAncetrePointsMobiles.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed)
    this.cercleAssocie = cercleAssocie
    this.rapportHomothetie = rapportHomothetie
    this.anglePolaire = anglePolaire
  }
}
CPointInterieurCercle.prototype = new CPointAncetrePointsMobiles()
CPointInterieurCercle.prototype.constructor = CPointInterieurCercle
CPointInterieurCercle.prototype.superClass = 'CPointAncetrePointsMobiles'
CPointInterieurCercle.prototype.className = 'CPointInterieurCercle'

CPointInterieurCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.cercleAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointInterieurCercle(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, listeCible.get(ind1, 'CCercle'),
    this.rapportHomothetie, this.anglePolaire)
}

CPointInterieurCercle.prototype.getNature = function () {
  return NatObj.NPointInterieurCercle
}

CPointInterieurCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.cercleAssocie)
}

CPointInterieurCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPointAncetrePointsMobiles.prototype.depDe.call(this, p) || this.cercleAssocie.depDe(p))
}

CPointInterieurCercle.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.cercleAssocie.dependDePourBoucle(p)
}

CPointInterieurCercle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.cercleAssocie?.existe
  if (!this.existe) return
  if (this.rapportHomothetie === 0) CPointAncetrePointsMobiles.prototype.placeEn.call(this, this.cercleAssocie.centreX, this.cercleAssocie.centreY)
  else {
    const vec = new Vect()
    vec.x = this.rapportHomothetie * this.cercleAssocie.rayon
    vec.y = 0
    const vec2 = new Vect()
    vec.tourne(this.anglePolaire, vec2)
    CPointAncetrePointsMobiles.prototype.placeEn.call(this, this.cercleAssocie.centreX + vec2.x, this.cercleAssocie.centreY + vec2.y)
  }
  CPointAncetrePointsMobiles.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}

CPointInterieurCercle.prototype.placeEn = function (xn, yn) {
  CPointAncetrePointsMobiles.prototype.placeEn.call(this, xn, yn)
  const vec = new Vect(this.cercleAssocie.centreX, this.cercleAssocie.centreY, xn, yn)
  if (vec.nul()) {
    this.rapportHomothetie = 0
    this.anglePolaire = 0
  } else {
    this.anglePolaire = vec.angleRad()
    this.rapportHomothetie = vec.norme() / this.cercleAssocie.rayon
  }
}

CPointInterieurCercle.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  // On regarde si le point testé est bien intérieur au polygone
  if (distancePointPoint(xtest, ytest, this.cercleAssocie.centreX,
    this.cercleAssocie.centreY) <= this.cercleAssocie.rayon) {
    pointr.x = xtest
    pointr.y = ytest
    return true
  } else return false
}

CPointInterieurCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    if (zero(p.x - this.x) && zero(p.y - this.y)) return (this.cercleAssocie === p.cercleAssocie)
    else return false
  } else return false
}

CPointInterieurCercle.prototype.read = function (inps, list) {
  CPointAncetrePointsMobiles.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.cercleAssocie = list.get(ind1, 'CCercle')
  this.rapportHomothetie = inps.readDouble()
  this.anglePolaire = inps.readDouble()
}

CPointInterieurCercle.prototype.write = function (oups, list) {
  CPointAncetrePointsMobiles.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.cercleAssocie)
  oups.writeInt(ind1)
  oups.writeDouble(this.rapportHomothetie)
  oups.writeDouble(this.anglePolaire)
}
