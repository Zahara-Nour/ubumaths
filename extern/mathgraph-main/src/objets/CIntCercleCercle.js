/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import PositionCercleCercle from '../types/PositionCercleCercle'
import CBipoint from './CBipoint'
import { intersectionCercleCercle } from 'src/kernel/kernelVect'

export default CIntCercleCercle

/**
 * Classe représentant l'intersection de deux cercles (ou arcs de cercle)
 * @constructor
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément fial de construction.
 * @param {CCercle} c1  Le premier cercle ou arc de cercle.
 * @param {CCercle} c2  Le deuxième cercle ou arc de cercle.
 * @returns {CIntCercleCercle}
 */
function CIntCercleCercle (listeProprietaire, impProto, estElementFinal, c1, c2) {
  if (arguments.length === 1) CBipoint.call(this, listeProprietaire)
  else CBipoint.call(this, listeProprietaire, impProto, estElementFinal)
  this.c1 = c1
  this.c2 = c2
  this.pointInt1 = { x: 0, y: 0 }
  this.pointInt2 = { x: 0, y: 0 }
}
CIntCercleCercle.prototype = new CBipoint()
CIntCercleCercle.prototype.constructor = CIntCercleCercle
CIntCercleCercle.prototype.superClass = 'CBipoint'
CIntCercleCercle.prototype.className = 'CIntCercleCercle'

CIntCercleCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.c1)
  const ind2 = listeSource.indexOf(this.c2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CIntCercleCercle(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CCercle'), listeCible.get(ind2, 'CCercle'))
}
CIntCercleCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.c1)
  liste.add(this.c2)
}
CIntCercleCercle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.c1.existe && this.c2.existe
  if (!this.existe) {
    this.point1.existe = false
    this.point2.existe = false
    return
  }
  const position = intersectionCercleCercle(this.c1.centreX, this.c1.centreY, this.c1.rayon,
    this.c2.centreX, this.c2.centreY, this.c2.rayon, this.pointInt1, this.pointInt2)
  const x1 = this.pointInt1.x
  const y1 = this.pointInt1.y
  const x2 = this.pointInt2.x
  const y2 = this.pointInt2.y

  switch (position) {
    case PositionCercleCercle.Vide:
    case PositionCercleCercle.Confondus:
      this.point1.existe = false
      this.point2.existe = false
      break
    case PositionCercleCercle.Secants:
      if (this.c1.surArc(x1, y1) && this.c2.surArc(x1, y1)) {
        this.point1.existe = true
        this.point1.placeEn(x1, y1)
        this.point1.positionne(infoRandom, dimfen) // Ajout versio 4.6.4
      } else this.point1.existe = false
      if (this.c1.surArc(x2, y2) && this.c2.surArc(x2, y2)) {
        this.point2.existe = true
        this.point2.placeEn(x2, y2)
        this.point2.positionne(infoRandom, dimfen) // Ajout versio 4.6.4
      } else this.point2.existe = false
      break
    case PositionCercleCercle.Tangents:
      if (this.c1.surArc(x1, y1) && this.c2.surArc(x1, y1)) {
        this.point1.existe = true
        this.point1.placeEn(x1, y1)
        this.point1.positionne(infoRandom, dimfen) // Ajout versio 4.6.4
      } else this.point1.existe = false
      this.point2.existe = false
      break
    default :
  }
  CBipoint.prototype.positionne.call(this, infoRandom, dimfen)
}
CIntCercleCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CBipoint.prototype.depDe.call(this, p) || this.c1.depDe(p) || this.c2.depDe(p))
}
CIntCercleCercle.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.c1.dependDePourBoucle(p) || this.c2.dependDePourBoucle(p))
}
CIntCercleCercle.prototype.elementAssocie = function (indice) {
  if (indice === 0) return this.c1
  else return this.c2
}
CIntCercleCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.c1 === p.c1) && (this.c2 === p.c2)) ||
    ((this.c1 === p.c2) && (this.c2 === p.c1)))
  } else return false
}
/**
 * Renvoie true si cercle est un des deux cercles dont this est l'intersection
 * @param {CCercle} cercle
 * @returns {boolean}
 */
CIntCercleCercle.prototype.estDefiniPar = function (cercle) {
  return (cercle === this.c1) || (cercle === this.c2)
}
CIntCercleCercle.prototype.read = function (inps, list) {
  CBipoint.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.c1 = list.get(ind1, 'CCercle')
  this.c2 = list.get(ind2, 'CCercle')
}
CIntCercleCercle.prototype.write = function (oups, list) {
  CBipoint.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.c1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.c2)
  oups.writeInt(ind2)
}
