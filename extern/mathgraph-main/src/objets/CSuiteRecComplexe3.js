/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import { NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CValeurComp from './CValeurComp'
import CSuiteRecComplexe from './CSuiteRecComplexe'
export default CSuiteRecComplexe3

/**
 * Suite récurrente complexe de la forme u(n+2)=f[n,u(n+1),u(n)] où f est une fonction complexe de trois variables.
 * @constructor
 * @extends CSuiteRecComplexe
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction réelle de deux variables associée.
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite (complexe ou réel).
 * @param {CValeur} deuxiemeTerme  Le deuxième terme de la suite (complexe ou réel).
 * @returns {CSuiteRecComplexe3}
 */
function CSuiteRecComplexe3 (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme, deuxiemeTerme) {
  if (arguments.length === 1) CSuiteRecComplexe.call(this, listeProprietaire)
  else {
    CSuiteRecComplexe.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
      nombreTermes, premierTerme)
    this.deuxiemeTerme = deuxiemeTerme
  }
  this.w = new Complexe()
}
CSuiteRecComplexe3.prototype = new CSuiteRecComplexe()
CSuiteRecComplexe3.prototype.constructor = CSuiteRecComplexe3
CSuiteRecComplexe3.prototype.superClass = 'CSuiteRecComplexe'
CSuiteRecComplexe3.prototype.className = 'CSuiteRecComplexe3'

CSuiteRecComplexe3.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const deuxiemeTermeClone = this.deuxiemeTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRecComplexe3(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFoncComplexeNVar'), nombreTermesClone,
    premierTermeClone, deuxiemeTermeClone)
}
CSuiteRecComplexe3.prototype.initialisePourDependance = function () {
  CSuiteRecComplexe.prototype.initialisePourDependance.call(this)
  this.deuxiemeTerme.initialisePourDependance()
}
CSuiteRecComplexe3.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CSuiteRecComplexe.prototype.depDe.call(this, p) || this.deuxiemeTerme.depDe(p))
}
CSuiteRecComplexe3.prototype.dependDePourBoucle = function (p) {
  return CSuiteRecComplexe.dependDePourBoucle.call(this, p) || this.deuxiemeTerme.dependDePourBoucle(p)
}
CSuiteRecComplexe3.prototype.positionne = function (infoRandom, dimfen) {
  let i
  this.premierTerme.positionne(infoRandom, dimfen)
  this.deuxiemeTerme.positionne(infoRandom, dimfen)
  this.nombreTermes.positionne(infoRandom, dimfen)
  this.existe = this.fonctionAssociee.existe && this.premierTerme.existe && this.deuxiemeTerme.existe && this.nombreTermes.existe
  if (!this.existe) return
  // Modifié version 7.3 pour optimisation
  // const dnbt = Math.floor(this.nombreTermes.rendValeur() + 0.5)
  const dnbt = Math.round(this.nombreTermes.rendValeur())
  this.existe = (dnbt >= 2) && (dnbt <= NombreMaxiTermesSuiteRec)
  if (!this.existe) return
  if (dnbt !== this.nbt) {
    this.nbt = dnbt
    this.metAJourNombreTermes()
  }
  this.premierTerme.rendValeurComplexe(this.u)
  this.valeurs[0].set(this.u)
  this.deuxiemeTerme.rendValeurComplexe(this.v)
  this.valeurs[1].set(this.v)
  this.indiceDernierTermeExistant = 0
  i = 2
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      const arg = new Array(3)
      arg[0] = new Complexe()
      arg[0].x = i - 2
      arg[0].y = 0
      arg[1] = new Complexe(this.v)
      arg[2] = new Complexe(this.u)

      this.fonctionAssociee.calcul.resultatFonctionComplexe(true, arg, this.w)
      if (this.w.isNanOrInfinite()) break
      this.u.set(this.v)
      this.v.set(this.w)
      this.valeurs[i].set(this.w)
      i++
    } catch (e) {
      break
    }
  }
  i--
  this.indiceDernierTermeExistant = i
}
// Ajout version 6.3.0
CSuiteRecComplexe3.prototype.positionneFull = function (infoRandom, dimfen) {
  this.premierTerme.dejaPositionne = false
  this.deuxiemeTerme.dejaPositionne = false
  this.nombreTermes.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
/* Supprimé version 7.3 car ne sert pas
CSuiteRecComplexe3.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.fonctionAssociee === p.fonctionAssociee) && (this.premierTerme.confonduAvec(p.premierTerme) &&
        (this.deuxiemeTerme.confonduAvec(p.deuxiemeTerme)) && (this.nombreTermes.confonduAvec(p.nombreTermes)))
  } else return false
}
 */
CSuiteRecComplexe3.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteComplexe3
}
CSuiteRecComplexe3.prototype.read = function (inps, list) {
  CSuiteRecComplexe.read.call(this, inps, list)
  this.deuxiemeTerme = new CValeurComp()
  this.deuxiemeTerme.read(inps, list)
}
CSuiteRecComplexe3.prototype.write = function (oups, list) {
  CSuiteRecComplexe.write.call(this, oups, list)
  this.deuxiemeTerme.write(oups, list)
}
