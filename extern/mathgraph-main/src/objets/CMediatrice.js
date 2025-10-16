/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Vect from '../types/Vect'
import CDroite from './CDroite'
export default CMediatrice

/**
 * Classe médiatrice donnée par la donnée de deux points.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction.
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Décalage en abscisses du nom.
 * @param {number} decY  Décalage en ordonnées du nom.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {string} nom  Le nom de l'objet. Seules les droites peuvent être nommées,
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CPt} point1  Premier point.
 * @param {CPt} point2  Deuxième point.
 * @returns {CMediatrice}
 */
function CMediatrice (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, point1, point2) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.point1 = point1
    this.point2 = point2
  }
}
CMediatrice.prototype = new CDroite()
CMediatrice.prototype.constructor = CMediatrice
CMediatrice.prototype.superClass = 'CDroite'
CMediatrice.prototype.className = 'CMediatrice'

CMediatrice.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.point1)
  const ind2 = listeSource.indexOf(this.point2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMediatrice(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY,
    this.masque, this.nom, this.tailleNom, this.style.getClone(), this.abscisseNom,
    listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'))
}
CMediatrice.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point1)
  liste.add(this.point2)
}
CMediatrice.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) || this.point1.depDe(p) || this.point2.depDe(p))
}
CMediatrice.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.point1.dependDePourBoucle(p) || this.point2.dependDePourBoucle(p))
}
CMediatrice.prototype.positionne = function (infoRandom, dimfen) {
  const v = new Vect()
  this.existe = (this.point1.existe) && (this.point2.existe)
  if (!this.existe) return
  this.point_x = (this.point1.x + this.point2.x) / 2
  this.point_y = (this.point1.y + this.point2.y) / 2
  v.setVecteur(this.point1, this.point2)
  if ((v.x === 0) && (v.y === 0)) this.existe = false
  else {
    v.getOrthogonal(this.vect)
    CDroite.prototype.positionne.call(this, infoRandom, dimfen)
  }
}
CMediatrice.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.point1 === p.point1) && (this.point2 === p.point2)) ||
    ((this.point2 === p.point1) && (this.point1 === p.point2)))
  } else return false
}
CMediatrice.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point1 === ancienPoint) this.point1 = nouveauPoint
  if (this.point2 === ancienPoint) this.point2 = nouveauPoint
}
CMediatrice.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
}
CMediatrice.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
}
