/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
export default CTestExistence

/**
 * Objet de type calcul servant à savoir si un objet numérique déjà créé existe ou non.
 * Renvoie 1 si l'objet existe et 0 sinon.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CValDyn} valeurAssociee  La valeur dont on teste l'existence.
 * @returns {CTestExistence}
 */
function CTestExistence (listeProprietaire, impProto, estElementFinal, nomCalcul, valeurAssociee) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.valeurAssociee = valeurAssociee
    }
  }
}
CTestExistence.prototype = new CCalculAncetre()
CTestExistence.prototype.constructor = CTestExistence
CTestExistence.prototype.superClass = 'CCalculAncetre'
CTestExistence.prototype.className = 'CTestExistence'

CTestExistence.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.valeurAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CTestExistence(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CValDyn'))
}
CTestExistence.prototype.getNatureCalcul = function () {
  return NatCal.NTestExistence
}
CTestExistence.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.valeurAssociee.depDe(p))
}
CTestExistence.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.valeurAssociee.dependDePourBoucle(p)
}
CTestExistence.prototype.rendValeur = function () {
  if (this.valeurAssociee.existe) return 1
  else return 0
}
/* Supprimé version 7.3 car ne sert pas
CTestExistence.prototype.confonduAvec = function (p) {
  if (p.className === this.className) return this.valeurAssociee === p.valeurAssociee
  else return false
}
 */
CTestExistence.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.valeurAssociee = list.get(ind1, 'CValDyn')
}
CTestExistence.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.valeurAssociee)
  oups.writeInt(ind1)
}
