/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CCentreGravite

/**
 * Classe représentant le centre de gravité d'un triangle donné par 3 points.
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
 * @param {number} tailleNom  taille du nom (voir Fonte)
 * @param {MotifPoint} motif  Le motif du point.
 * @param {boolean} marquePourTrace  true si le point est marqué pour la trace
 * @param {CPt} point1  Le premier sommet du triangle.
 * @param {CPt} point2  Le second sommet du triangle.
 * @param {CPt} point3  Le troisième sommet du triangle.
 * @constructor
 */
function CCentreGravite (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, point1, point2, point3) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.point1 = point1
    this.point2 = point2
    this.point3 = point3
  }
}
CCentreGravite.prototype = new CPt()
CCentreGravite.prototype.constructor = CCentreGravite
CCentreGravite.prototype.superClass = 'CPt'
CCentreGravite.prototype.className = 'CCentreGravite'

CCentreGravite.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.point1)
  const ind2 = listeSource.indexOf(this.point2)
  const ind3 = listeSource.indexOf(this.point3)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CCentreGravite(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque,
    this.nom, this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'),
    this.marquePourTrace)
}
CCentreGravite.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point1)
  liste.add(this.point2)
  liste.add(this.point3)
}
CCentreGravite.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
  this.point1.depDe(p) ||
  this.point2.depDe(p) ||
  this.point3.depDe(p))
}
CCentreGravite.prototype.dependDePourBoucle = function (p) {
  return ((p === this) ||
  this.point1.dependDePourBoucle(p) ||
  this.point2.dependDePourBoucle(p) ||
  this.point3.dependDePourBoucle(p))
}
CCentreGravite.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.point1?.existe && this.point2?.existe && this.point3?.existe
  if (this.existe) {
    CPt.prototype.placeEn.call(this,
      (this.point1.x + this.point2.x + this.point3.x) / 3, (this.point1.y + this.point2.y + this.point3.y) / 3)
    CPt.prototype.positionne.call(this, infoRandom, dimfen) // Ajouté version 4.6.4
  }
}
CCentreGravite.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.point1 === p.point1) && (this.point2 === p.point2) && (this.point3 === p.point3)) ||
          ((this.point1 === p.point1) && (this.point2 === p.point3) && (this.point3 === p.point2)) ||
          ((this.point1 === p.point2) && (this.point2 === p.point3) && (this.point3 === p.point1)) ||
          ((this.point1 === p.point2) && (this.point2 === p.point1) && (this.point3 === p.point3)) ||
          ((this.point1 === p.point3) && (this.point2 === p.point2) && (this.point3 === p.point1)) ||
          ((this.point1 === p.point3) && (this.point2 === p.point1) && (this.point3 === p.point2)))
  } else return false
}
CCentreGravite.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point1 === ancienPoint) this.point1 = nouveauPoint
  if (this.point2 === ancienPoint) this.point2 = nouveauPoint
  if (this.point3 === ancienPoint) this.point3 = nouveauPoint
}
CCentreGravite.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
  this.point3 = list.get(ind3, 'CPt')
}
CCentreGravite.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.point3)
  oups.writeInt(ind3)
}
