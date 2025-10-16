/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CMaxFonc from './CMaxFonc'
export default CMinFonc

// a, b et incertitude doivente être du type CValeurassocieeVariable, equation du type Ccb
// fonction doit être du tye Ccb et représenter une équation de inconnue
// Pas paramètre fonction par cette version
/**
 * Classe représentant le calcul du minimum d'une fonction sur un intervalle.
 * @constructor
 * @extends CMaxFonc
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou a construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction
 * @param {string} nomCalcul  Le nom donné au calcul.
 * @param {CFonc} fonctionAssociee  La fonction utilistauer dont on cherche le minimum.
 * @param {CValeur} a  La borne inférieure de l'intervalle de recherche.
 * @param {CValeur} b  La borne supérieure de l'intervalle de recherche.
 * @param {CValeur} incertitude  L'incertitude demandée.
 * @returns {CMinFonc}
 */
function CMinFonc (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  a, b, incertitude) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CMaxFonc.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul,
        fonctionAssociee, a, b, incertitude)
    }
  }
}
CMinFonc.prototype = new CMaxFonc()
CMinFonc.prototype.constructor = CMinFonc
CMinFonc.prototype.superClass = 'CMaxFonc'
CMinFonc.prototype.className = 'CMinFonc'

CMinFonc.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const aClone = this.a.getClone(listeSource, listeCible)
  const bClone = this.b.getClone(listeSource, listeCible)
  const incertitudeClone = this.incertitude.getClone(listeSource, listeCible)
  return new CMinFonc(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFonc'), aClone,
    bClone, incertitudeClone)
}
CMinFonc.prototype.getNatureCalcul = function () {
  return NatCal.NMinimumFonction
}
CMinFonc.prototype.positionne = function (infoRandom, dimfen) {
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
    if (y1 < y2) xb = x2
    else xa = x1
  }
  this.existe = true
  this.valeur = (x1 + x2) / 2
}
