/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroite from './CDroite'
export default CDroiteImage

/**
 * Droite image d'une autre par une transformation.
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
 * @param {StyleTrait} style  Le style de trait utilisé.
 * @param {number} abscisseNom  Abscisse du nom par rapport à la droite.
 * @param {CDroite} antecedent  droite dont this est l'image.
 * @param {CTransformation} transformation  La transformation utilisée.
 * @returns {CDroiteImage}
 */
function CDroiteImage (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, style, abscisseNom, antecedent, transformation) {
  if (arguments.length === 1) CDroite.call(this, listeProprietaire)
  else {
    CDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      nomMasque, decX, decY, masque, nom, tailleNom, style, abscisseNom)
    this.antecedent = antecedent
    this.transformation = transformation
  }
}
CDroiteImage.prototype = new CDroite()
CDroiteImage.prototype.constructor = CDroiteImage
CDroiteImage.prototype.superClass = 'CDroite'
CDroiteImage.prototype.className = 'CDroiteImage'

CDroiteImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.transformation)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CDroiteImage(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY,
    this.masque, this.nom, this.tailleNom, this.style.getClone(), this.abscisseNom,
    listeCible.get(ind1, 'CDroite'), listeCible.get(ind2, 'CTransformation'))
}

CDroiteImage.prototype.ajouteAntecedents = function (liste, app) {
  liste.add(this.antecedent)
  this.transformation.ajouteAntecedents(liste, app)
}

CDroiteImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDroite.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.transformation.depDe(p))
}

CDroiteImage.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.antecedent.dependDePourBoucle(p) || this.transformation.dependDePourBoucle(p))
}

CDroiteImage.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.transformation?.existe && this.antecedent?.existe
  if (!this.existe) return
  const point1 = {}
  this.transformation.transformePoint(this.antecedent.point_x, this.antecedent.point_y, point1)
  this.point_x = point1.x
  this.point_y = point1.y
  this.transformation.transformeVecteur(this.antecedent.vect, this.vect)
  CDroite.prototype.positionne.call(this, infoRandom, dimfen)
}

CDroiteImage.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.antecedent === p.antecedent) && (this.transformation.confonduAvec(p.transformation))
  } else return false
}

CDroiteImage.prototype.read = function (inps, list) {
  CDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.antecedent = list.get(ind1, 'CDroite')
  this.transformation = list.get(ind2, 'CTransformation')
}

CDroiteImage.prototype.write = function (oups, list) {
  CDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.transformation)
  oups.writeInt(ind2)
}
