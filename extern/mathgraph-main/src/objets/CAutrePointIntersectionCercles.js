/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import PositionCercleCercle from '../types/PositionCercleCercle'
import { distancePointPoint, zero } from '../kernel/kernel'
import CPt from './CPt'
import { intersectionCercleCercle } from 'src/kernel/kernelVect'

export default CAutrePointIntersectionCercles

/**
 * Classe représentant un deuxième point d'intersection de deux cercles ou arcs de cercle
 * autre q'un point donné.
 * @constructor
 * @extends CPt
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
 * @param {CCercle} c1  Le premier cercle ou arc de cercle.
 * @param {CCercle} c2  Le deuième cercle ou arc de cercle.
 * @param {CPt} pointExclu  Le point qu'on exclut de l'intersection.
 * @returns {CAutrePointIntersectionCercles}
 */
function CAutrePointIntersectionCercles (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, c1, c2, pointExclu) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.c1 = c1
    this.c2 = c2
    this.pointExclu = pointExclu
  }
  this.pointInt1 = { x: 0, y: 0 }
  this.pointInt2 = { x: 0, y: 0 }
}
CAutrePointIntersectionCercles.prototype = new CPt()
CAutrePointIntersectionCercles.prototype.constructor = CAutrePointIntersectionCercles
CAutrePointIntersectionCercles.prototype.superClass = 'CPt'
CAutrePointIntersectionCercles.prototype.className = 'CAutrePointIntersectionCercles'

CAutrePointIntersectionCercles.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.c1)
  const ind2 = listeSource.indexOf(this.c2)
  const ind3 = listeSource.indexOf(this.pointExclu)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CAutrePointIntersectionCercles(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom, this.tailleNom,
    this.motif, this.marquePourTrace, listeCible.get(ind1, 'CCercle'), listeCible.get(ind2, 'CCercle'),
    listeCible.get(ind3, 'CPt'))
}
CAutrePointIntersectionCercles.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.c1.depDe(p) ||
      this.c2.depDe(p) || this.pointExclu.depDe(p))
}
CAutrePointIntersectionCercles.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.c1.dependDePourBoucle(p) || this.c2.dependDePourBoucle(p) ||
    this.pointExclu.dependDePourBoucle(p))
}
CAutrePointIntersectionCercles.prototype.positionne = function (infoRandom, dimfen) {
  let point1Defini = false
  let point2Defini = false
  this.existe = this.c1.existe && this.c2.existe
  if (!this.existe) return
  const position = intersectionCercleCercle(this.c1.centreX, this.c1.centreY, this.c1.rayon,
    this.c2.centreX, this.c2.centreY, this.c2.rayon, this.pointInt1, this.pointInt2)
  const x1 = this.pointInt1.x
  const y1 = this.pointInt1.y
  const x2 = this.pointInt2.x
  const y2 = this.pointInt2.y
  switch (position) {
    case PositionCercleCercle.Vide:
    case PositionCercleCercle.Confondus:
      this.existe = false
      break
    case PositionCercleCercle.Secants:
      point1Defini = this.c1.surArc(x1, y1) && this.c2.surArc(x1, y1)
      point2Defini = this.c1.surArc(x2, y2) && this.c2.surArc(x2, y2)
      break
    case PositionCercleCercle.Tangents:
      if (this.c1.surArc(x1, y1) && this.c2.surArc(x1, y1)) {
        this.existe = true
        CPt.prototype.placeEn.call(this, x1, y1)
        CPt.prototype.positionne.call(this, infoRandom, dimfen)
        return
      } else {
        this.existe = false
        return
      }
  }
  // On ne peut arriver ici que si les deux cercles sont sécants}
  if (!point1Defini && !point2Defini) {
    this.existe = false
    return
  }
  if (point1Defini && !point2Defini) {
    if (distancePointPoint(x1, y1, this.pointExclu.x, this.pointExclu.y) < 0.0001) {
      this.existe = false
      return
    } else {
      CPt.prototype.placeEn.call(this, x1, y1)
      CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
      return
    }
  }
  if (point2Defini && !point1Defini) {
    if (distancePointPoint(x2, y2, this.pointExclu.x, this.pointExclu.y) < 0.0001) {
      this.existe = false
      return
    } else {
      CPt.prototype.placeEn.call(this, x2, y2)
      CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
      return
    }
  }
  if (zero(distancePointPoint(x1, y1, this.pointExclu.x, this.pointExclu.y))) { CPt.prototype.placeEn.call(this, x2, y2) } else CPt.prototype.placeEn.call(this, x1, y1)
  CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajout version 4.6.4
}
CAutrePointIntersectionCercles.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.pointExclu === p.pointExclu) && (((this.c1 === p.c1) && (this.c2 === p.c2)) || ((this.c1 === p.c2) && (this.c2 === p.c1))))
  } else return false
}
CAutrePointIntersectionCercles.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointExclu === ancienPoint) this.pointExclu = nouveauPoint
}
CAutrePointIntersectionCercles.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.c1 = list.get(ind1, 'CCercle')
  this.c2 = list.get(ind2, 'CCercle')
  this.pointExclu = list.get(ind3, 'CPt')
}
CAutrePointIntersectionCercles.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.c1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.c2)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.pointExclu)
  oups.writeInt(ind3)
}
