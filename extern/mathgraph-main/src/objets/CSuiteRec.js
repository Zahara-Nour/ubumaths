/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import { erreurCalculException, NombreMaxiTermesSuiteRec } from '../kernel/kernel'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
export default CSuiteRec

/**
 * Classe représentant une suite récurrente de la forme u(n+1)=f[u(n)]
 * Pour utiliser un terme de la suite dans un calcul, utiliser une syntae de la forme
 * u(n) où u est le nom de la suite.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {string} nomCalcul  Le nom de la suite.
 * @param {CFonc} fonctionAssociee  La fonction réelle d'une variable associée (fonction utilisateur).
 * @param {CValeur} nombreTermes  Le nombre de termes de la suite (dynamique).
 * @param {CValeur} premierTerme  Le premier terme de la suite.
 * @returns {CSuiteRec}
 */
function CSuiteRec (listeProprietaire, impProto, estElementFinal, nomCalcul, fonctionAssociee,
  nombreTermes, premierTerme) {
  if (arguments.length === 0) return
  if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
  else {
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.fonctionAssociee = fonctionAssociee
    this.nombreTermes = nombreTermes
    this.premierTerme = premierTerme
    this.metAJourNombreTermes()
  }
}
CSuiteRec.prototype = new CCalculAncetre()
CSuiteRec.prototype.constructor = CSuiteRec
CSuiteRec.prototype.superClass = 'CCalculAncetre'
CSuiteRec.prototype.className = 'CSuiteRec'

CSuiteRec.prototype.metAJourNombreTermes = function () {
  const val = this.nombreTermes.rendValeur()
  if ((val === Math.floor(val)) && (val >= 1) && (val <= NombreMaxiTermesSuiteRec)) this.nbt = val
  else this.nbt = 2 // Pas d'importance car dans ce cas la suite n'existe pas
  this.valeurs = new Array(this.nbt)
}
CSuiteRec.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  const ind2 = listeSource.indexOf(this.impProto)
  const premierTermeClone = this.premierTerme.getClone(listeSource, listeCible)
  const nombreTermesClone = this.nombreTermes.getClone(listeSource, listeCible)
  return new CSuiteRec(listeCible, listeCible.get(ind2, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind1, 'CSuiteRec'), nombreTermesClone,
    premierTermeClone)
}
CSuiteRec.prototype.setClone = function (ptel) {
  CCalculAncetre.prototype.setClone.call(this, ptel)
  this.indiceDernierTermeExistant = ptel.indiceDernierTermeExistant
  const nbt = ptel.valeurs.length
  if (this.valeurs.length !== nbt) this.valeurs = new Array(nbt)
  for (let i = 0; i <= this.indiceDernierTermeExistant; i++) {
    this.valeurs[i] = ptel.valeurs[i]
  }
}
CSuiteRec.prototype.nombreVariables = function () {
  return 1
}
CSuiteRec.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.nombreTermes.initialisePourDependance()
  this.premierTerme.initialisePourDependance()
}
CSuiteRec.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.premierTerme.depDe(p) || this.fonctionAssociee.depDe(p) || this.nombreTermes.depDe(p))
}
CSuiteRec.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.premierTerme.dependDePourBoucle(p) || this.fonctionAssociee.dependDePourBoucle(p) ||
  this.nombreTermes.dependDePourBoucle(p)
}
CSuiteRec.prototype.positionne = function (infoRandom, dimfen) {
  let u, v
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
  let i = 1
  while (i < this.nbt) {
    try {
      this.listeProprietaire.initialiseNombreIterations()
      // v = fonctionAssociee.calcul.resultatFonction(infoRandom, u);
      v = this.fonctionAssociee.calcul.resultatFonction(true, u)
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
CSuiteRec.prototype.positionneFull = function (infoRandom, dimfen) {
  this.nombreTermes.dejaPositionne = false
  this.premierTerme.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
/* Supprimé version 7.3 car ne sert pas
CSuiteRec.prototype.confonduAvec = function (p) {
  if (p.className === this.className) {
    return (this.fonctionAssociee === p.fonctionAssociee) && (this.premierTerme.confonduAvec(p.premierTerme) &&
        (this.nombreTermes.confonduAvec(p.nombreTermes)))
  } else return false
}
 */
CSuiteRec.prototype.rendValeurFonction = function (infoRandom, parametre) {
  if (!this.existe || (parametre < 0) || (parametre !== Math.floor(parametre)) ||
  (parametre > this.indiceDernierTermeExistant)) {
    throw new Error(erreurCalculException)
  } else return this.valeurs[parametre]
}
CSuiteRec.prototype.getNatureCalcul = function () {
  return NatCal.NSuiteRecurrenteReelle
}
CSuiteRec.prototype.estFonctionOuSuite = function () {
  return true
}
CSuiteRec.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  this.nombreTermes = new CValeur()
  this.nombreTermes.read(inps, list)
  this.premierTerme = new CValeur()
  this.premierTerme.read(inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CSuiteRec')
  // metAJourNombreTermes();
  // Le nombre de valeurs étant dynamique, on ne peut pas le connaître au chargement
  // On met 1 terme arbitrairement et cela sera rectifié dans positionne();
  this.nbt = 1
  this.valeurs = new Array(1)
}
CSuiteRec.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  this.nombreTermes.write(oups, list)
  this.premierTerme.write(oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
}
