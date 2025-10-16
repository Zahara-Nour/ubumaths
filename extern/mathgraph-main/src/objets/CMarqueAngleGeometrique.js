/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import StyleMarqueSegment from '../types/StyleMarqueSegment'
import Vect from '../types/Vect'
import { testAngleDroit, zeroAngle } from '../kernel/kernel'
import CMarqueAngleAncetre from './CMarqueAngleAncetre'
import StyleMarqueAngle from '../types/StyleMarqueAngle'
import CValDyn from '../objets/CValDyn'
export default CMarqueAngleGeometrique

/**
 * Classe représentant une marque d'angle non orienté.
 * @constructor
 * @extends CMarqueAngleAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Donne le style trait utilisé.
 * @param {StyleMarqueAngle} styleMarque  Donne le style de la marque.
 * @param {number} rayon  Le rayon de l'arc.
 * @param {CPt} a  Le premier point
 * @param {CPt} o  Le point sommet de l'angle définissant l'arc.
 * @param {CPt} b  Le troisième point.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMarqueAngleGeometrique}
 */
function CMarqueAngleGeometrique (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, styleMarque, rayon, a, o, b, fixed = false) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CMarqueAngleAncetre.call(this, listeProprietaire)
  else {
    CMarqueAngleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, styleMarque, rayon, false)
    this.a = a
    this.o = o
    this.b = b
  }
}
CMarqueAngleGeometrique.prototype = new CMarqueAngleAncetre()
CMarqueAngleGeometrique.prototype.constructor = CMarqueAngleGeometrique
CMarqueAngleGeometrique.prototype.superClass = 'CMarqueAngleAncetre'
CMarqueAngleGeometrique.prototype.className = 'CMarqueAngleGeometrique'

CMarqueAngleGeometrique.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.b)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CMarqueAngleGeometrique(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), this.styleMarque, this.rayon,
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'),
    listeCible.get(ind3, 'CPt'), this.fixed)
}
CMarqueAngleGeometrique.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.a)
  liste.add(this.o)
  liste.add(this.b)
}
CMarqueAngleGeometrique.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMarqueAngleAncetre.prototype.depDe.call(this, p) ||
    this.a.depDe(p) || this.o.depDe(p) || this.b.depDe(p))
}
CMarqueAngleGeometrique.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.a.dependDePourBoucle(p) || this.o.dependDePourBoucle(p) || this.b.dependDePourBoucle(p))
}
CMarqueAngleGeometrique.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.o.existe && this.a.existe && this.b.existe && !(this.o.presqueEgal(this.a)) && !(this.o.presqueEgal(this.b))
  if (!this.existe) return
  this.centreX = this.o.x
  this.centreY = this.o.y
  this.u.setVecteur(this.o, this.a)
  this.v.setVecteur(this.o, this.b)
  this.ang1rad = this.u.angleRad()
  this.ang2rad = this.v.angleRad()
  if (zeroAngle(this.ang1rad - this.ang2rad)) {
    this.existe = false
    return
  }
  if (testAngleDroit(this.ang1rad, this.ang2rad)) {
    this.prepareAngleDroit()
    this.point2.positionne(infoRandom, dimfen)
    this.pointc.positionne(infoRandom, dimfen)
    this.segment1.positionne(infoRandom, dimfen)
    this.marqueSegment.donneStyle(this.style)
    this.marqueSegment.donneCouleur(this.couleur)
    switch (this.styleMarque) {
      case StyleMarqueAngle.marqueSimple1Trait:
      case StyleMarqueAngle.marquePleine1Trait:
        this.marqueSegment.donneMotif(StyleMarqueSegment.marqueSimple)
        this.marqueSegment.positionne(false, dimfen)
        break
      case StyleMarqueAngle.marqueSimple2Traits:
      case StyleMarqueAngle.marquePleine2Traits:
        this.marqueSegment.donneMotif(StyleMarqueSegment.marqueDouble)
        this.marqueSegment.positionne(false, dimfen)
        break
      case StyleMarqueAngle.marqueSimple3Traits:
      case StyleMarqueAngle.marquePleine3Traits:
        this.marqueSegment.donneMotif(StyleMarqueSegment.marqueTriple)
        this.marqueSegment.positionne(false, dimfen)
        break
      case StyleMarqueAngle.marqueSimpleCroix:
      case StyleMarqueAngle.marquePleineCroix:
        this.marqueSegment.donneMotif(StyleMarqueSegment.marqueCroix)
        this.marqueSegment.positionne(false, dimfen)
        break
      default :
        this.marqueSegment.existe = false
    }
    this.angleDroit = true
  } else this.angleDroit = false
  CMarqueAngleAncetre.prototype.positionne.call(this, infoRandom, dimfen)
}
/**
 * Renvoie le path servant à créer le svg element associé.
 * @param {number} mesang  L'angle utilisé.
 * @returns {string}
 */
CMarqueAngleGeometrique.prototype.path = function (mesang) {
  const u1 = new Vect()
  this.u.vecteurColineaire(this.rayon, u1)
  const v1 = new Vect()
  this.v.vecteurColineaire(this.rayon, v1)
  const xo = this.centreX + u1.x
  const yo = this.centreY + u1.y
  const xf = this.centreX + v1.x
  const yf = this.centreY + v1.y
  const sweepflag = (mesang < 0) ? '1 ' : '0 '
  return 'M ' + xo.toString() + ' ' + yo + 'A' + this.rayon + ',' +
    this.rayon + ' 0 0 ' + sweepflag + xf.toString() + ',' + yf.toString()
}
CMarqueAngleGeometrique.prototype.trace = function (svg, couleurFond) {
  // if (this.a.horsEcran || this.o.horsEcran || this.b.horsEcran) return;
  const g = this.createg(svg, couleurFond)
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CMarqueAngleGeometrique.prototype.update = function (svg, couleurFond) {
  // if (this.a.horsEcran || this.o.horsEcran || this.b.horsEcran) return;
  const oldg = this.g
  const g = this.createg(svg, couleurFond)
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CMarqueAngleGeometrique.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
  if (this.o === ancienPoint) this.o = nouveauPoint
}

/**
 *
 * Renvoie true si le nom de la valeur commence par la chaîne st
 * @param st
 * @returns {boolean}
 */
CMarqueAngleGeometrique.prototype.nomCommencePar = function (st) {
  if (CValDyn.prototype.nomCommencePar.call(this, st)) return true
  const ch = this.b.nom + this.o.nom + this.a.nom
  return ch.indexOf(st) === 0
}

CMarqueAngleGeometrique.prototype.read = function (inps, list) {
  CMarqueAngleAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.o = list.get(ind2, 'CPt')
  this.b = list.get(ind3, 'CPt')
}
CMarqueAngleGeometrique.prototype.write = function (oups, list) {
  CMarqueAngleAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.o)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.b)
  oups.writeInt(ind3)
}
