/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Vect from '../types/Vect'
import { ConvRadDeg, uniteAngleRadian } from '../kernel/kernel'
import CValDyn from './CValDyn'

export default CMesureAngleGeometrique

/**
 * Classe représentant la mesure d'un angle non orienté donné par trois points.
 * @constructor
 * @extends CValDyn
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} a  Premier point (angle aob)
 * @param {CPt} o  Le sommet de l'angle
 * @param {CPt} b  Le troisème point (angle aob)
 * @returns {CMesureAngleGeometrique}
 */
function CMesureAngleGeometrique (listeProprietaire, impProto, estElementFinal, a, o, b) {
  if (arguments.length === 1) CValDyn.call(this, listeProprietaire)
  else {
    CValDyn.call(this, listeProprietaire, impProto, estElementFinal)
    this.a = a
    this.o = o
    this.b = b
    this.mesure = 0
  }
}
CMesureAngleGeometrique.prototype = new CValDyn()
CMesureAngleGeometrique.prototype.constructor = CMesureAngleGeometrique
CMesureAngleGeometrique.prototype.superClass = 'CValDyn'
CMesureAngleGeometrique.prototype.className = 'CMesureAngleGeometrique'

CMesureAngleGeometrique.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.b)
  const ind4 = listeSource.indexOf(this.impProto)
  return new CMesureAngleGeometrique(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'),
    listeCible.get(ind2, 'CPt'), listeCible.get(ind3, 'CPt'))
}
CMesureAngleGeometrique.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAngleNonOriente
}
CMesureAngleGeometrique.prototype.ajouteAntecedents = function (liste) {
  liste.add(this.a)
  liste.add(this.o)
  liste.add(this.b)
}
CMesureAngleGeometrique.prototype.setClone = function (ptel) {
  this.mesure = ptel.mesure
}
CMesureAngleGeometrique.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CValDyn.prototype.depDe.call(this, p) ||
    this.a.depDe(p) || this.o.depDe(p) || this.b.depDe(p))
}
CMesureAngleGeometrique.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.a.dependDePourBoucle(p) || this.o.dependDePourBoucle(p) ||
    this.b.dependDePourBoucle(p)
}
/**
 * Retourne le nom (concaténation des noms des objets des propriétés a, o et b)
 * @returns {string}
 */
CMesureAngleGeometrique.prototype.getNom = function () {
  return this.a.nom + this.o.nom + this.b.nom
}
CMesureAngleGeometrique.prototype.positionne = function (infoRandom, dimfen) {
  let resul

  this.existe = this.a.existe && this.o.existe && this.b.existe &&
    !(this.o.egal(this.a)) && !(this.o.egal(this.b))
  if (!this.existe) return
  // L'orientation sur l'écran est l'inverse de celle du
  // repère choisi.Il faut donc permuter les rôles de u et v}
  const v = new Vect(this.o, this.a)
  const u = new Vect(this.o, this.b)
  const prosca = u.x * v.x + u.y * v.y
  const deter = Math.abs(u.x * v.y - u.y * v.x)
  if (prosca === 0) resul = Math.PI / 2
  else {
    const tangente = deter / prosca
    if (prosca > 0) { resul = Math.atan(tangente) } else {
      resul = Math.PI - Math.atan(-tangente)
      if (resul > Math.PI) resul = resul - 2 * Math.PI
    }
    resul = Math.abs(resul)
  }
  if (this.listeProprietaire.uniteAngle === uniteAngleRadian) this.mesure = resul
  else this.mesure = resul * ConvRadDeg
}
CMesureAngleGeometrique.prototype.nomIndispensable = function (el) {
  return ((el === this.a) || (el === this.o) || (el === this.b))
}
CMesureAngleGeometrique.prototype.rendValeur = function () {
  return this.mesure
}
CMesureAngleGeometrique.prototype.chaineCommenceParNom = function (pChaine, longueurNom) {
  if (CValDyn.prototype.chaineCommenceParNom.call(this, pChaine, longueurNom)) {
    return true
  } else {
    const chaineNom = this.b.nom + this.o.nom + this.a.nom
    longueurNom.x = chaineNom.length
    const longueurChaine2 = pChaine.length
    if (longueurChaine2 < longueurNom.x) return false
    else return chaineNom === pChaine.substring(0, longueurNom.x)
  }
}
CMesureAngleGeometrique.prototype.chaineEgaleANom = function (ch) {
  if (CValDyn.prototype.chaineEgaleANom.call(this, ch)) return true
  const ch2 = this.b.nom + this.o.nom + this.a.nom
  return (ch === ch2)
}

CMesureAngleGeometrique.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.o === p.o) &&
    (((this.a === p.a) && (this.b === p.b)) ||
    ((this.a === p.b) && (this.b === p.a))))
  } else return false
}
CMesureAngleGeometrique.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
}
CMesureAngleGeometrique.prototype.read = function (inps, list) {
  CValDyn.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.o = list.get(ind2, 'CPt')
  this.b = list.get(ind3, 'CPt')
}
CMesureAngleGeometrique.prototype.write = function (oups, list) {
  CValDyn.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.o)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.b)
  oups.writeInt(ind3)
}
