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
import { aligne } from 'src/kernel/kernelVect'

export default CMesureAbscisse

/**
 * Classe représentant l'abscisse d'un point sur une droite dans un repère formé par deux points.
 * Pour que l'objet existe, les points doivent être alignés (à epsilon près).
 * @constructor
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} origine  Le point origine pour la mesure.
 * @param {CPt} extremite  Le point d'abscisse 1 pour la mesure.
 * @param {CPt} pointMesure  Le point dont on mesure l'abscisse.
 * @param {string} nomCalcul  Le nom de la mesure
 * @returns {CMesureAbscisse}
 */
function CMesureAbscisse (listeProprietaire, impProto, estElementFinal, origine, extremite,
  pointMesure, nomCalcul) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.origine = origine
    this.extremite = extremite
    this.pointMesure = pointMesure
    this.abscisse = 0
  }
}
CMesureAbscisse.prototype = new CCalculAncetre()
CMesureAbscisse.prototype.constructor = CMesureAbscisse
CMesureAbscisse.prototype.superClass = 'CCalculAncetre'
CMesureAbscisse.prototype.className = 'CMesureAbscisse'

// Ajout version 5.0
CMesureAbscisse.prototype.numeroVersion = function () {
  return 2
}

CMesureAbscisse.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.origine)
  const ind2 = listeSource.indexOf(this.extremite)
  const ind3 = listeSource.indexOf(this.pointMesure)
  const ind4 = listeSource.indexOf(this.impProto)
  // Ajout version 5.0
  const nomCalc = (this.nomCalcul === '') ? listeCible.genereNomPourCalcul('abs') : this.nomCalcul
  //
  return new CMesureAbscisse(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'), nomCalc)
}
CMesureAbscisse.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAbscisseSurDroite
}
CMesureAbscisse.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.origine)
  liste.add(this.extremite)
  liste.add(this.pointMesure)
}
CMesureAbscisse.prototype.setClone = function (ptel) {
  this.abscisse = ptel.abscisse
}
CMesureAbscisse.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.origine.depDe(p) || this.extremite.depDe(p) || this.pointMesure.depDe(p))
}
CMesureAbscisse.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.origine.dependDePourBoucle(p) || this.extremite.dependDePourBoucle(p) ||
    this.pointMesure.dependDePourBoucle(p)
}
CMesureAbscisse.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.origine.existe && this.extremite.existe &&
    this.pointMesure.existe && !(this.origine.egal(this.extremite))
  this.existe = this.existe && aligne(this.origine.x, this.origine.y, this.extremite.x,
    this.extremite.y, this.pointMesure.x, this.pointMesure.y)
  if (!this.existe) return
  // L'orientation sur l'écran est l'inverse de celle du repère
  // choisi.Il faut donc permuter les rôles de u et v}
  const v = new Vect(this.origine, this.extremite)
  const u = new Vect(this.origine, this.pointMesure)
  // Nouvelle modif
  if (Math.abs(v.x) > Math.abs(v.y)) this.abscisse = u.x / v.x
  else this.abscisse = u.y / v.y
}
CMesureAbscisse.prototype.nomIndispensable = function (el) {
  return ((el === this.origine) || (el === this.extremite) || (el === this.pointMesure))
}
CMesureAbscisse.prototype.rendValeur = function () {
  return this.abscisse
}
CMesureAbscisse.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.origine === p.origine) &&
    (this.extremite === p.extremite &&
    (this.pointMesure === p.pointMesure)))
  } else return false
}
CMesureAbscisse.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.origine === ancienPoint) this.origine = nouveauPoint
  if (this.extremite === ancienPoint) this.extremite = nouveauPoint
  if (this.pointMesure === ancienPoint) this.pointMesure = nouveauPoint
}
CMesureAbscisse.prototype.read = function (inps, list) {
  // CValDyn.prototype.read.call(this, inps, list); Modifié version 5.0
  if (this.nVersion >= 2) CCalculAncetre.prototype.read.call(this, inps, list)
  else {
    CValDyn.prototype.read.call(this, inps, list)
    if (this.listeProprietaire.className === 'CPrototype') this.nomCalcul = 'abs'
    else this.nomCalcul = this.listeProprietaire.genereNomPourCalcul('abs')
  }
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.origine = list.get(ind1, 'CPt')
  this.extremite = list.get(ind2, 'CPt')
  this.pointMesure = list.get(ind3, 'CPt')
}
CMesureAbscisse.prototype.write = function (oups, list) {
  // CValDyn.prototype.write.call(this, oups, list); Modifié version 5.0
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.origine)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.extremite)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.pointMesure)
  oups.writeInt(ind3)
}
