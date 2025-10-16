/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import CCalculAncetre from './CCalculAncetre'
export default CPartieReelle

/**
 * Objet calcul donnant comme résultat la partie réelle d'un calcul complexe.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul
 * @param {CValDyn} complexeAssocie  Le complexe dont on calcule la partie réelle.
 * @returns {CPartieReelle}
 */
function CPartieReelle (listeProprietaire, impProto, estElementFinal, nomCalcul, complexeAssocie) {
  if (arguments.length === 0) return // Ajout version WebPack
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.complexeAssocie = complexeAssocie
  }
  this.resultat = 0
  this.z1 = new Complexe()
}
CPartieReelle.prototype = new CCalculAncetre()
CPartieReelle.prototype.constructor = CPartieReelle
CPartieReelle.prototype.superClass = 'CCalculAncetre'
CPartieReelle.prototype.className = 'CPartieReelle'

CPartieReelle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.complexeAssocie)
  const ind2 = listeSource.indexOf(this.impProto)
  return new CPartieReelle(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CValDyn'))
}
CPartieReelle.prototype.getNatureCalcul = function () {
  return NatCal.NPartieReelle
}
CPartieReelle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.complexeAssocie.depDe(p))
}
CPartieReelle.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.complexeAssocie.dependDePourBoucle(p)
}
CPartieReelle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.complexeAssocie.existe
  if (!this.existe) return
  this.complexeAssocie.rendValeurComplexe(this.z1)
  this.resultat = this.z1.x
}
CPartieReelle.prototype.rendValeur = function () {
  return this.resultat
}
CPartieReelle.prototype.confonduAvec = function (p) {
  // CPartieReelle pt;
  if (p.className === this.className) {
    return this.complexeAssocie === p.complexeAssocie
  } else return false
}
CPartieReelle.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.complexeAssocie = list.get(ind1, 'CValDyn')
}
CPartieReelle.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.complexeAssocie)
  oups.writeInt(ind1)
}
CPartieReelle.prototype.estConstant = function () {
  return this.complexeAssocie.estConstant()
}
