/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPt from './CPt'
export default CPointParSommeVect

/**
 * Point défini par vect(AM) = vecteur1 + vecteur2, où A est pointé par antecedent
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
 * @param {CPt} antecedent
 * @param {CVecteur} vecteur1
 * @param {CVecteur} vecteur2
 * @returns {void}
 */
function CPointParSommeVect (listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
  decX, decY, masque, nom, tailleNom, motif, marquePourTrace, antecedent, vecteur1, vecteur2) {
  if (arguments.length === 1) CPt.call(this, listeProprietaire)
  else {
    CPt.call(this, listeProprietaire, impProto, estElementFinal, couleur, nomMasque,
      decX, decY, masque, nom, tailleNom, motif, marquePourTrace)
    this.antecedent = antecedent
    this.vecteur1 = vecteur1
    this.vecteur2 = vecteur2
  }
}
CPointParSommeVect.prototype = new CPt()
CPointParSommeVect.prototype.constructor = CPointParSommeVect
CPointParSommeVect.prototype.superClass = 'CPt'
CPointParSommeVect.prototype.className = 'CPointParSommeVect'

CPointParSommeVect.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.antecedent)
  const ind2 = listeSource.indexOf(this.vecteur1)
  const ind3 = listeSource.indexOf(this.vecteur2)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CPointParSommeVect(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.nomMasque, this.decX, this.decY, this.masque, this.nom,
    this.tailleNom, this.motif, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CVecteur'), listeCible.get(ind3, 'CVecteur'), this.marquePourTrace)
}

CPointParSommeVect.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CPt.prototype.depDe.call(this, p) ||
    this.antecedent.depDe(p) || this.vecteur1.depDe(p) || this.vecteur2.depDe(p))
}

CPointParSommeVect.prototype.dependDePourBoucle = function (p) {
  return ((p === this) || this.antecedent.dependDePourBoucle(p) || this.vecteur1.dependDePourBoucle(p)) || this.vecteur2.dependDePourBoucle(p)
}

CPointParSommeVect.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.antecedent?.existe && this.vecteur1?.existe && this.vecteur2?.existe
  if (!this.existe) return
  CPt.prototype.placeEn.call(this, this.antecedent.x + this.vecteur1.x2 - this.vecteur1.x1 + this.vecteur2.x2 - this.vecteur2.x1,
    this.antecedent.y + this.vecteur1.y2 - this.vecteur1.y1 + this.vecteur2.y2 - this.vecteur2.y1)
  CPt.prototype.positionne.call(this, infoRandom, dimfen)
}

CPointParSommeVect.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.antecedent.confonduAvec(p.antecedent) && ((this.vecteur1.confonduAvec(p.vecteur1) &&
      this.vecteur2.confonduAvec(p.vecteur2)) ||
      (this.vecteur1.confonduAvec(p.vecteur2) && this.vecteur2.confonduAvec(p.vecteur1))))
  } else return false
}

CPointParSommeVect.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.antecedent === ancienPoint) this.antecedent = nouveauPoint
}

CPointParSommeVect.prototype.read = function (inps, list) {
  CPt.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.antecedent = list.get(ind1, 'CPt')
  this.vecteur1 = list.get(ind2, 'CVecteur')
  this.vecteur2 = list.get(ind3, 'CVecteur')
}

CPointParSommeVect.prototype.write = function (oups, list) {
  CPt.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.antecedent)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.vecteur1)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.vecteur2)
  oups.writeInt(ind3)
}
