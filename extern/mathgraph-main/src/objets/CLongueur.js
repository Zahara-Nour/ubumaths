/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import CElementBase from './CElementBase'
import CValDyn from './CValDyn'
export default CLongueur

/**
 * Classe repréésentant une mesure de longueur dans la figure.
 * Si c'est la longueur unité de la figure, this.listeProprietaire.pointeurLongueurUnite
 * pointe sur cet objet et la valeur renvoyée est 1.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} point1  Première extrémité du segment mesuré.
 * @param {CPt} point2  Deuxième extrémité du segment mesuré.
 * @returns {CLongueur}
 */
function CLongueur (listeProprietaire, impProto, estElementFinal, point1, point2) {
  if (arguments.length === 1) CElementBase.call(this, listeProprietaire)
  else {
    CElementBase.call(this, listeProprietaire, impProto, estElementFinal)
    this.point1 = point1
    this.point2 = point2
  }
}
CLongueur.prototype = new CValDyn()
CLongueur.prototype.constructor = CLongueur
CLongueur.prototype.superClass = 'CValDyn'
CLongueur.prototype.className = 'CLongueur'

CLongueur.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.point1)
  const ind2 = listeSource.indexOf(this.point2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CLongueur(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'))
}
CLongueur.prototype.getNatureCalcul = function () {
  return NatCal.NMesureLongueur
}
CLongueur.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.point1)
  liste.add(this.point2)
}
CLongueur.prototype.setClone = function (ptel) {
  this.longueur = ptel.longueur
}
CLongueur.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  const resultat = CValDyn.prototype.depDe.call(this, p) || this.point1.depDe(p) || this.point2.depDe(p)
  if ((this.listeProprietaire.pointeurLongueurUnite === this) ||
    this.listeProprietaire.pointeurLongueurUnite === null) { return this.memDep(resultat) } else return this.memDep(resultat || (this.listeProprietaire.pointeurLongueurUnite.depDe(p)))
}
CLongueur.prototype.dependDePourBoucle = function (p) {
  const resultat = (p === this) || this.point1.dependDePourBoucle(p) || this.point2.dependDePourBoucle(p)
  if ((this.listeProprietaire.pointeurLongueurUnite === this) ||
    this.listeProprietaire.pointeurLongueurUnite === null) { return resultat } else return resultat || (this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p))
}
CLongueur.prototype.nomIndispensable = function (el) {
  return ((el === this.point1) || (el === this.point2))
}
CLongueur.prototype.rendLongueur = function () {
  const u = new Vect(this.point1, this.point2)
  return u.norme()
}
CLongueur.prototype.positionne = function (infoRandom, dimfen) {
  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  if (this === pLongUnite) {
    this.existe = this.point1.existe && this.point2.existe && (this.rendLongueur() !== 0)
    this.longueur = 1
    return
  }
  this.existe = this.point1.existe && this.point2.existe && pLongUnite.existe
  if (!this.existe) return
  const longueurUnite = pLongUnite.rendLongueur()
  if (longueurUnite === 0) {
    this.existe = false
    return
  }
  const u = new Vect(this.point1, this.point2)
  this.longueur = u.norme() / longueurUnite
}
CLongueur.prototype.rendValeur = function () {
  return this.longueur
}
CLongueur.prototype.chaineCommenceParNom = function (pChaine, longueurNom) {
  // Pour une longueur AB par exemple, le nom BA est équivalent
  if (CValDyn.prototype.chaineCommenceParNom.call(this, pChaine, longueurNom)) {
    return true
  } else {
    const chaineNom = this.point2.nom + this.point1.nom
    longueurNom.x = chaineNom.length
    const longueurChaine2 = pChaine.length
    if (longueurChaine2 < longueurNom.x) return false
    else return (chaineNom === pChaine.substring(0, longueurNom.x))
  }
}
CLongueur.prototype.chaineEgaleANom = function (ch) {
  if (CValDyn.prototype.chaineEgaleANom.call(this, ch)) return true
  const ch2 = this.point2.nom + this.point1.nom
  return (ch === ch2)
}
/**
 * Retourne un nom (concaténation des noms des deux points
 * @returns {string}
 */
CLongueur.prototype.getNom = function () {
  return this.point1.nom + this.point2.nom
}
/**
 *
 * @param p
 * @returns {boolean}
 */
CLongueur.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (((this.point1 === p.point1) && (this.point2 === p.point2)) ||
    ((this.point2 === p.point1) && (this.point1 === p.point2)))
  }
  return false
}
CLongueur.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.point1 === ancienPoint) this.point1 = nouveauPoint
  if (this.point2 === ancienPoint) this.point2 = nouveauPoint
}
/**
 *
 * Renvoie true si le nom de la valeur commence par la chaîne st
 * @param st
 * @returns {boolean}
 */
CLongueur.prototype.nomCommencePar = function (st) {
  if (CValDyn.prototype.nomCommencePar.call(this, st)) return true
  const ch = this.point2.nom + this.point1.nom
  return ch.indexOf(st) === 0
}

CLongueur.prototype.read = function (inps, list) {
  CValDyn.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.point1 = list.get(ind1, 'CPt')
  this.point2 = list.get(ind2, 'CPt')
  if (list.pointeurLongueurUnite === null) list.pointeurLongueurUnite = this
}
CLongueur.prototype.write = function (oups, list) {
  CValDyn.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.point1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.point2)
  oups.writeInt(ind2)
}
