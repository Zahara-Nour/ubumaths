/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CMilieu

/**
 * Classe point milieu donné par deux points.
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
 * @param {CPt} point1  Le premier point.
 * @param {CPt} point2  Le deuxième point.
 * @returns {CMilieu}
 */
function CMilieu (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, point1, point2) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.point1 = point1
    this.point2 = point2
  }
}
CMilieu.prototype = new CPt()
CMilieu.prototype.constructor = CMilieu
CMilieu.prototype.superClass = 'CPt'
CMilieu.prototype.className = 'CMilieu'

CMilieu.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.point1)
  const ind2 = listeSource.indexOf(this.point2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMilieu(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'))
}
CMilieu.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point1)
  liste.add(this.point2)
}
CMilieu.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = (this.point1.existe) && (this.point2.existe)
  if (this.existe) {
    CPt.prototype.placeEn.call(this, (this.point1.x + this.point2.x) / 2, (this.point1.y + this.point2.y) / 2)
    CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajouté version 4.6.4
  }
}
CMilieu.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.point1.depDe(p) || this.point2.depDe(p))
}
CMilieu.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.point1.dependDePourBoucle(p) || this.point2.dependDePourBoucle(p)
}
CMilieu.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.point1 === p.point1) && (this.point2 === p.point2)) ||
    ((this.point2 === p.point1) && (this.point1 === p.point2)))
  } else return false
}
CMilieu.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point1 === ancienPoint) this.point1 = nouveauPoint
  if (this.point2 === ancienPoint) this.point2 = nouveauPoint
}
CMilieu.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
}
CMilieu.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
}
