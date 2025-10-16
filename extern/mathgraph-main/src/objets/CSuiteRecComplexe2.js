/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import { NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CSuiteRecComplexe from './CSuiteRecComplexe'
export default CSuiteRecComplexe2

/**
 * Suite récurrente réelle de la forme u(n+1)=f[n,u(n)] où f est une fonction
 * utilisateur complexe de deux variables.
 * @constructor
 * @extends CSuiteRecComplexe
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction compelxe de deux variables associée.
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite (complexe ou réel).
 * @returns {CSuiteRecComplexe2}
 */
function CSuiteRecComplexe2 (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme) {
  if (arguments.length === 1) CSuiteRecComplexe.call(this, listeProprietaire)
  else {
    CSuiteRecComplexe.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
      nombreTermes, premierTerme)
  }
}
CSuiteRecComplexe2.prototype = new CSuiteRecComplexe()
CSuiteRecComplexe2.prototype.constructor = CSuiteRecComplexe2
CSuiteRecComplexe2.prototype.superClass = 'CSuiteRecComplexe'
CSuiteRecComplexe2.prototype.className = 'CSuiteRecComplexe2'

CSuiteRecComplexe2.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRecComplexe2(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFoncComplexeNVar'), nombreTermesClone,
    premierTermeClone)
}
CSuiteRecComplexe2.prototype.positionne = function (infoRandom, dimfen) {
  this.premierTerme.positionne(infoRandom, dimfen)
  this.nombreTermes.positionne(infoRandom, dimfen)
  this.existe = this.fonctionAssociee?.existe && this.premierTerme.existe && this.nombreTermes.existe
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
  // Modifié version 3.1.2 pour autoriser la remise à jour des valeurs renvoyées par rand
  // premierTerme.rendValeurComplexe(infoRandom, u);
  this.premierTerme.rendValeurComplexe(this.u)
  this.valeurs[0].set(this.u)
  this.indiceDernierTermeExistant = 0
  let i = 1
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // fonctionAssociee.calcul.resultatFonctionComplexe(infoRandom, u, v);
      const arg = new Array(2)
      arg[0] = new Complexe()
      arg[0].x = i - 1
      arg[0].y = 0
      arg[1] = new Complexe(this.u)
      this.fonctionAssociee.calcul.resultatFonctionComplexe(true, arg, this.v)
      if (this.v.isNanOrInfinite()) break
      this.u.set(this.v)
      this.valeurs[i].set(this.u)
      i++
    } catch (e) {
      break
    }
  }
  i--
  this.indiceDernierTermeExistant = i
}
// Ajout version 6.3.0
CSuiteRecComplexe2.prototype.positionneFull = function (infoRandom, dimfen) {
  this.premierTerme.dejaPositionne = false
  this.nombreTermes.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}

CSuiteRecComplexe2.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteComplexe2
}
