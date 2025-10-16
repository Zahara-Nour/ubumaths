/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CElementLigne from './CElementLigne'
import CCercle from './CCercle'
export default CCercleImage

/**
 * Classe représentant un cercle image d'un autre par une transformation.
 * @constructor
 * @extends CCercle
 * @param {CListeObjets} listeProprietaire  La liste popriétaire.
 * @param {CImplementationProto} impProto  null ou la construction proprietaire.
 * @param {boolean} estElementFinal  true si élémnet final de construction.
 * @param {Color} couleur
 * @param {boolean} masque  true si l'objet est masqué
 * @param {StyleTrait} style  Le stye lde tracé
 * @param {CCercle} antecedent  Le cercle dont this est l'image.
 * @param {CTransformation} transformation  La transformation utilisée.
 * @returns {CCercleImage}
 */
function CCercleImage (listeProprietaire, impProto, estElementFinal, couleur,
  masque, style, antecedent, transformation) {
  if (arguments.length === 1) CElementLigne.call(this, listeProprietaire)
  else {
    CCercle.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style)
    this.antecedent = antecedent
    this.transformation = transformation
  }
}
CCercleImage.prototype = new CCercle()
CCercleImage.prototype.constructor = CCercleImage
CCercleImage.prototype.superClass = 'CCercle'
CCercleImage.prototype.className = 'CCercleImage'

CCercleImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.transformation)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CCercleImage(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), listeCible.get(ind1, 'CCercle'),
    listeCible.get(ind2, 'CTransformation'))
}
CCercleImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCercle.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.transformation.depDe(p))
}
CCercleImage.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.antecedent.dependDePourBoucle(p) || this.transformation.dependDePourBoucle(p)
}
CCercleImage.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.transformation.existe && this.antecedent.existe
  if (!this.existe) return
  const point1 = {}
  this.transformation.transformePoint(this.antecedent.centreX, this.antecedent.centreY, point1)
  this.centreX = point1.x
  this.centreY = point1.y
  this.rayon = this.transformation.transformeLongueur(this.antecedent.rayon)
  CCercle.prototype.positionne.call(this, infoRandom, dimfen)
}
CCercleImage.prototype.confonduAvec = function (p) {
  if (p.className === this.className) { return (this.antecedent === p.antecedent) && this.transformation.confonduAvec(p.transformation) } else return false
}
CCercleImage.prototype.ajouteAntecedents = function (liste, app) {
  liste.add(this.antecedent)
  this.transformation.ajouteAntecedents(liste, app)
}
CCercleImage.prototype.read = function (inps, list) {
  CCercle.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.antecedent = list.get(ind1, 'CCercle')
  this.transformation = list.get(ind2, 'CTransformation')
}
CCercleImage.prototype.write = function (oups, list) {
  CCercle.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.transformation)
  oups.writeInt(ind2)
}
