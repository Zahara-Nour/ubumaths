/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import PositionDroiteCercle from '../types/PositionDroiteCercle'
import CBipoint from './CBipoint'
import { intersectionDroiteCercle } from 'src/kernel/kernelVect'

export default CIntDroiteCercle

/**
 * Classe représentant l'intersection d'uune droite (ou demi-droite) ou segment
 * avec un cercle (ou arc de cercle).
 * @constructor
 * @extends CBipoint
 * @param {CListeObjets} listeProprietaire
 * @param {CImplementationProto} impProto
 * @param {boolean} estElementFinal
 * @param {CDroiteAncetre} d
 * @param {CCercle} c
 * @returns {CIntDroiteCercle}
 */
function CIntDroiteCercle (listeProprietaire, impProto, estElementFinal, d, c) {
  if (arguments.length === 1) CBipoint.call(this, listeProprietaire)
  else CBipoint.call(this, listeProprietaire, impProto, estElementFinal)
  this.d = d
  this.c = c
  this.pointInt1 = { x: 0, y: 0 }
  this.pointInt2 = { x: 0, y: 0 }
}
CIntDroiteCercle.prototype = new CBipoint()
CIntDroiteCercle.prototype.constructor = CIntDroiteCercle
CIntDroiteCercle.prototype.superClass = 'CBipoint'
CIntDroiteCercle.prototype.className = 'CIntDroiteCercle'

CIntDroiteCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.d)
  const ind2 = listeSource.indexOf(this.c)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CIntDroiteCercle(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CDroiteAncetre'), listeCible.get(ind2, 'CCercle'))
}
CIntDroiteCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.d)
  liste.add(this.c)
}
CIntDroiteCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CBipoint.prototype.depDe.call(this, p) || this.d.depDe(p) || this.c.depDe(p))
}
CIntDroiteCercle.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.d.dependDePourBoucle(p) || this.c.dependDePourBoucle(p))
}
CIntDroiteCercle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.c.existe && this.d.existe
  if (!this.existe) {
    this.point1.existe = false
    this.point2.existe = false
    return
  }
  const position = intersectionDroiteCercle(this.d.point_x, this.d.point_y, this.d.vect,
    this.c.centreX, this.c.centreY, this.c.rayon, this.pointInt1, this.pointInt2)
  const x1 = this.pointInt1.x
  const y1 = this.pointInt1.y
  const x2 = this.pointInt2.x
  const y2 = this.pointInt2.y

  switch (position) {
    case PositionDroiteCercle.Vide:
      this.point1.existe = false
      this.point2.existe = false
      break
    case PositionDroiteCercle.Secants:
      if (this.d.appartientA(x1, y1) && this.c.surArc(x1, y1)) {
        this.point1.placeEn(x1, y1)
        this.point1.positionne(infoRandom, dimfen) // Ajout version 4.6.4
      } else this.point1.existe = false
      if (this.d.appartientA(x2, y2) && this.c.surArc(x2, y2)) {
        this.point2.placeEn(x2, y2)
        this.point2.positionne(infoRandom, dimfen) // Ajout version 4.6.4
      } else this.point2.existe = false
      break
    case PositionDroiteCercle.Tangents:
      if (this.d.appartientA(x1, y1) && this.c.surArc(x1, y1)) {
        this.point1.existe = true
        this.point1.placeEn(x1, y1)
        this.point1.positionne(infoRandom, dimfen) // Ajout version 4.6.4
      } else this.point1.existe = false
      this.point2.existe = false
      break
  } // switch
  CBipoint.prototype.positionne.call(this, infoRandom, dimfen)
}
CIntDroiteCercle.prototype.elementAssocie = function (indice) {
  if (indice === 0) return this.d
  else return this.c
}
CIntDroiteCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.d === p.d) && (this.c === p.c)
  } else return false
}
// Fonction différente de la version java
CIntDroiteCercle.prototype.estDefiniPar = function (dtecer) {
  return (dtecer === this.d) || (dtecer === this.c)
}
CIntDroiteCercle.prototype.read = function (inps, list) {
  CBipoint.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.d = list.get(ind1, 'CDroiteAncetre')
  this.c = list.get(ind2, 'CCercle')
}
CIntDroiteCercle.prototype.write = function (oups, list) {
  CBipoint.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.d)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.c)
  oups.writeInt(ind2)
}
