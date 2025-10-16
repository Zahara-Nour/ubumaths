/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import { NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CSuiteRec from './CSuiteRec'
export default CSuiteRec2

/**
 * Suite récurrente réelle de la forme u(n+1)=f[n,u(n)] où f est une fonction
 * utilisateur réelle de deux variables.
 * @constructor
 * @extends CSuiteRec
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction réelle de deux variables associée.
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite.
 * @returns {CSuiteRec2}
 */
function CSuiteRec2 (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme) {
  if (arguments.length === 1) CSuiteRec.call(this, listeProprietaire)
  else {
    CSuiteRec.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul,
      fonctionAssociee, nombreTermes, premierTerme)
  }
}
CSuiteRec2.prototype = new CSuiteRec()
CSuiteRec2.prototype.constructor = CSuiteRec2
CSuiteRec2.prototype.superClass = 'CSuiteRec'
CSuiteRec2.prototype.className = 'CSuiteRec2'

CSuiteRec2.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRec2(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CSuiteRec2'), nombreTermesClone,
    premierTermeClone)
}
CSuiteRec2.prototype.positionne = function (infoRandom, dimfen) {
  let u, v, i
  this.nombreTermes.positionne(infoRandom, dimfen)
  this.premierTerme.positionne(infoRandom, dimfen)
  this.existe = this.fonctionAssociee.existe && this.premierTerme.existe && this.nombreTermes.existe
  if (!this.existe) return
  // Modifié version 7.3 pour optimisation
  // const dnbt = Math.floor(this.nombreTermes.rendValeur() + 0.5)
  const dnbt = Math.round(this.nombreTermes.rendValeur())
  this.existe = (dnbt >= 1) && (dnbt <= NombreMaxiTermesSuiteRec)
  if (!this.existe) return
  if (dnbt !== this.nbt) {
    this.nbt = dnbt
    this.metAJourNombreTermes()
  }
  u = this.premierTerme.rendValeur()
  this.valeurs[0] = u
  this.indiceDernierTermeExistant = 0
  i = 1
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // v = fonctionAssociee.calcul.resultatFonction(infoRandom, u);
      const arg = new Array(2)
      arg[0] = i - 1
      arg[1] = u
      v = this.fonctionAssociee.calcul.resultatFonction(true, arg)
      if (!isFinite(v)) break
      u = v
      this.valeurs[i] = u
      i++
    } catch (e) {
      break
    }
  }
  i--
  this.indiceDernierTermeExistant = i
}
// Ajout version 6.3.0
CSuiteRec2.prototype.positionneFull = function (infoRandom, dimfen) {
  this.nombreTermes.dejaPositionne = false
  this.premierTerme.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
CSuiteRec2.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteReelle2
}
