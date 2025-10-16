/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import StyleMarqueSegment from '../types/StyleMarqueSegment'
import Vect from '../types/Vect'
import CElementLigne from './CElementLigne'
import CSegment from './CSegment'
import CPointBase from './CPointBase'
export default CMarqueSegment

/**
 * Classe représentant une marque de segment.
 * @constructor
 * @extends CElementLigne
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de trait utilisé.
 * @param {StyleMarqueSegment} motif  Le motif de la marque.
 * @param {CSegment} segmentAssocie  Le segment sur lequel est tracée la marque.
 * @returns {CMarqueSegment}
 */
function CMarqueSegment (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, motif, segmentAssocie) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CElementLigne.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      true, 0, 0, masque, '', 16, style)
    this.motif = motif
    this.segmentAssocie = segmentAssocie
  }
  this.origine1 = new CPointBase()
  this.origine2 = new CPointBase()
  this.origine3 = new CPointBase()
  this.extremite1 = new CPointBase()
  this.extremite2 = new CPointBase()
  this.extremite3 = new CPointBase()
  this.segment1 = new CSegment(listeProprietaire, this.origine1, this.extremite1)
  this.segment2 = new CSegment(listeProprietaire, this.origine2, this.extremite2)
  this.segment3 = new CSegment(listeProprietaire, this.origine3, this.extremite3)
}
CMarqueSegment.prototype = new CElementLigne()
CMarqueSegment.prototype.constructor = CMarqueSegment
CMarqueSegment.prototype.superClass = 'CElementLigne'
CMarqueSegment.prototype.className = 'CMarqueSegment'

CMarqueSegment.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.segmentAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CMarqueSegment(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), this.motif, listeCible.get(ind1, 'CSegment'))
}
CMarqueSegment.prototype.setClone = function (ptel) {
  CElementLigne.prototype.setClone.call(this, ptel)
  this.origine1.placeEn(ptel.origine1)
  this.origine2.placeEn(ptel.origine2)
  this.origine3.placeEn(ptel.origine3)
  this.extremite1.placeEn(ptel.extremite1)
  this.extremite2.placeEn(ptel.extremite2)
  this.extremite3.placeEn(ptel.extremite3)
  /** Supprimé version mtgApp. Inutile
  this.segment1.donneStyle(ptel.style);
  this.segment2.donneStyle(ptel.style);
  this.segment3.donneStyle(ptel.style);
  this.segment1.donneCouleur(ptel.couleur);
  this.segment2.donneCouleur(ptel.couleur);
  this.segment3.donneCouleur(ptel.couleur);
  this.segment1.setClone(ptel.segment1);
  this.segment2.setClone(ptel.segment2);
  this.segment3.setClone(ptel.segment3);
   */
}
/**
 * Donne à ma marque le motif motif.
 * @param {StyleMarqueSegment} motif
 * @returns {void}
 */
CMarqueSegment.prototype.donneMotif = function (motif) {
  this.motif = motif
}
CMarqueSegment.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CElementLigne.prototype.depDe.call(this, p) || this.segmentAssocie.depDe(p))
}
CMarqueSegment.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.segmentAssocie.dependDePourBoucle(p)
}

CMarqueSegment.prototype.positionne = function (infoRandom, dimfen) {
  let xext1; let yext1; let xext2; let yext2; let k2; let k4; let k8; let w
  const list = this.listeProprietaire
  const coef = list.coefMult ? list.coefMult : 1
  if (!this.segmentAssocie.existe || this.segmentAssocie.horsFenetre) {
    this.existe = false
    return
  }
  this.segment1.donneStyle(this.style)
  this.segment2.donneStyle(this.style)
  this.segment3.donneStyle(this.style)
  this.segment1.donneCouleur(this.couleur)
  this.segment2.donneCouleur(this.couleur)
  this.segment3.donneCouleur(this.couleur)
  const xmil = (this.segmentAssocie.point1.x + this.segmentAssocie.point2.x) / 2
  const ymil = (this.segmentAssocie.point1.y + this.segmentAssocie.point2.y) / 2
  const u = new Vect(xmil, ymil, this.segmentAssocie.point2.x, this.segmentAssocie.point2.y)
  const nor = u.norme()
  u.x = u.x / nor
  u.y = u.y / nor
  const v = new Vect()
  u.tourne(Math.PI / 2, v)
  const k5 = 7 * coef
  v.x = v.x * k5
  v.y = v.y * k5
  switch (this.motif) {
    case StyleMarqueSegment.marqueSimple:
      xext1 = xmil + v.x
      yext1 = ymil + v.y
      xext2 = xmil - v.x
      yext2 = ymil - v.y
      this.origine1.placeEn(xext1, yext1)
      this.extremite1.placeEn(xext2, yext2)
      this.segment1.positionne(infoRandom, dimfen)
      this.segment2.existe = false
      this.segment3.existe = false
      break

    case StyleMarqueSegment.marqueDouble:
      k2 = 2 * coef
      xext1 = xmil + v.x + k2 * u.x // on rajoute 2 pixels par rapport au milieu
      yext1 = ymil + v.y + k2 * u.y
      xext2 = xmil - v.x + k2 * u.x
      yext2 = ymil - v.y + k2 * u.y
      this.origine1.placeEn(xext1, yext1)
      this.extremite1.placeEn(xext2, yext2)
      this.segment1.positionne(infoRandom, dimfen)
      xext1 = xmil + v.x - k2 * u.x // on retranche 3 pixels par rapport au milieu
      yext1 = ymil + v.y - k2 * u.y
      xext2 = xmil - v.x - k2 * u.x
      yext2 = ymil - v.y - k2 * u.y
      this.origine2.placeEn(xext1, yext1)
      this.extremite2.placeEn(xext2, yext2)
      this.segment2.positionne(infoRandom, dimfen)
      this.segment3.existe = false
      break

    case StyleMarqueSegment.marqueTriple:
      xext1 = xmil + v.x
      yext1 = ymil + v.y
      xext2 = xmil - v.x
      yext2 = ymil - v.y
      this.origine1.placeEn(xext1, yext1)
      this.extremite1.placeEn(xext2, yext2)
      this.segment1.positionne(infoRandom, dimfen)
      k4 = 4 * coef
      xext1 += k4 * u.x
      yext1 += k4 * u.y
      xext2 += k4 * u.x
      yext2 += k4 * u.y
      this.origine2.placeEn(xext1, yext1)
      this.extremite2.placeEn(xext2, yext2)
      this.segment2.positionne(infoRandom, dimfen)
      k8 = 8 * coef
      xext1 -= k8 * u.x
      yext1 -= k8 * u.y
      xext2 -= k8 * u.x
      yext2 -= k8 * u.y
      this.origine3.placeEn(xext1, yext1)
      this.extremite3.placeEn(xext2, yext2)
      this.segment3.positionne(infoRandom, dimfen)
      break

    case StyleMarqueSegment.marqueCroix:
      w = new Vect()
      u.tourne(Math.PI / 4, w)
      w.x *= k5
      w.y *= k5
      xext1 = xmil + w.x
      yext1 = ymil + w.y
      xext2 = xmil - w.x
      yext2 = ymil - w.y
      this.origine1.placeEn(xext1, yext1)
      this.extremite1.placeEn(xext2, yext2)
      this.segment1.positionne(infoRandom, dimfen)
      u.tourne(-Math.PI / 4, w)
      w.x *= k5
      w.y *= k5
      xext1 = xmil + w.x
      yext1 = ymil + w.y
      xext2 = xmil - w.x
      yext2 = ymil - w.y
      this.origine2.placeEn(xext1, yext1)
      this.extremite2.placeEn(xext2, yext2)
      this.segment2.positionne(infoRandom, dimfen)
      this.segment3.existe = false
      break
  }
  this.existe = true
}
CMarqueSegment.prototype.createg = function () {
  const g = cens('g')
  if (this.segment1.existe) g.appendChild(this.segment1.createg())
  if (this.segment2.existe) g.appendChild(this.segment2.createg())
  if (this.segment3.existe) g.appendChild(this.segment3.createg())
  // Ligne suivante modifiée version 6.5.2
  // g.setAttribute('pointer-events', 'none')
  g.setAttribute('pointer-events', this.pointerevents)
  return g
}
CMarqueSegment.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CMarqueSegment.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CMarqueSegment.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.motif === p.motif) && (this.segmentAssocie === p.segmentAssocie)
  } else return false
}
CMarqueSegment.prototype.getNature = function () {
  return NatObj.NMarqueSegment
}
CMarqueSegment.prototype.chaineDesignation = function () {
  return 'desMarqueSegment'
}
CMarqueSegment.prototype.read = function (inps, list) {
  CElementLigne.prototype.read.call(this, inps, list)
  this.motif = inps.readByte()
  const ind1 = inps.readInt()
  this.segmentAssocie = list.get(ind1, 'CSegment')
}
CMarqueSegment.prototype.write = function (oups, list) {
  CElementLigne.prototype.write.call(this, oups, list)
  oups.writeByte(this.motif)
  const ind1 = list.indexOf(this.segmentAssocie)
  oups.writeInt(ind1)
}
