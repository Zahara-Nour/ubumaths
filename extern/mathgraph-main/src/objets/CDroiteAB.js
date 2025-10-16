/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
export default CDroiteAB

/**
 * Droite définie par deux points a et b.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} nomMasque  true si le nom de l'objet est masqué
 * @param {number} decX  Décalage en abscisses du nom.
 * @param {number} decY  Décalage en ordonnées du nom.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {string} nom  Le nom de l'objet. Seules les droites peuvent être nommées,
 * pas les segments ni demi-droites.
 * @param {number} tailleNom  Indice donnant la taille du nom.
 * @param {StyleTrait} style  Le style de trait utilisé
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CPt} a  le premier point de la droite.
 * @param {CPt} b  Le deuxième point de la droite.
 * @returns {CDroiteAB}
 */
function CDroiteAB (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, a, b) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.a = a
    this.b = b
  }
}
CDroiteAB.prototype = new CDroite()
CDroiteAB.prototype.constructor = CDroiteAB
CDroiteAB.prototype.superClass = 'CDroite'
CDroiteAB.prototype.className = 'CDroiteAB'

CDroiteAB.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.b)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CDroiteAB(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'))
}

CDroiteAB.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.a)
  liste.add(this.b)
}

CDroiteAB.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) || this.a.depDe(p) || this.b.depDe(p))
}

CDroiteAB.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.a.dependDePourBoucle(p) || this.b.dependDePourBoucle(p))
}

CDroiteAB.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.a?.existe && this.b?.existe
  if (!this.existe) return
  this.point_x = this.a.x
  this.point_y = this.a.y
  this.vect.x = this.b.x - this.a.x
  this.vect.y = this.b.y - this.a.y
  CDroite.prototype.positionne.call(this, infoRandom, dimfen)
}

CDroiteAB.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return ((this.a === p.a) && (this.b === p.b)) || ((this.b === p.a) && (this.a === p.b))
  else return false
}

CDroiteAB.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
}

CDroiteAB.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.b = list.get(ind2, 'CPt')
}

CDroiteAB.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.b)
  oups.writeInt(ind2)
}
