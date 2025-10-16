/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalcul from './CCalculBase'
import CalcR from '../kernel/CalcR'

export default CFonc

// Attention : Ordre des deux derniers paramètres inversé par rapport version Java
/**
 * Fonction utilisateur réelle de une variable.
 * @constructor
 * @extends CCalcul
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet
 * @param {boolean} estElementFinal  true si l'objet est un objet inal de construction
 * @param {string} nomCalcul  Le nom de la fonction.
 * @param {string} chaineCalcul  La formule définissnt la focntion
 * @param {string} nomsVariables  La varaible formelle utilisée pour la formule.
 * @param {CCb} calcul  Arbre binaire repsentant le calcul.
 * @returns {CFonc}
 */
function CFonc (listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, nomsVariables, calcul) {
  if (arguments.length !== 0) { // 0 pour appel dans prototype
    if (arguments.length === 1) CCalcul.call(this, listeProprietaire)
    else {
      if (arguments.length === 3) CCalcul.call(this, listeProprietaire, impProto, estElementFinal)
      else {
        this.nomsVariables = nomsVariables
        if (arguments.length <= 6) this.calcul = null
        if (calcul === null) {
          CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul,
            CalcR.ccb(chaineCalcul, listeProprietaire, 0, chaineCalcul.length - 1,
              [nomsVariables]))
        } else CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul)
      }
    }
  }
}
CFonc.prototype = new CCalcul()
CFonc.prototype.constructor = CFonc
CFonc.prototype.superClass = 'CCalcul'
CFonc.prototype.className = 'CFonc'

CFonc.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CFonc(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, this.nomsVariables, calculClone)
}
CFonc.prototype.getNatureCalcul = function () {
  return NatCal.NFonction
}
CFonc.prototype.rendValeurFonctionComplexe = function (infoRandom, parametre, zRes) {
  this.calcul.resultatFonctionComplexe(infoRandom, parametre, zRes)
}
// Spécial JavaScript. Lors de la création d'une fontion on crée automatiquement ici son calcul
/**
 * Crée l'arbre binaire de calcul associé et le met dans this.calcul.
 * @returns {void}
 */
CFonc.prototype.creeCalcul = function () {
  const va = new Array(1)
  va[0] = this.nomsVariables
  this.calcul = CalcR.ccb(this.chaineCalcul, this.listeProprietaire, 0,
    this.chaineCalcul.length - 1, va)
}
/**
 * Le nombre de variables de la fonction.
 * Est redéfini pour les fonctions de plusieurs variables.
 * @returns {number}
 */
CFonc.prototype.nombreVariables = function () {
  return 1
}
CFonc.prototype.rendValeurFonction = function (infoRandom, parametre) {
  return this.calcul.resultatFonction(infoRandom, parametre)
}
CFonc.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.calcul.existePourFonc()
}
CFonc.prototype.reconstruitChaineCalcul = function () {
  const ch = new Array(1)
  ch[0] = this.nomsVariables
  this.chaineCalcul = this.calcul.chaineCalculSansPar(ch)
}
CFonc.prototype.read = function (inps, list) {
  CCalcul.prototype.read.call(this, inps, list)
  this.nomsVariables = inps.readUTF()
}
CFonc.prototype.write = function (oups, list) {
  CCalcul.prototype.write.call(this, oups, list)
  oups.writeUTF(this.nomsVariables)
}
CFonc.prototype.readSansCalcul = function (inps, list) {
  CCalcul.prototype.readSansCalcul.call(this, inps, list)
}
CFonc.prototype.writeSansCalcul = function (oups, list) {
  CCalcul.prototype.writeSansCalcul.call(this, oups, list)
}
CFonc.prototype.estFonctionOuSuite = function () {
  return true
}
/**
 * Spécial JavaScript : Renvoie la chaîne LaTeX de la formule du calcul
 * @returns {string}
 */
CFonc.prototype.chaineLatex = function () {
  return this.calcul.chaineLatexSansPar(this.nomsVariables)
}
