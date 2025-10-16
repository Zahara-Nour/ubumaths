/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import Vect from '../types/Vect'
import CValDyn from './CValDyn'
import CCalculAncetre from './CCalculAncetre'
export default CMesureAffixe

/**
 * Classe représentant la mesure de l'affixe complexe d'un point dans un repère.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CRepere} repereAssocie  Le repère dans lequel se fait la mesure
 * @param {CPt} pointMesure  Le point dont on mesure l'affixe.
 * @param {string} nomCalcul  Le nom du calcul
 */
function CMesureAffixe (listeProprietaire, impProto, estElementFinal, repereAssocie, pointMesure, nomCalcul) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.repereAssocie = repereAssocie
    this.pointMesure = pointMesure
  }
  this.affixe = new Complexe()
}
CMesureAffixe.prototype = new CCalculAncetre()
CMesureAffixe.prototype.constructor = CMesureAffixe
CMesureAffixe.prototype.superClass = 'CCalculAncetre'
CMesureAffixe.prototype.className = 'CMesureAffixe'

CMesureAffixe.prototype.numeroVersion = function () {
  return 2
}

CMesureAffixe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.repereAssocie)
  const ind2 = listeSource.indexOf(this.pointMesure)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CMesureAffixe(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CRepere'), listeCible.get(ind2, 'CPt'), this.nomCalcul)
}
CMesureAffixe.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAffixe
}
CMesureAffixe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.repereAssocie.depDe(p) || this.pointMesure.depDe(p))
}
CMesureAffixe.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.repereAssocie.dependDePourBoucle(p) || this.pointMesure.dependDePourBoucle(p)
}
CMesureAffixe.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.repereAssocie?.existe && this.pointMesure?.existe
  if (!this.existe) return
  // L'orientation sur l'écran est l'inverse de celle du repère
  // choisi.Il faut donc permuter les rôles de u et v}
  const u = new Vect(this.repereAssocie.o, this.repereAssocie.i)
  const v = new Vect(this.repereAssocie.o, this.repereAssocie.j)
  // Calcul des  abscisses et ordonnées de l'origine réelle du repère dans le repère de base
  const absOrigine = this.repereAssocie.valAbscisseOrigine / this.repereAssocie.unitex
  const ordOrigine = this.repereAssocie.valOrdonneeOrigine / this.repereAssocie.unitey
  const xno = this.repereAssocie.o.x - u.x * absOrigine - v.x * ordOrigine
  const yno = this.repereAssocie.o.y - u.y * absOrigine - v.y * ordOrigine
  // Calcul de l'abscisse et de l'ordonnée par résolution d'un système linéaire
  const det = u.x * v.y - v.x * u.y
  this.affixe.x = (v.y * (this.pointMesure.x - xno) - v.x * (this.pointMesure.y - yno)) / det * this.repereAssocie.unitex
  this.affixe.y = (u.x * (this.pointMesure.y - yno) - u.y * (this.pointMesure.x - xno)) / det * this.repereAssocie.unitey
}
CMesureAffixe.prototype.nomIndispensable = function (el) {
  return (el === this.pointMesure)
}
CMesureAffixe.prototype.rendValeurComplexe = function (zRes) {
  zRes.set(this.affixe.x, this.affixe.y)
}
CMesureAffixe.prototype.rendChaineValeurPourCommentaire = function (nbDecimales) {
  return this.rendChaineValeurComplexe(nbDecimales)
}
CMesureAffixe.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.repereAssocie === p.repereAssocie) && (this.pointMesure === p.pointMesure)
  } else return false
}
CMesureAffixe.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointMesure)
}
CMesureAffixe.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointMesure === ancienPoint) this.pointMesure = nouveauPoint
}
CMesureAffixe.prototype.read = function (inps, list) {
  // CValDyn.prototype.read.call(this, inps, list); Modifié version 5.0
  if (this.nVersion >= 2) CCalculAncetre.prototype.read.call(this, inps, list)
  else {
    CValDyn.prototype.read.call(this, inps, list)
    if (this.listeProprietaire.className === 'CPrototype') this.nomCalcul = 'aff'
    else this.nomCalcul = this.listeProprietaire.genereNomPourCalcul('aff')
  }
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.repereAssocie = list.get(ind1, 'CRepere')
  this.pointMesure = list.get(ind2, 'CPt')
}
CMesureAffixe.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.repereAssocie)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.pointMesure)
  oups.writeInt(ind2)
}
