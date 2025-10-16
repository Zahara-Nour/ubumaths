/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
export default CIntegrale

/**
 * Objet de type calcul représentant le calcul approché d'une intégrale
 * par la méthode de Simpson
 * @constructor
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {string} nomCalcul  Le nom du calcul.
 * @param {CFonc} fonctionAssociee  La fonction utilisateur dont on calcule l'inntégrale.
 * @param {CValeur} a  La borne inférieure d'intégration.
 * @param {CValeur} b  La borne supérieure d'intégration.
 * @param {CValeur} n  Le nombre de subdivisions seta 2n (dynamique).
 * @returns {CIntegrale}
 */
function CIntegrale (listeProprietaire, impProto, estElementFinal, nomCalcul,
  fonctionAssociee, a, b, n) {
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.a = a
    this.b = b
    this.n = n
    this.fonctionAssociee = fonctionAssociee
  }
  this.valeurIntegrale = 0
}
CIntegrale.prototype = new CCalculAncetre()
CIntegrale.prototype.constructor = CIntegrale
CIntegrale.prototype.superClass = 'CCalculAncetre'
CIntegrale.prototype.className = 'CIntegrale'
CIntegrale.valeurMaxiDen = 200

CIntegrale.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const aClone = this.a.getClone(listeSource, listeCible)
  const bClone = this.b.getClone(listeSource, listeCible)
  const nClone = this.n.getClone(listeSource, listeCible)
  return new CIntegrale(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFonc'), aClone,
    bClone, nClone)
}
CIntegrale.prototype.getNatureCalcul = function () {
  return NatCal.NIntegrale
}
CIntegrale.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.a.initialisePourDependance()
  this.b.initialisePourDependance()
  this.n.initialisePourDependance()
}
CIntegrale.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.a.depDe(p) || this.b.depDe(p) || this.n.depDe(p) || this.fonctionAssociee.depDe(p))
}
CIntegrale.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.a.dependDePourBoucle(p) || this.b.dependDePourBoucle(p) ||
  this.n.dependDePourBoucle(p) || this.fonctionAssociee.dependDePourBoucle(p)
}
CIntegrale.prototype.positionne = function (infoRandom, dimfen) {
  let s1, s2, s
  let t1, t2
  let k
  this.a.positionne(infoRandom, dimfen)
  this.b.positionne(infoRandom, dimfen)
  this.n.positionne(infoRandom, dimfen)
  this.existe = this.a.existe && this.b.existe && this.n.existe
  if (!this.existe) return
  const bornea = this.a.rendValeur()
  const borneb = this.b.rendValeur()
  if (bornea === borneb) {
    this.existe = true
    this.valeurIntegrale = 0
    return
  }
  // Modifié version 7.3 pour optimisation
  // const dnbt = Math.floor(this.n.rendValeur() + 0.5)
  const dnbt = Math.round(this.n.rendValeur())
  this.existe = (dnbt >= 1) && (dnbt <= CIntegrale.valeurMaxiDen)
  if (!this.existe) return
  // int n = (int) dnbt;
  const pas = (borneb - bornea) / dnbt
  try {
    s = this.fonctionAssociee.rendValeurFonction(infoRandom, bornea) +
      this.fonctionAssociee.rendValeurFonction(infoRandom, borneb)
  } catch (err) {
    this.existe = false
    return
  }
  t1 = bornea
  t2 = bornea - pas / 2
  s1 = 0
  s2 = 0
  try {
    for (k = 1; k < dnbt; k++) {
      t1 = t1 + pas
      s1 = s1 + this.fonctionAssociee.rendValeurFonction(infoRandom, t1)
    }
    for (k = 1; k <= dnbt; k++) {
      t2 = t2 + pas
      s2 = s2 + this.fonctionAssociee.rendValeurFonction(infoRandom, t2)
    }
    this.valeurIntegrale = (borneb - bornea) * (s + 2 * s1 + 4 * s2) / (6 * dnbt)
    this.existe = true
  } catch (err) {
    this.existe = false
  }
}
CIntegrale.prototype.rendValeur = function () {
  return this.valeurIntegrale
}
CIntegrale.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFonc')
  this.a = new CValeur()
  this.a.read(inps, list)
  this.b = new CValeur()
  this.b.read(inps, list)
  this.n = new CValeur()
  this.n.read(inps, list)
}
CIntegrale.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  this.a.write(oups, list)
  this.b.write(oups, list)
  this.n.write(oups, list)
}
