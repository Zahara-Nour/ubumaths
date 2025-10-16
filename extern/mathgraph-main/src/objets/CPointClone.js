/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CPointClone

/**
 * Classe représentant un point clone d'un point existant.
 * Il a ses éléments graphisques propres mais est placé aux coordonnées de point
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
 * @param {CPt} point  point dont l'objet est clone
 * @returns {void}
 */
function CPointClone (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, point) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.point = point
  }
}
CPointClone.prototype = new CPt()
CPointClone.prototype.constructor = CPointClone
CPointClone.prototype.superClass = 'CPt'
CPointClone.prototype.className = 'CPointClone'

CPointClone.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.point)
  return new CPointClone(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind2, 'CPt'))
}
/* Abandonné version 6.9.1 : NatObj.NPointClone ne sert pas. Donc renvoie NatObj.NPoint
CPointClone.prototype.getNature = function () {
  return NatObj.NPointClone
}
 */
CPointClone.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) || this.point.depDe(p))
}
CPointClone.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.point.dependDePourBoucle(p)
}

CPointClone.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.point.existe
  this.x = this.point.x
  this.y = this.point.y
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

CPointClone.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point)
}

// On peut  créer autant de clones d'un même objet qu'on souhaite
CPointClone.prototype.confonduAvec = function () {
  return false
}

CPointClone.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.point = list.get(ind1, 'CPt')
}

CPointClone.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point)
  oups.writeInt(ind1)
}
