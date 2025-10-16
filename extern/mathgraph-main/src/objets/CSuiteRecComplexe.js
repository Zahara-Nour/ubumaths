/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import { erreurCalculException, NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
import CValeurComp from './CValeurComp'
export default CSuiteRecComplexe

/**
 * Classe représentant une suite récurrente complexe de la forme u(n+1)=f[u(n)]
 * où f est une fonction numérique complexe d'une variable.
 * Pour utiliser un terme de la suite dans un calcul, utiliser une syntaxe de la forme
 * u(n) où u est le nom de la suite.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction complexe d'une variable associée (fonction utilisateur).
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite (complexe ou réel).
 * @returns {CSuiteRecComplexe}
 */
function CSuiteRecComplexe (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.fonctionAssociee = fonctionAssociee
      this.nombreTermes = nombreTermes
      this.premierTerme = premierTerme
      this.metAJourNombreTermes()
    }
  }
  this.u = new Complexe()
  this.v = new Complexe()
}
CSuiteRecComplexe.prototype = new CCalculAncetre()
CSuiteRecComplexe.prototype.constructor = CSuiteRecComplexe
CSuiteRecComplexe.prototype.superClass = 'CCalculAncetre'
CSuiteRecComplexe.prototype.className = 'CSuiteRecComplexe'

CSuiteRecComplexe.prototype.metAJourNombreTermes = function () {
  const val = this.nombreTermes.rendValeur()
  if ((val === Math.floor(val)) && (val >= 1) && (val <= NombreMaxiTermesSuiteRec)) this.nbt = val
  else this.nbt = 2 // Pas d'importance car dans ce cas la suite n'existe pas
  this.valeurs = new Array(this.nbt)
  for (let i = 0; i < this.nbt; i++) this.valeurs[i] = new Complexe()
}
CSuiteRecComplexe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRecComplexe(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CFoncComplexe'), nombreTermesClone, premierTermeClone)
}
CSuiteRecComplexe.prototype.setClone = function (ptel) {
  let i
  CCalculAncetre.prototype.setClone.call(this, ptel)
  this.indiceDernierTermeExistant = ptel.indiceDernierTermeExistant
  const nbt = ptel.valeurs.length
  if (this.valeurs.length !== nbt) {
    this.valeurs = new Complexe[nbt]()
    for (i = 0; i < nbt; i++) this.valeurs[i] = new Complexe()
  }
  for (i = 0; i <= this.indiceDernierTermeExistant; i++) {
    this.valeurs[i].set(ptel.valeurs[i])
  }
}
CSuiteRecComplexe.prototype.nombreVariables = function () {
  return 1
}
CSuiteRecComplexe.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.premierTerme.initialisePourDependance()
}
CSuiteRecComplexe.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.premierTerme.depDe(p) || this.fonctionAssociee.depDe(p) || this.nombreTermes.depDe(p))
}
CSuiteRecComplexe.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.premierTerme.dependDePourBoucle(p) || this.fonctionAssociee.dependDePourBoucle(p) ||
  this.nombreTermes.dependDePourBoucle(p)
}
CSuiteRecComplexe.prototype.positionne = function (infoRandom, dimfen) {
  this.premierTerme.positionne(infoRandom, dimfen)
  this.nombreTermes.positionne(infoRandom, dimfen)
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
  this.premierTerme.rendValeurComplexe(this.u)
  this.valeurs[0].set(this.u)
  this.indiceDernierTermeExistant = 0
  let i = 1
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // fonctionAssociee.calcul.resultatFonctionComplexe(infoRandom, u, v);
      this.fonctionAssociee.calcul.resultatFonctionComplexe(true, this.u, this.v)
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
CSuiteRecComplexe.prototype.positionneFull = function (infoRandom, dimfen) {
  this.premierTerme.dejaPositionne = false
  this.nombreTermes.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
/* Supprimé version 7.3 car ne sert pas
CSuiteRecComplexe.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.fonctionAssociee === p.fonctionAssociee) && (this.premierTerme.confonduAvec(p.premierTerme) &&
        (this.nombreTermes.confonduAvec(p.nombreTermes)))
  } else return false
}
 */
CSuiteRecComplexe.prototype.rendValeurFonctionComplexe = function (infoRandom, parametre, zRes) {
  if (!this.existe || (parametre.y !== 0) || (parametre.x !== Math.floor(parametre.x)) ||
  (parametre.x < 0) || (parametre.x > this.indiceDernierTermeExistant)) {
    throw new Error(erreurCalculException)
  } else zRes.set(this.valeurs[parametre.x])
}
CSuiteRecComplexe.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteComplexe
}
CSuiteRecComplexe.prototype.estFonctionOuSuite = function () {
  return true
}
CSuiteRecComplexe.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  this.nombreTermes = new CValeur()
  this.nombreTermes.read(inps, list)
  this.premierTerme = new CValeurComp()
  this.premierTerme.read(inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFoncComplexe')
  this.nbt = 1
  this.valeurs = new Array(1)
}
CSuiteRecComplexe.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  this.nombreTermes.write(oups, list)
  this.premierTerme.write(oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
}
