/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import StyleFleche from '../types/StyleFleche'
import Vect from '../types/Vect'
import { zero, zeroAngle } from '../kernel/kernel'
import CMarqueAngleGeometrique from './CMarqueAngleGeometrique'
import CMarqueAngleOriente from './CMarqueAngleOriente'
export default CMarqueAngleOrienteIndirecte

/**
 * Classe représentant une marque d'angle orienté de sens iddirect.
 * @constructor
 * @extends CMarqueAngleOriente
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
 * @param {StyleFleche} motifFleche  Le style utilisé pour la flèche finissant l'arc.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMarqueAngleOrienteIndirecte}
 */
function CMarqueAngleOrienteIndirecte (listeProprietaire, impProto, estElementFinal, couleur, masque,
  style, styleMarque, rayon, a, o, b,
  motifFleche, fixed = false) {
  if (arguments.length === 1) CMarqueAngleOriente.call(this, listeProprietaire)
  else {
    CMarqueAngleOriente.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, styleMarque, rayon, a, o, b, fixed)
    this.motifFleche = motifFleche
  }
}
CMarqueAngleOrienteIndirecte.prototype = new CMarqueAngleOriente()
CMarqueAngleOrienteIndirecte.prototype.constructor = CMarqueAngleOrienteIndirecte
CMarqueAngleOrienteIndirecte.prototype.superClass = 'CMarqueAngleOriente'
CMarqueAngleOrienteIndirecte.prototype.className = 'CMarqueAngleOrienteIndirecte'

CMarqueAngleOrienteIndirecte.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.b)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CMarqueAngleOrienteIndirecte(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), this.styleMarque, this.rayon,
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'),
    this.motifFleche, this.fixed)
}

CMarqueAngleOrienteIndirecte.prototype.positionne = function (infoRandom, dimfen) {
  let petitAngle // Représente l'angle de correction pour la direction de la flèche
  // due à la longueur de la flèche
  CMarqueAngleGeometrique.prototype.positionne.call(this, infoRandom, dimfen)
  if (!this.existe) return
  // Optimisation pour la version 1.9.5
  const longueurFleche = StyleFleche.longeurFlechePourArc(this.motifFleche, this.listeProprietaire)
  this.v.vecteurColineaire(this.rayon, this.v0)
  this.angle = this.u.mesureAngleVecteurs(this.v)
  if (zeroAngle(this.angle + Math.PI / 2)) petitAngle = 0
  // Modifié version 5.3. Meilleur quand la marque est petite
  // else petitAngle = longueurFleche/this.rayon;
  else petitAngle = Math.atan(longueurFleche / this.rayon / 2)
  if (zero(this.angle)) {
    this.existe = false
    return
  } else {
    this.v0.tourne(Math.PI / 2 + petitAngle, this.vecteurDirection)
  }
  this.xdeb = this.o.x + this.v0.x
  this.ydeb = this.o.y + this.v0.y
}
// Spécifique version JavaScript
CMarqueAngleOrienteIndirecte.prototype.anglePourArc = function () {
  return (this.angle <= 0) ? this.angle : -2 * Math.PI + this.angle
}
CMarqueAngleOrienteIndirecte.prototype.path = function (mesang) {
  const u1 = new Vect()
  this.u.vecteurColineaire(this.rayon, u1)
  const v1 = new Vect()
  this.v.vecteurColineaire(this.rayon, v1)
  const xo = this.centreX + u1.x
  const yo = this.centreY + u1.y
  const xf = this.centreX + v1.x
  const yf = this.centreY + v1.y
  const largearcflag = (this.angle <= 0) ? '0 ' : '1 '
  return 'M ' + xo.toString() + ' ' + yo + 'A' + this.rayon + ',' +
    this.rayon + ' 0 ' + largearcflag + ' 1 ' + xf.toString() + ',' + yf.toString()
}
