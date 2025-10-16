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
import CCalculAncetre from './CCalculAncetre'

export default CMesureAngleOriente

/**
 * Classe représentant la mesure d'un angle orienté donné par trois points.
 * @constructor
 * @extends CMesureAngleGeometrique
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {CPt} a  Premier point (angle aob)
 * @param {CPt} o  Le sommet de l'angle
 * @param {CPt} b  Le troisème point (angle aob)
 * @param {string} nomCalcul  Le nom de la mesure
 * @returns {CMesureAngleOriente}
 */
function CMesureAngleOriente (listeProprietaire, impProto, estElementFinal, a, o, b, nomCalcul) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.a = a
    this.o = o
    this.b = b
  }
}
CMesureAngleOriente.prototype = new CCalculAncetre()
CMesureAngleOriente.prototype.constructor = CMesureAngleOriente
CMesureAngleOriente.prototype.superClass = 'CCalculAncetre'
CMesureAngleOriente.prototype.className = 'CMesureAngleOriente'

// Ajout version 5.0
CMesureAngleOriente.prototype.numeroVersion = function () {
  return 2
}

CMesureAngleOriente.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.a)
  const ind2 = listeSource.indexOf(this.o)
  const ind3 = listeSource.indexOf(this.b)
  const ind4 = listeSource.indexOf(this.impProto)
  // Ajout version 5.0
  const nomCalc = (this.nomCalcul === '') ? listeCible.genereNomPourCalcul('mesang') : this.nomCalcul
  //
  return new CMesureAngleOriente(listeCible, listeCible.get(ind4, 'CImplementationProto'),
    this.estElementFinal, listeCible.get(ind1, 'CPt'), listeCible.get(ind2, 'CPt'),
    listeCible.get(ind3, 'CPt'), nomCalc)
}
CMesureAngleOriente.prototype.getNatureCalcul = function () {
  return NatCal.NMesureAngleOriente
}
CMesureAngleOriente.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.a.depDe(p) || this.o.depDe(p) || this.b.depDe(p))
}
CMesureAngleOriente.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.a.dependDePourBoucle(p) || this.o.dependDePourBoucle(p) ||
    this.b.dependDePourBoucle(p)
}
CMesureAngleOriente.prototype.nomIndispensable = function (el) {
  return ((el === this.a) || (el === this.o) || (el === this.b))
}
CMesureAngleOriente.prototype.rendValeur = function () {
  return this.mesure
}
CMesureAngleOriente.prototype.positionne = function (infoRandom, dimfen) {
  let resul

  this.existe = this.a.existe && this.o.existe && this.b.existe &&
    !(this.o.egal(this.a)) && !(this.o.egal(this.b))
  if (!this.existe) return
  // L'orientation sur l'écran est l'inverse de celle du repère
  // choisi.Il faut donc permuter les rôles de U et V
  const v = new Vect(this.o, this.a)
  const u = new Vect(this.o, this.b)
  const prosca = u.x * v.x + u.y * v.y
  const deter = u.x * v.y - u.y * v.x
  if (prosca === 0) {
    if (deter > 0) resul = Math.PI / 2
    else resul = -Math.PI / 2
  } else {
    const tangente = deter / prosca
    if (prosca > 0) resul = Math.atan(tangente)
    else {
      if (deter >= 0) resul = Math.atan(tangente) + Math.PI
      else resul = Math.atan(tangente) - Math.PI
    }
  }
  // Nouveau pour version 1.3.6 : on regarde si l'angle est très proche de - pi. Si oui on renvoie pi
  if (Math.abs(resul + Math.PI) < 1e-13)resul = Math.PI
  if (this.listeProprietaire.uniteAngle === uniteAngleRadian) this.mesure = resul
  else this.mesure = resul * ConvRadDeg
}
CMesureAngleOriente.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return ((this.o === p.o) && (this.a === p.a) && (this.b === p.b))
  } else return false
}
CMesureAngleOriente.prototype.remplacePoint = function (ancienPoint, nouveauPoint) {
  if (this.a === ancienPoint) this.a = nouveauPoint
  if (this.o === ancienPoint) this.o = nouveauPoint
  if (this.b === ancienPoint) this.b = nouveauPoint
}

// Ajouts version 5.0 car maintenant dérive de CCalculAncetre
CMesureAngleOriente.prototype.read = function (inps, list) {
  if (this.nVersion >= 2) CCalculAncetre.prototype.read.call(this, inps, list)
  else {
    CValDyn.prototype.read.call(this, inps, list)
    if (this.listeProprietaire.className === 'CPrototype') this.nomCalcul = 'ang'
    else this.nomCalcul = this.listeProprietaire.genereNomPourCalcul('ang')
  }
  const ind1 = inps.readInt()
  const ind2 = inps.readInt()
  const ind3 = inps.readInt()
  this.a = list.get(ind1, 'CPt')
  this.o = list.get(ind2, 'CPt')
  this.b = list.get(ind3, 'CPt')
}
CMesureAngleOriente.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.a)
  oups.writeInt(ind1)
  const ind2 = list.indexOf(this.o)
  oups.writeInt(ind2)
  const ind3 = list.indexOf(this.b)
  oups.writeInt(ind3)
}
