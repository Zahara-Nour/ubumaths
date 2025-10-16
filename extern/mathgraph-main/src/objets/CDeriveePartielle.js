/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Ope from '../types/Ope'
import CCalculAncetre from './CCalculAncetre'
import CalcR from '../kernel/CalcR'
import CConstante from './CConstante'
import COp from './COperation'
import CFoncNVar from './CFoncNVar'
export default CDeriveePartielle

// Attention : Ordre des 3 derniers paramètres inversés par rapport à version Java
/**
 * Classe représentant une dérivée partielle d'une fonction utilisateur à 2 ou 3 variables
 * par rapport à une de ses variables.
 * @constructor
 * @extends CFoncNVar
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {string} nomCalcul  Le nom de la fonction dérivée.
 * @param {CFonc} fonctionAssociee  La fonction dont c'est la dérivée.
 * @param {number} indiceVariableDerivation  Donne la variable par rapport à laquelle on dérivé (0 pour lapremière variable).
 * @param {CCb} calcul  Le calcul de la dérivée (peut être null).
 * @returns {CDeriveePartielle}
 */
function CDeriveePartielle (listeProprietaire, impProto, estElementFinal, nomCalcul,
  fonctionAssociee, indiceVariableDerivation, calcul) {
  if (arguments.length === 1) CFoncNVar.call(this, listeProprietaire)
  else {
    if (arguments.length <= 6) calcul = null
    // Ne pas appeler le constructeur de CFoncNVar car calcul peut être null
    /*
    CFoncNVar.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul,
      fonctionAssociee.nomsVariables, calcul)
    ; */
    CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
    this.fonctionAssociee = fonctionAssociee
    this.indiceVariableDerivation = indiceVariableDerivation
    this.calcul = calcul
    if (fonctionAssociee !== null) {
      this.nbVar = fonctionAssociee.nombreVariables()
      // Modification version 6.8.0 : Si la dérivée partielle est créée dans un CProtoype quand on crée une construction
      // il ne faut pas appeler this.creeCalcul
      if (calcul === null && listeProprietaire.className !== 'CPrototype') this.creeCalcul()
      this.nomsVariables = fonctionAssociee.nomsVariables
    }
  }
}
CDeriveePartielle.prototype = new CFoncNVar()
CDeriveePartielle.prototype.constructor = CDeriveePartielle
CDeriveePartielle.prototype.superClass = 'CFoncNVar'
CDeriveePartielle.prototype.className = 'CDeriveePartielle'

CDeriveePartielle.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.fonctionAssociee)
  const ptelb = new CDeriveePartielle(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CFoncNVar'), this.indiceVariableDerivation, null)
  if (listeCible.className !== 'CPrototype') ptelb.creeCalcul()
  return ptelb
}

CDeriveePartielle.prototype.nombreVariables = function () {
  return this.fonctionAssociee.nombreVariables()
}
CDeriveePartielle.prototype.reconstruitChaineCalcul = function () {
  this.chaineCalcul = ''
}
CDeriveePartielle.prototype.metAJour = function () {
  if (!this.fonctionAssociee.deriveePossible(this.indiceVariableDerivation)) {
    this.calcul = new COp(this.listeProprietaire, new CConstante(this.listeProprietaire, 1),
      new CConstante(this.listeProprietaire, 0), Ope.Divi)
  } else this.creeCalcul()
}
CDeriveePartielle.prototype.getNatureCalcul = function () {
  return NatCal.NDeriveePartielle
}
CDeriveePartielle.prototype.variableFormelle = function () {
  return this.fonctionAssociee.variableFormelle()
}
CDeriveePartielle.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CFoncNVar.prototype.depDe.call(this, p) || this.fonctionAssociee.depDe(p))
}
CDeriveePartielle.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.fonctionAssociee.dependDePourBoucle(p)
}
/* Supprimé version 7.3 car ne sert pas
CDeriveePartielle.prototype.confonduAvec = function (p) {
  // CDeriveePartielle pt;
  if (p.className === this.className()) {
    // pt = (CDeriveePartielle) p;
    return (this.fonctionAssociee === p.fonctionAssociee) &&
    (this.indiceVariableDerivation === p.indiceVariableDerivation)
  } else return false
}
*/
CDeriveePartielle.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.fonctionAssociee.existe
}
/**
 * Fonction appelée pour les exercices de calcul et qui doit recalculer tous les éléments de la figure.
 * Donc ici il faut recalculer la formule de la dérivée
 * @returns {void}
 */
CDeriveePartielle.prototype.positionneFull = function () {
  this.existe = this.fonctionAssociee.existe
  if (this.existe) this.metAJour()
}

/**
 * Calcule la formule de la dérivée partielle et la met dans this.
 * @returns {void}
 */
CDeriveePartielle.prototype.creeCalcul = function () {
  this.calcul = CalcR.creeDerivee(this.fonctionAssociee.calcul, this.indiceVariableDerivation)
}
CDeriveePartielle.prototype.read = function (inps, list) {
  CFoncNVar.prototype.readSansCalcul.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFoncNVar')
  this.nbVar = this.fonctionAssociee.nbVar
  this.indiceVariableDerivation = inps.readInt()
  if (list.className !== 'CPrototype') {
    if (!this.fonctionAssociee.deriveePossible(this.indiceVariableDerivation)) {
      this.calcul = new COp(this.listeProprietaire, new CConstante(this.listeProprietaire, 1),
        new CConstante(this.listeProprietaire, 0), Ope.Divi)
    } else this.creeCalcul()
  }
}
CDeriveePartielle.prototype.write = function (oups, list) {
  CFoncNVar.prototype.writeSansCalcul.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  oups.writeInt(this.indiceVariableDerivation)
}
