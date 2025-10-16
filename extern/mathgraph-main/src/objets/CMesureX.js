/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import CValDyn from './CValDyn'
import CCalculAncetre from './CCalculAncetre'
export default CMesureX

/**
 * Classe représentant la mesure de l'abscisse d'un point dans un repère.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  la liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul Le nom associé au calcul
 * @param {CRepere} repereAssocie  Le repère dans lequel on fait la mesure.
 * @param {CPt} pointMesure  Le point dont on mesure l'abscisse.
 * @returns {CMesureX}
 */
function CMesureX (listeProprietaire, impProto, estElementFinal, nomCalcul, repereAssocie,
  pointMesure) {
  if (arguments.length === 0) return // Ajout version WebPack
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.repereAssocie = repereAssocie
    this.pointMesure = pointMesure
  }
}

// CMesureX.prototype = new CValDyn(); Modifié version 5.0
CMesureX.prototype = new CCalculAncetre()
CMesureX.prototype.constructor = CMesureX
// CMesureX.prototype.superClass = "CValDyn"; Modifié version 5.0
CMesureX.prototype.superClass = 'CCalculAncetre'
CMesureX.prototype.className = 'CMesureX'

// Ajout version 5.0
CMesureX.prototype.numeroVersion = function () {
  return 2
}
// Ajout version 5.0
CMesureX.prototype.debutNom = function () {
  return 'xCoord'
}

CMesureX.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.repereAssocie)
  const ind2 = listeSource.indexOf(this.pointMesure)
  const ind3 = listeSource.indexOf(this.impProto)
  // Ajout version 5.0
  const nomCalc = (this.nomCalcul === '') ? listeCible.genereNomPourCalcul(this.debutNom()) : this.nomCalcul
  //
  return new CMesureX(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, nomCalc, listeCible.get(ind1, 'CRepere'), listeCible.get(ind2, 'CPt'))
}
CMesureX.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAbscisseRepere
}
CMesureX.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.pointMesure)
}
CMesureX.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CValDyn.prototype.depDe.call(this, p) ||
    this.repereAssocie.depDe(p) || this.pointMesure.depDe(p))
}
CMesureX.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.repereAssocie.dependDePourBoucle(p) || this.pointMesure.dependDePourBoucle(p)
}
CMesureX.prototype.positionne = function () {
  this.existe = this.repereAssocie.existe && this.pointMesure.existe
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
  // Calcul de l'abscisse par résolution d'un système linéaire
  const det = u.x * v.y - v.x * u.y
  this.abscisse = (v.y * (this.pointMesure.x - xno) - v.x * (this.pointMesure.y - yno)) / det * this.repereAssocie.unitex
}
CMesureX.prototype.rendValeur = function () {
  return this.abscisse
}
CMesureX.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.pointMesure === ancienPoint) this.pointMesure = nouveauPoint
}
CMesureX.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.repereAssocie === p.repereAssocie) && (this.pointMesure === p.pointMesure)
  } else return false
}
CMesureX.prototype.nomIndispensable = function (el) {
  return (el === this.pointMesure)
}
CMesureX.prototype.read = function (inps, list) {
  if (this.nVersion >= 2) CCalculAncetre.prototype.read.call(this, inps, list)
  else {
    CValDyn.prototype.read.call(this, inps, list)
    if (this.listeProprietaire.className === 'CPrototype') this.nomCalcul = ''
    else this.nomCalcul = this.listeProprietaire.genereNomPourCalcul(this.debutNom())
  }
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.repereAssocie = list.get(ind1, 'CRepere')
  this.pointMesure = list.get(ind2, 'CPt')
}
CMesureX.prototype.write = function (oups, list) {
  // CValDyn.prototype.write.call(this, oups, list); Modifié version 5.0
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.repereAssocie)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.pointMesure)
  oups.writeInt(ind2)
}
