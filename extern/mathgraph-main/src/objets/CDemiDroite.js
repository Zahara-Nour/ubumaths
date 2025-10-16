/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { colineairesMemeSens, zero } from '../kernel/kernel'
import CDroiteAncetre from './CDroiteAncetre'
export default CDemiDroite

/**
 * Classe ancêtre des demi-droites.
 * @constructor
 * @extends CDroiteAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @returns {CDemiDroite}
 */
function CDemiDroite (listeProprietaire, impProto, estElementFinal, couleur, masque, style) {
  if (arguments.length === 0) return // Ajout version 4.9.9.4
  if (arguments.length === 1) CDroiteAncetre.call(this, listeProprietaire)
  else {
    CDroiteAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      false, 0, 0, masque, '', 16, style)
  }
}
CDemiDroite.prototype = new CDroiteAncetre()
CDemiDroite.prototype.constructor = CDemiDroite
CDemiDroite.prototype.superClass = 'CDroiteAncetre'
CDemiDroite.prototype.className = 'CDemiDroite'

CDemiDroite.prototype.positionne = function (infoRandom, dimfen) {
  let u, v
  CDroiteAncetre.prototype.positionne.call(this, infoRandom, dimfen)
  // Si la droite est hors-fenêtre, la demi-droite l'est aussi
  if (this.horsFenetre) return
  // Si l'origine de la demi-droite  est dans la fenêtre
  if (dimfen.dansFenetre(this.point_x, this.point_y)) {
    u = new Vect(this.point_x, this.point_y, this.xext1, this.yext1)
    if (u.presqueNul()) {
      v = new Vect(this.point_x, this.point_y, this.xext2, this.yext2)
      if (colineairesMemeSens(v, this.vect)) {
        this.xext1 = this.point_x
        this.yext1 = this.point_y
      } else {
        this.xext2 = this.xext1
        this.yext2 = this.yext1
        this.xext1 = this.point_x
        this.yext1 = this.point_y
      }
    } else {
      if (colineairesMemeSens(u, this.vect)) {
        this.xext2 = this.xext1
        this.yext2 = this.yext1
        this.xext1 = this.point_x
        this.yext1 = this.point_y
      } else {
        this.xext1 = this.point_x
        this.yext1 = this.point_y
      }
    }
  } else {
    // Si l'origine est hors-fenêtre
    u = new Vect(this.point_x, this.point_y, this.xext1, this.yext1)
    if (!colineairesMemeSens(u, this.vect)) this.horsFenetre = true
  }
}
CDemiDroite.prototype.abscisseMaximale = function () {
  if (this.horsFenetre) return this.abscisseMinimale()
  else return CDroiteAncetre.prototype.abscisseMaximale.call(this)
}
// Pour ne rien faire lorsque CDroite.positionne appelle positionneNom()
CDemiDroite.prototype.positionneNom = function () {
}
CDemiDroite.prototype.appartientA = function (x, y) {
  if (!(this.existe)) return false
  else {
    if (zero(this.vect.x)) {
      return ((y - this.point_y) * this.vect.y >= 0)
    } else {
      return ((x - this.point_x) * this.vect.x >= 0)
    }
  }
}
CDemiDroite.prototype.getNature = function () {
  return NatObj.NDemiDroite
}
CDemiDroite.prototype.chaineDesignation = function () {
  return 'desDemiDroite'
}
