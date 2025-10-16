/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
export default CDroiteClone

/**
 * Classe représentant une droite clone d'une autre droite.
 * Il s'agit d'un autre objet avec exactement les mêmes cractéristiques géométriques.
 * @constructor
 * @extends CDroite
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  tuue si l'objet est un objet final de construction
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
 * @param {CDroite} droite  La droite dont this est clone.
 * @returns {CDroiteClone}
 */
function CDroiteClone (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, droite) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.droite = droite
  }
}
CDroiteClone.prototype = new CDroite()
CDroiteClone.prototype.constructor = CDroiteClone
CDroiteClone.prototype.superClass = 'CDroite'
CDroiteClone.prototype.className = 'CDroiteClone'

CDroiteClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.droite)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CDroiteClone(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom, this.tailleNom,
    this.style.getClone(), this.abscisseNom, listeCible.get(ind1, 'CDroite'))
}
/* Abandonné version 6.9.1 : NatObj.NDroiteClone ne sert pas. Donc renvoie NatObj.NDroite
CDroiteClone.prototype.getNature = function () {
  return NatObj.NDroiteClone
}
 */

CDroiteClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) || this.droite.depDe(p))
}

CDroiteClone.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.droite.dependDePourBoucle(p))
}

CDroiteClone.prototype.positionne = function () {
  this.existe = this.droite.existe
  if (this.existe) {
    const b = this.masque
    this.setClone(this.droite)
    this.masque = b
  }
}

CDroiteClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.droite)
}

// On peut créer autant de clones d'un même objet qu'on souhaite
CDroiteClone.prototype.confonduAvec = function () {
  return false
}

CDroiteClone.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.droite = list.get(ind1, 'CDroite')
}

CDroiteClone.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.droite)
  oups.writeInt(ind1)
}
