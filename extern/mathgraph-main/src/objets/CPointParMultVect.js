/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
import CValeur from './CValeur'
export default CPointParMultVect

/**
 * Point M défini par vect(AM) = coef*vect ou A est pointé par antecedent
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
 * @param {CPt} antecedent  Le point A tel qu'on aura vect(AM)=coef*vect
 * @param {CVecteur} vect  Le vecteur
 * @param {CValeur} coef  Le coefficient de multiplication
 * @returns {void}
 */
function CPointParMultVect (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, antecedent, vect, coef) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.antecedent = antecedent
    this.vect = vect
    this.coef = coef
  }
}
CPointParMultVect.prototype = new CPt()
CPointParMultVect.prototype.constructor = CPointParMultVect
CPointParMultVect.prototype.superClass = 'CPt'
CPointParMultVect.prototype.className = 'CPointParMultVect'

CPointParMultVect.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.vect)
  const ind3 = listeSource.indexOf(this.impProto)
  const coefClone = this.coef.getClone(listeSource, listeCible)

  return new CPointParMultVect(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, this.marquePourTrace, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CVecteur'), coefClone)
}

CPointParMultVect.prototype.initialisePourDependance = function () {
  CPt.prototype.initialisePourDependance.call(this)
  this.coef.initialisePourDependance()
}

CPointParMultVect.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.vect.depDe(p) || this.coef.depDe(p))
}

CPointParMultVect.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.antecedent.dependDePourBoucle(p) || this.vect.dependDePourBoucle(p)) ||
    this.coef.dependDePourBoucle(p)
}

CPointParMultVect.prototype.positionne = function (infoRandom, dimfen) {
  this.coef.positionne(infoRandom, dimfen)
  this.existe = this.antecedent?.existe && this.vect?.existe && this.coef.existe
  if (!this.existe) return
  const k = this.coef.rendValeur()
  CPt.prototype.placeEn.call(this, this.antecedent.x + k * (this.vect.x2 - this.vect.x1),
    this.antecedent.y + k * (this.vect.y2 - this.vect.y1))
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

// Ajout version 6.3.0
CPointParMultVect.prototype.positionneFull = function (infoRandom, dimfen) {
  this.coef.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CPointParMultVect.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.antecedent === p.antecedent) && (this.vect === p.vect) && this.coef.confonduAvec(p.coef)
  } else return false
}

CPointParMultVect.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.antecedent === ancienPoint) this.antecedent = nouveauPoint
}
CPointParMultVect.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.antecedent = list.get(ind1, 'CPt')
  this.vect = list.get(ind2, 'CVecteur')
  this.coef = new CValeur()
  this.coef.read(inps, list)
}

CPointParMultVect.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.vect)
  oups.writeInt(ind2)
  this.coef.write(oups, list)
}
