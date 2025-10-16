/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatArc from '../types/NatArc'
import Vect from '../types/Vect'
import { zeroAngle } from '../kernel/kernel'
import CPointLie from './CPointLie'
export default CPointLieCercle

/**
 * Point lié à un cercle (ou un arc de cercle).
 * @constructor
 * @extends CPointLie
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
 * @param {boolean} fixed  true si punaisé
 * @param {number} abscisse
 * @param {CCercle} cercleLie  Le cercle ou arc de cercle auquel le point est lié
 * @returns {void}
 */
function CPointLieCercle (listeProprietaire, impProto, estElementFinal,
  couleur, nomMasque, decX, decY, masque, nom,
  tailleNom, motif, marquePourTrace, fixed, abscisse, cercleLie) {
  if (arguments.length === 1) CPointLie.call(this, listeProprietaire)
  else {
    CPointLie.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace, fixed, abscisse)
    this.cercleLie = cercleLie
  }
}
CPointLieCercle.prototype = new CPointLie()
CPointLieCercle.prototype.constructor = CPointLieCercle
CPointLieCercle.prototype.superClass = 'CPointLie'
CPointLieCercle.prototype.className = 'CPointLieCercle'

CPointLieCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.cercleLie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPointLieCercle(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, this.fixed, this.abscisse, listeCible.get(ind1, 'CCercle'))
}

CPointLieCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.cercleLie)
}

CPointLieCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPointLie.prototype.depDe.call(this, p) || this.cercleLie.depDe(p))
}

CPointLieCercle.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.cercleLie.dependDePourBoucle(p)
}

CPointLieCercle.prototype.positionne = function (infoRandom, dimfen) {
  let angrot, w
  const u = new Vect()
  const v = new Vect()

  this.existe = this.cercleLie.existe
  if (!this.existe) return
  switch (this.cercleLie.natureArc()) {
    case NatArc.PetitArc :
      u.setVecteur(this.cercleLie.centreX, this.cercleLie.centreY, this.cercleLie.origine_x, this.cercleLie.origine_y)
      angrot = this.cercleLie.valeurAngleAuCentre
      u.tourne(this.abscisse * angrot, v)
      break
    case NatArc.GrandArc :
      u.setVecteur(this.cercleLie.centreX, this.cercleLie.centreY, this.cercleLie.origine_x, this.cercleLie.origine_y)
      angrot = this.cercleLie.valeurAngleAuCentre
      if (zeroAngle(Math.abs(angrot) - Math.PI) || (angrot >= 0)) { u.tourne(-this.abscisse * (2 * Math.PI - Math.abs(angrot)), v) } else u.tourne(this.abscisse * (2 * Math.PI - Math.abs(angrot)), v)
      break
    case NatArc.ArcDirect :
      u.setVecteur(this.cercleLie.centreX, this.cercleLie.centreY, this.cercleLie.origine_x, this.cercleLie.origine_y)
      angrot = this.cercleLie.valeurAngleAuCentre
      if (angrot < 0) angrot = angrot + 2 * Math.PI
      u.tourne(this.abscisse * angrot, v)
      break
    case NatArc.ArcIndirect :
      u.setVecteur(this.cercleLie.centreX, this.cercleLie.centreY, this.cercleLie.origine_x, this.cercleLie.origine_y)
      angrot = this.cercleLie.valeurAngleAuCentre
      w = new Vect()
      u.tourne(angrot, w)
      angrot = -angrot
      if (angrot < 0) angrot = angrot + 2 * Math.PI
      w.tourne(this.abscisse * angrot, v)
      break
    case NatArc.ArcCercle :
    default :
      u.x = this.cercleLie.rayon
      u.y = 0
      u.tourne(this.abscisse, v)
  }
  const xn = this.cercleLie.centreX + v.x
  const yn = this.cercleLie.centreY + v.y
  if (this.cercleLie.surArc(xn, yn)) {
    this.existe = true
    CPointLie.prototype.placeEn.call(this, xn, yn)
    CPointLie.prototype.positionne.call(this, infoRandom, dimfen)
  } else this.existe = false
}

CPointLieCercle.prototype.testDeplacement = function (dimfen, xtest, ytest, pointr, abscr) {
  let valable

  const u = new Vect(this.cercleLie.centreX, this.cercleLie.centreY, xtest, ytest)
  const v = new Vect()
  u.vecteurColineaire(this.cercleLie.rayon, v)
  if (!u.nul() && this.cercleLie.surArc(xtest, ytest)) {
    pointr.x = this.cercleLie.centreX + v.x
    pointr.y = this.cercleLie.centreY + v.y
    valable = dimfen.dansFenetre(pointr.x, pointr.y)
    // Si c'est un arc de cercle, il s'agira d'une abscisse curviligne
    // comprise entre 0 et 1
    const ang = v.angleRad()
    abscr.setValue(this.cercleLie.abscisseCurviligne(ang))
  } else valable = false
  return valable
}

CPointLieCercle.prototype.abscisseMinimale = function () {
  return this.cercleLie.abscisseMinimale()
}

CPointLieCercle.prototype.abscisseMaximale = function () {
  return this.cercleLie.abscisseMaximale()
}

CPointLieCercle.prototype.confonduAvec = function (p) {
  const res = CPointLie.prototype.confonduAvec.call(this, p)
  if (!res) return false
  return (this.cercleLie === p.cercleLie)
}
CPointLieCercle.prototype.lieALigneFermee = function () {
  return (this.cercleLie.abscisseMinimale() === 0) && (this.cercleLie.abscisseMaximale() === 2 * Math.PI)
}

CPointLieCercle.prototype.read = function (inps, list) {
  CPointLie.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.cercleLie = list.get(ind1, 'CCercle')
}

CPointLieCercle.prototype.write = function (oups, list) {
  CPointLie.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.cercleLie)
  oups.writeInt(ind1)
}
