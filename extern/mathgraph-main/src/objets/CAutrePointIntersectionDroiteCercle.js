/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import PositionDroiteCercle from '../types/PositionDroiteCercle'
import { distancePointPoint, zero } from '../kernel/kernel'
import CPt from './CPt'
import { intersectionDroiteCercle } from 'src/kernel/kernelVect'

export default CAutrePointIntersectionDroiteCercle

/**
 * Classe représentant un deuxième point d'intersection d'une droite (ou demi-droie ou segment)
 * avec un cercle (ou arc de cercle).
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
 * @param {CCercle} c  Le cercle ou arc de cercle
 * @param {CDroiteAncetre} d  La droite ou demi-droite ou segment
 * @param {CPt} pointExclu  Le point exclu de ll'intersection
 * @returns {CAutrePointIntersectionDroiteCercle}
 */
function CAutrePointIntersectionDroiteCercle (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, c, d, pointExclu) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.c = c
    this.d = d
    this.pointExclu = pointExclu
  }
  this.pointInt1 = { x: 0, y: 0 }
  this.pointInt2 = { x: 0, y: 0 }
}
CAutrePointIntersectionDroiteCercle.prototype = new CPt()
CAutrePointIntersectionDroiteCercle.prototype.constructor = CAutrePointIntersectionDroiteCercle // Corrigé new
CAutrePointIntersectionDroiteCercle.prototype.superClass = 'CPt'
CAutrePointIntersectionDroiteCercle.prototype.className = 'CAutrePointIntersectionDroiteCercle'

CAutrePointIntersectionDroiteCercle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.c)
  const ind2 = listeSource.indexOf(this.d)
  const ind3 = listeSource.indexOf(this.pointExclu)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CAutrePointIntersectionDroiteCercle(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CCercle'),
    listeCible.get(ind2, 'CDroiteAncetre'), listeCible.get(ind3, 'CPt'))
}
CAutrePointIntersectionDroiteCercle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.c.depDe(p) || this.d.depDe(p) || this.pointExclu.depDe(p))
}
CAutrePointIntersectionDroiteCercle.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.c.dependDePourBoucle(p) || this.d.dependDePourBoucle(p) ||
      this.pointExclu.dependDePourBoucle(p))
}
CAutrePointIntersectionDroiteCercle.prototype.positionne = function (infoRandom, dimfen) {
  let point1Defini = false
  let point2Defini = false

  this.existe = this.c.existe && this.d.existe
  if (!this.existe) return
  const position = intersectionDroiteCercle(this.d.point_x, this.d.point_y, this.d.vect,
    this.c.centreX, this.c.centreY, this.c.rayon, this.pointInt1, this.pointInt2)
  const x1 = this.pointInt1.x
  const y1 = this.pointInt1.y
  const x2 = this.pointInt2.x
  const y2 = this.pointInt2.y
  switch (position) {
    case PositionDroiteCercle.Vide:
      this.existe = false
      return
    case PositionDroiteCercle.Secants:
      point1Defini = this.c.surArc(x1, y1) && this.d.appartientA(x1, y1)
      point2Defini = this.c.surArc(x2, y2) && this.d.appartientA(x2, y2)
      break
    case PositionDroiteCercle.Tangents:
      if (this.c.surArc(x1, y1) && this.d.appartientA(x1, y1)) {
        this.existe = true
        CPt.prototype.placeEn.call(this, x1, y1)
        CPt.prototype.positionne.call(this, infoRandom, dimfen)
        return
      } else {
        this.existe = false
        return
      }
  }
  // On ne peut arriver ici que si la droite et le cercle sont sécants
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
      CPt.prototype.positionne.call(this, infoRandom, dimfen)
      return
    }
  }
  // Les 2 points sont forcéments définis
  if (zero(distancePointPoint(x1, y1, this.pointExclu.x, this.pointExclu.y))) { CPt.prototype.placeEn.call(this, x2, y2) } else CPt.prototype.placeEn.call(this, x1, y1)
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}
CAutrePointIntersectionDroiteCercle.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.c)
  liste.add(this.d)
}
CAutrePointIntersectionDroiteCercle.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.c === p.c) && (this.d === p.d) && (this.pointExclu === p.pointExclu)
  } else return false
}
CAutrePointIntersectionDroiteCercle.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointExclu === ancienPoint) this.pointExclu = nouveauPoint
}

CAutrePointIntersectionDroiteCercle.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.c = list.get(ind1, 'CCercle')
  this.d = list.get(ind2, 'CDroiteAB')
  this.pointExclu = list.get(ind3, 'CPt')
}
CAutrePointIntersectionDroiteCercle.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.c)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.d)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.pointExclu)
  oups.writeInt(ind3)
}
