/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import NatCal from '../types/NatCal'
import CFonc from './CFonc'
import CConstante from './CConstante'
import COp from './COperation'
import Ope from '../types/Ope'
import CalcR from '../kernel/CalcR'
export default CDerivee

/**
 * Classe représentant une fonction qui est la dérivée d'un fonction utilisateur
 * à une variable définie par l'utilisateur.
 * Elle est calculée de façon formelle (mais non simplifiée).
 * @constructor
 * @extends CFonc
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire de l'objet.
 * @param {boolean} estElementFinal  true si l'objet est un objet final de construction
 * @param {string} nomCalcul  Le nom de la fonction dérivée.
 * @param {CFonc} fonctionAssociee  La fonction dont c'est la dérivée.
 * @param {CCb} calcul  un calcul donnant la dérivée (peut être null).
 * @returns {CDerivee}
 */
function CDerivee (listeProprietaire, impProto, estElementFinal, nomCalcul,
  fonctionAssociee, calcul) {
  let calc
  if (arguments.length === 1) CFonc.call(this, listeProprietaire)
  else {
    if (arguments.length === 5) calc = null; else calc = calcul
    CFonc.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, '', calc)
    this.fonctionAssociee = fonctionAssociee
    // Modification version 6.8.0 : Si la dérivée partielle est créée dans un CProtoype quand on crée une construction
    // il ne faut pas appeler this.creeCalcul
    if ((calc === null) && (fonctionAssociee !== null) && listeProprietaire.className !== 'CPrototype') this.creeCalcul()
  }
}
CDerivee.prototype = new CFonc()
CDerivee.prototype.constructor = CDerivee
CDerivee.prototype.superClass = 'CFonc'
CDerivee.prototype.className = 'CDerivee'

CDerivee.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.fonctionAssociee)
  const ptelb = new CDerivee(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CFonc'), null)
  if (listeCible.className !== 'CPrototype') ptelb.creeCalcul()
  return ptelb
}
CDerivee.prototype.reconstruitChaineCalcul = function () {
  this.chaineCalcul = ''
}
CDerivee.prototype.metAJour = function () {
  if (!this.fonctionAssociee.deriveePossible(0)) {
    this.calcul = new COp(this.listeProprietaire, new CConstante(this.listeProprietaire, 1),
      new CConstante(this.listeProprietaire, 0), Ope.Divi)
  } else this.creeCalcul()
}
CDerivee.prototype.getNatureCalcul = function () {
  return NatCal.NDerivee
}
CDerivee.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CFonc.prototype.depDe.call(this, p) || this.fonctionAssociee.depDe(p))
}
CDerivee.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.fonctionAssociee.dependDePourBoucle(p)
}
CDerivee.prototype.positionne = function () {
  this.existe = this.fonctionAssociee.existe
}
/**
 * Fonction appelée pour les exercices de calcul et qui doit recalculer tous les éléments de la figure.
 * Donc ici il faut recalculer la formule de la dérivée
 * @returns {void}
 */
CDerivee.prototype.positionneFull = function () {
  this.existe = this.fonctionAssociee.existe
  if (this.existe) {
    if (!this.fonctionAssociee.deriveePossible(0)) {
      this.calcul = new COp(this.listeProprietaire, new CConstante(this.listeProprietaire, 1),
        new CConstante(this.listeProprietaire, 0), Ope.Divi)
    } else this.creeCalcul()
  }
}
/**
 * Calcula la dérivée et l'affecte à this.calcul
 * @returns {void}
 */
CDerivee.prototype.creeCalcul = function () {
  this.calcul = CalcR.creeDerivee(this.fonctionAssociee.calcul, 0)
}
CDerivee.prototype.read = function (inps, list) {
  CFonc.prototype.readSansCalcul.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFonc')
  if (list.className !== 'CPrototype') {
    if (!this.fonctionAssociee.deriveePossible(0)) {
      this.calcul = new COp(this.listeProprietaire, new CConstante(this.listeProprietaire, 1),
        new CConstante(this.listeProprietaire, 0), Ope.Divi)
    } else this.creeCalcul()
  }
}
CDerivee.prototype.write = function (oups, list) {
  CFonc.prototype.writeSansCalcul.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
}
