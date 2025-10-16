/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import CCalculAncetre from './CCalculAncetre'
export default CProduitScalaire

/**
 * Classe représentant le résultat du produit scalaire de deux vecteurs.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul
 * @param {CVecteur} vect1  Le premier vecteur du produit scalaire.
 * @param {CVecteur} vect2  Le deuxième vecteur du produit scalaire.
 * @returns {CProduitScalaire}
 */
function CProduitScalaire (listeProprietaire, impProto, estElementFinal, nomCalcul, vect1, vect2) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.vect1 = vect1
    this.vect2 = vect2
  }
}
CProduitScalaire.prototype = new CCalculAncetre()
CProduitScalaire.prototype.constructor = CProduitScalaire
CProduitScalaire.prototype.superClass = 'CCalculAncetre'
CProduitScalaire.prototype.className = 'CProduitScalaire'

CProduitScalaire.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.vect1)
  const ind2 = listeSource.indexOf(this.vect2)
  const ind3 = listeSource.indexOf(this.impProto)
  return new CProduitScalaire(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CVecteur'), listeCible.get(ind2, 'CVecteur'))
}
CProduitScalaire.prototype.getNatureCalcul = function () {
  return NatCal.NMesureProduitScalaire
}
CProduitScalaire.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.vect1.point1)
  liste.add(this.vect1.point2)
  liste.add(this.vect1)
  liste.add(this.vect2.point1)
  liste.add(this.vect2.point2)
  liste.add(this.vect2)
}
CProduitScalaire.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.vect1.depDe(p) || this.vect2.depDe(p) || this.listeProprietaire.pointeurLongueurUnite.depDe(p))
}
CProduitScalaire.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.vect1.dependDePourBoucle(p) || this.vect2.dependDePourBoucle(p) ||
  this.listeProprietaire.pointeurLongueurUnite.dependDePourBoucle(p)
}
CProduitScalaire.prototype.positionne = function (infoRandom, dimfen) {
  const pLongUnite = this.listeProprietaire.pointeurLongueurUnite
  this.existe = this.vect1.existe && this.vect2.existe && pLongUnite.existe
  if (!this.existe) return
  const longueurUnite = pLongUnite.rendLongueur()
  // Si la longueur unité est nulle, pLongUnite n'existe pas
  const v1 = new Vect(this.vect1.point1, this.vect1.point2)
  const v2 = new Vect(this.vect2.point1, this.vect2.point2)
  const n1 = v1.norme() / longueurUnite
  const n2 = v2.norme() / longueurUnite
  if ((n1 === 0) || (n2 === 0)) {
    this.prosca = 0
    return
  }
  const ang = v1.mesureAngleVecteurs(v2)
  this.prosca = n1 * n2 * Math.cos(ang)
}
CProduitScalaire.prototype.rendValeur = function () {
  return this.prosca
}
CProduitScalaire.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.vect1 === p.vect1) && (this.vect2 === p.vect2)) || ((this.vect1 === p.vect2) && (this.vect2 === p.vect1))
  } else return false
}
CProduitScalaire.prototype.nomIndispensable = function (el) {
  return (el === this.vect1.point1) || (el === this.vect1.point2) || (el === this.vect2.point1) || (el === this.vect2.point2)
}
CProduitScalaire.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  this.vect1 = list.get(ind1, 'CVecteur')
  this.vect2 = list.get(ind2, 'CVecteur')
}
CProduitScalaire.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.vect1)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.vect2)
  oups.writeInt(ind2)
}
