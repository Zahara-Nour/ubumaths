/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
export default CMaxFonc

/**
 * Classe représentant le calcul du minimum d'une fonction sur un intervalle.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou a construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction
 * @param {string} nomCalcul  Le nom donné au calcul.
 * @param {CFonc} fonctionAssociee  La fonction utilisateur dont on cherche le maximum.
 * @param {CValeur} a  La borne inférieure de l'intervalle de recherche.
 * @param {CValeur} b  La borne supérieure de l'intervalle de recherche.
 * @param {CValeur} incertitude  L'incertitude demandée.
 * @returns {CMaxFonc}
 */
function CMaxFonc (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  a, b, incertitude) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.fonctionAssociee = fonctionAssociee
      this.a = a
      this.b = b
      this.incertitude = incertitude
    }
  }
}
CMaxFonc.prototype = new CCalculAncetre()
CMaxFonc.prototype.constructor = CMaxFonc
CMaxFonc.prototype.superClass = 'CCalculAncetre'
CMaxFonc.prototype.className = 'CMaxFonc'

CMaxFonc.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const aClone = this.a.getClone(listeSource, listeCible)
  const bClone = this.b.getClone(listeSource, listeCible)
  const incertitudeClone = this.incertitude.getClone(listeSource, listeCible)
  return new CMaxFonc(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFonc'), aClone,
    bClone, incertitudeClone)
}
CMaxFonc.prototype.getNatureCalcul = function () {
  return NatCal.NMaximumFonction
}
CMaxFonc.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.a.initialisePourDependance()
  this.b.initialisePourDependance()
  this.incertitude.initialisePourDependance()
}
CMaxFonc.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe(p) || this.a.depDe(p) || this.b.depDe(p) ||
    this.incertitude.depDe(p) || this.fonctionAssociee.depDe(p))
}
CMaxFonc.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.a.dependDePourBoucle(p) || this.b.dependDePourBoucle(p) ||
  this.incertitude.dependDePourBoucle(p) || this.fonctionAssociee.dependDePourBoucle(p)
}
CMaxFonc.prototype.positionne = function (infoRandom, dimfen) {
  let x1, x2, xa, xb, y1, y2, h, temp, i
  this.a.positionne(infoRandom, dimfen)
  this.b.positionne(infoRandom, dimfen)
  this.incertitude.positionne(infoRandom, dimfen)
  this.existe = this.fonctionAssociee.existe && this.a.existe && this.b.existe && this.incertitude.existe
  if (!this.existe) return
  xa = this.a.rendValeur()
  xb = this.b.rendValeur()
  const e = this.incertitude.rendValeur()
  if (xa > xb) {
    temp = xa
    xa = xb
    xb = temp
  }
  const nBoucles = Math.floor(Math.log(Math.abs(xb - xa) / e) / Math.log(1.5)) + 1
  if (nBoucles > 1000) {
    this.existe = false
    return
  }
  h = (xb - xa) / 3
  x1 = xa + h
  x2 = xb - h
  for (i = 1; i <= nBoucles; i++) {
    h = (xb - xa) / 3
    x1 = xa + h
    x2 = xb - h
    try {
      y1 = this.fonctionAssociee.rendValeurFonction(infoRandom, x1)
      y2 = this.fonctionAssociee.rendValeurFonction(infoRandom, x2)
    } catch (err) {
      this.existe = false
      return
    }
    if (y1 > y2) xb = x2
    else xa = x1
  }
  this.existe = true
  this.valeur = (x1 + x2) / 2 // Ne pas employer valeur contrairement version Java
}
CMaxFonc.prototype.rendValeur = function () {
  return this.valeur
}
CMaxFonc.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFonc')
  this.a = new CValeur()
  this.a.read(inps, list)
  this.b = new CValeur()
  this.b.read(inps, list)
  this.incertitude = new CValeur()
  this.incertitude.read(inps, list)
}
CMaxFonc.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  this.a.write(oups, list)
  this.b.write(oups, list)
  this.incertitude.write(oups, list)
}
CMaxFonc.prototype.estConstant = function () {
  return this.a.estConstant() && this.b.estConstant() && this.incertitude.estConstant() && this.fonctionAssociee.estConstant()
}
