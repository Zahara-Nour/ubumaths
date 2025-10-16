/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import { NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CValeur from './CValeur'
import CSuiteRec from './CSuiteRec'
export default CSuiteRec3

/**
 * Suite récurrente réelle de la forme u(n+2)=f[n,u(n+1),u(n)] où f est une fonction réelle de trois variables.
 * @constructor
 * @extends CSuiteRec
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction réelle de deux variables associée.
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite.
 * @param {CValeur} deuxiemeTerme  Le deuxième terme de la suite.
 * @returns {CSuiteRec3}
 */
function CSuiteRec3 (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme, deuxiemeTerme) {
  if (arguments.length === 1) CSuiteRec.call(this, listeProprietaire)
  else {
    CSuiteRec.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul,
      fonctionAssociee, nombreTermes, premierTerme)
    this.deuxiemeTerme = deuxiemeTerme
  }
}
CSuiteRec3.prototype = new CSuiteRec()
CSuiteRec3.prototype.constructor = CSuiteRec3
CSuiteRec3.prototype.superClass = 'CSuiteRec'
CSuiteRec3.prototype.className = 'CSuiteRec3'

CSuiteRec3.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const deuxiemeTermeClone = this.deuxiemeTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRec3(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFoncNVar'), nombreTermesClone,
    premierTermeClone, deuxiemeTermeClone)
}
CSuiteRec3.prototype.initialisePourDependance = function () {
  CSuiteRec.prototype.initialisePourDependance.call(this)
  this.deuxiemeTerme.initialisePourDependance()
}
CSuiteRec3.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSuiteRec.prototype.depDe.call(this, p) ||
    this.deuxiemeTerme.depDe(p))
}
CSuiteRec.prototype.dependDePourBoucle = function (p) {
  return CSuiteRec.prototype.dependDePourBoucle.call(this, p) || this.deuxiemeTerme.dependDePourBoucle(p)
}
CSuiteRec3.prototype.positionne = function (infoRandom, dimfen) {
  let u, v, w, i
  this.nombreTermes.positionne(infoRandom, dimfen)
  this.premierTerme.positionne(infoRandom, dimfen)
  this.deuxiemeTerme.positionne(infoRandom, dimfen)
  this.existe = this.fonctionAssociee.existe && this.premierTerme.existe && this.nombreTermes.existe
  if (!this.existe) return
  // Modifié version 7.3 pour optimisation
  // const dnbt = Math.floor(this.nombreTermes.rendValeur(false) + 0.5)
  const dnbt = Math.round(this.nombreTermes.rendValeur(false))
  this.existe = (dnbt >= 1) && (dnbt <= NombreMaxiTermesSuiteRec)
  if (!this.existe) return
  if (dnbt !== this.nbt) {
    this.nbt = dnbt
    this.metAJourNombreTermes()
  }

  u = this.premierTerme.rendValeur()
  this.valeurs[0] = u
  v = this.deuxiemeTerme.rendValeur()
  this.valeurs[1] = v
  this.indiceDernierTermeExistant = 0
  i = 2
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // v = fonctionAssociee.calcul.resultatFonction(infoRandom, u);
      const arg = new Array(3)
      arg[0] = i - 2
      arg[1] = v
      arg[2] = u
      w = this.fonctionAssociee.calcul.resultatFonction(true, arg)
      if (!isFinite(v)) break
      u = v
      v = w
      this.valeurs[i] = w
      i++
    } catch (e) {
      break
    }
  }
  i--
  this.indiceDernierTermeExistant = i
}
// Ajout version 6.3.0
CSuiteRec3.prototype.positionneFull = function (infoRandom, dimfen) {
  this.nombreTermes.dejaPositionne = false
  this.premierTerme.dejaPositionne = false
  this.deuxiemeTerme.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CSuiteRec3.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteReelle3
}
CSuiteRec3.prototype.read = function (inps, list) {
  CSuiteRec.prototype.read.call(this, inps, list)
  this.deuxiemeTerme = new CValeur()
  this.deuxiemeTerme.read(inps, list)
}
CSuiteRec3.prototype.write = function (oups, list) {
  CSuiteRec.prototype.write.call(this, oups, list)
  this.deuxiemeTerme.write(oups, list)
}
