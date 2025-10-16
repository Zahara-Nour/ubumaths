/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiDroite from './CDemiDroite'
export default CDemiDroiteImage

/**
 * Classe représentant une demi-droite image d'une autre par une transformation.
 * @constructor
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {Color} couleur  La couleur de l'objet.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style de tracé.
 * @param {CDemiDroite} droite  La demi-droite dont this est le clone.
 * @param {CDemiDroite} antecedent  La demi-droite dont this est l'image.
 * @param {CTransformation} transformation  La transformation utilisée.
 * @returns {CDemiDroiteImage}
 */
function CDemiDroiteImage (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, antecedent, transformation) {
  if (arguments.length === 1) CDemiDroite.call(this, listeProprietaire)
  else {
    CDemiDroite.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style)
    this.antecedent = antecedent
    this.transformation = transformation
  }
}
CDemiDroiteImage.prototype = new CDemiDroite()
CDemiDroiteImage.prototype.constructor = CDemiDroiteImage
CDemiDroiteImage.prototype.superClass = 'CDemiDroite'
CDemiDroiteImage.prototype.className = 'CDemiDroiteImage'

CDemiDroiteImage.prototype.ajouteAntecedents = function (liste, app) {
  liste.add(this.antecedent)
  this.transformation.ajouteAntecedents(liste, app)
}
CDemiDroiteImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.transformation)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CDemiDroiteImage(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CDemiDroite'),
    listeCible.get(ind2, 'CTransformation'))
}
CDemiDroiteImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CDemiDroite.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.transformation.depDe(p))
}
CDemiDroiteImage.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.antecedent.dependDePourBoucle(p) || this.transformation.dependDePourBoucle(p))
}
CDemiDroiteImage.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.transformation.existe && this.antecedent.existe
  if (!this.existe) return
  const point1 = {}
  this.transformation.transformePoint(this.antecedent.point_x, this.antecedent.point_y, point1)
  this.point_x = point1.x
  this.point_y = point1.y
  this.transformation.transformeVecteur(this.antecedent.vect, this.vect)
  CDemiDroite.prototype.positionne.call(this, infoRandom, dimfen)
}
CDemiDroiteImage.prototype.confonduAvec = function (p) {
  if (p.className === this.className) { return (this.antecedent === p.antecedent) && (this.transformation.confonduAvec(p.transformation)) } else return false
}
CDemiDroiteImage.prototype.read = function (inps, list) {
  CDemiDroite.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.antecedent = list.get(ind1, 'CDemiDroite')
  this.transformation = list.get(ind2, 'CTransformation')
}
CDemiDroiteImage.prototype.write = function (oups, list) {
  CDemiDroite.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.transformation)
  oups.writeInt(ind2)
}
