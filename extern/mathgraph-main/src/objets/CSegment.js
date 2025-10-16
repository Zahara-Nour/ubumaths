/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { colineairesMemeSens } from '../kernel/kernel'
import CDroite from './CDroite'
import Color from '../types/Color'
import { appartientSegment } from 'src/kernel/kernelVect'

export default CSegment
/**
 * Classe représentant un segment défini par ses deux points extrémités.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si le nom de l'objet est masqué
 * @param {StyleTrait} style  Le style du tracé.
 * @param {CPt} point1  La première extrémité.
 * @param {CPt} point2  La deuxième extrémité.
 */
function CSegment (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, point1, point2) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) { // Pour objets internes
      CDroite.call(this, arguments[0], null, true, Color.black,
        false, 0, 0, false, '', 16, 0, 0)
      this.point1 = arguments[1]
      this.point2 = arguments[2]
    } else {
      CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        false, 0, 0, masque, '', 16, style, 0.9)
      this.point1 = point1
      this.point2 = point2
    }
  }
}
CSegment.prototype = new CDroite()
CSegment.prototype.constructor = CSegment
CSegment.prototype.superClass = 'CDroite'
CSegment.prototype.className = 'CSegment'

// A revoir JavaScript
//  public void donneExtremites(CPt pt1, CPt pt2) {
//    point1 = pt1;
//    point2 = pt2;
//  }

CSegment.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.point1)
  const ind2 = listeSource.indexOf(this.point2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CSegment(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(),
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'))
}
CSegment.prototype.setClone = function (ptel) {
  CDroite.prototype.setClone.call(this, ptel)
  this.x1 = ptel.x1
  this.y1 = ptel.y1
  this.x2 = ptel.x2
  this.y2 = ptel.y2
}
CSegment.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point1)
  liste.add(this.point2)
}
CSegment.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) ||
    this.point1.depDe(p) || this.point2.depDe(p))
}
CSegment.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.point1.dependDePourBoucle(p) || this.point2.dependDePourBoucle(p)
}
CSegment.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.point1?.existe && this.point2?.existe
  if (!this.existe) return
  let u1, u2
  if (arguments.length === 0) { // Spécial segments internes aux objets
    this.point_x = this.point1.x
    this.point_y = this.point1.y
    this.vect.setVecteur(this.point1, this.point2)
    this.xext1 = this.point1.x
    this.yext1 = this.point1.y
    this.xext2 = this.point2.x
    this.yext2 = this.point2.y
    this.x1 = this.xext1
    this.y1 = this.yext1
    this.x2 = this.xext2
    this.y2 = this.yext2
  } else {
    // Ajout version 3.2.0. Utilisé dans appartientA
    this.x1 = this.point1.x
    this.y1 = this.point1.y
    this.x2 = this.point2.x
    this.y2 = this.point2.y

    this.point_x = this.x1
    this.point_y = this.y1
    this.vect.setVecteur(this.point1, this.point2)
    if (this.vect.nul()) {
      this.existe = true
      this.horsFenetre = true
      return
    }
    if (this.point1.dansFenetre && this.point2.dansFenetre) {
      this.xext1 = this.x1
      this.yext1 = this.y1
      this.xext2 = this.x2
      this.yext2 = this.y2
      this.horsFenetre = false
    } else {
      // Au moins un des deux points est hors-fenêtre
      CDroite.prototype.positionne.call(this, infoRandom, dimfen)
      // Si la droite est hors fenetre le segment l'est aussi
      if (this.horsFenetre) return
      if (this.point1.dansFenetre) {
        // point2 n'est pas dans la fenêtre
        u1 = new Vect(this.point1, this.point2)
        u2 = new Vect(this.x1, this.y1, this.xext1, this.yext1)
        if (u2.presqueNul()) {
          this.horsFenetre = true
          return
        }
        if (colineairesMemeSens(u1, u2)) {
          this.xext2 = this.x1
          this.yext2 = this.y1
        } else {
          this.xext1 = this.x1
          this.yext1 = this.y1
        }
      } else {
        if (this.point2.dansFenetre) {
          // point1 n'est pas dans la fenêtre
          u1 = new Vect(this.point2, this.point1)
          u2 = new Vect(this.x2, this.y2, this.xext1, this.yext1)
          if (u2.presqueNul()) {
            this.horsFenetre = true
            return
          }
          if (colineairesMemeSens(u1, u2)) {
            this.xext2 = this.x2
            this.yext2 = this.y2
          } else {
            this.xext1 = this.x2
            this.yext1 = this.y2
          }
        } else {
          // Si les deux points sont hors-fenêtre on regarde si un des points d'intersection
          // de la droite avec le cadre de la fenêtre appartient au segment
          // Il faut les deux tests car un des deux points peut être presque sur le bord
          if (!appartientSegment(this.xext1, this.yext1, this.x1, this.y1, this.x2, this.y2) ||
            !appartientSegment(this.xext2, this.yext2, this.x1, this.y1, this.x2, this.y2)) this.horsFenetre = true
        }
      }
    }
  }
}
CSegment.prototype.abscisseMinimale = function () {
  // Cas d'un segment ayant ses extrémités confondues
  if ((this.vect.x === 0) && (this.vect.y === 0)) return 0
  if (Math.abs(this.vect.x) >= Math.abs(this.vect.y)) { return (this.x1 - this.point_x) / this.vect.x } else { return (this.y1 - this.point_y) / this.vect.y }
}
CSegment.prototype.abscisseMaximale = function () {
  // Cas d'un segment ayant ses extrémités confondues
  if ((this.vect.x === 0) && (this.vect.y === 0)) return 0
  if (Math.abs(this.vect.x) >= Math.abs(this.vect.y)) { return (this.x2 - this.point_x) / this.vect.x } else { return (this.y2 - this.point_y) / this.vect.y }
}
// Ajout version 3.2.0
// Pour ne rien faire lorsque CDroite.positionne appelle positionneNom()
CSegment.prototype.positionneNom = function () {
}
CSegment.prototype.appartientA = function (x, y) {
  if (!this.existe) return false
  else return appartientSegment(x, y, this.x1, this.y1, this.x2, this.y2)
}
CSegment.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.point1 === p.point1) && (this.point2 === p.point2)) ||
      ((this.point1 === p.point2) && (this.point2 === p.point1))
  } else return false
}
CSegment.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point1 === ancienPoint) this.point1 = nouveauPoint
  if (this.point2 === ancienPoint) this.point2 = nouveauPoint
}
CSegment.prototype.getNature = function () {
  return NatObj.NSegment
}
CSegment.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
}
CSegment.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
}
CSegment.prototype.chaineDesignation = function () {
  return 'desSegment'
}
