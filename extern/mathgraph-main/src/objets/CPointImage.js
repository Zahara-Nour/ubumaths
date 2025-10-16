/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CPointImage

/**
 * Point image d'un autre point par une transformation.
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
 * @param {CPt} antecedent  le point dont le point est image
 * @param {CTransformation} transformation
 * @returns {void}
 */
function CPointImage (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, antecedent, transformation) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.antecedent = antecedent
    this.transformation = transformation
  }
}
CPointImage.prototype = new CPt()
CPointImage.prototype.constructor = CPointImage
CPointImage.prototype.superClass = 'CPt'
CPointImage.prototype.className = 'CPointImage'

CPointImage.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.transformation)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CPointImage(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CTransformation'))
}

CPointImage.prototype.ajouteAntecedents = function (liste, app) {
  liste.add(this.antecedent)
  this.transformation.ajouteAntecedents(liste, app)
}

CPointImage.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.transformation.depDe(p))
}

CPointImage.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.antecedent.dependDePourBoucle(p) || this.transformation.dependDePourBoucle(p)
}

CPointImage.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.transformation?.existe && this.antecedent?.existe
  if (!this.existe) return
  if (!this.transformation.pointAUneImage(this.antecedent)) {
    this.existe = false
    return
  }
  const pointim = { x: 0, y: 0 }
  this.transformation.transformePoint(this.antecedent.x, this.antecedent.y, pointim)
  CPt.prototype.placeEn.call(this, pointim.x, pointim.y)
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

CPointImage.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.transformation.confonduAvec(p.transformation) && this.antecedent.confonduAvec(p.antecedent))
  } else return false
}

CPointImage.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.antecedent === ancienPoint) this.antecedent = nouveauPoint
}

CPointImage.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.antecedent = list.get(ind1, 'CPt')
  this.transformation = list.get(ind2, 'CTransformation')
}

CPointImage.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.transformation)
  oups.writeInt(ind2)
}

CPointImage.prototype.estPointImage = function () {
  return true
}
