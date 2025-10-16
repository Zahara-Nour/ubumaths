/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CalcR from '../kernel/CalcR'
import CCalcul from './CCalcul'
export default CFoncNVar

// Attention : Ordre des deux derniers paramètres inverses par rapport à version Java
/**
 * Fonction réelle de n variables.
 * @constructor
 * @extends CCalcul
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet
 * @param {boolean} estElementFinal  true si l'objet est un objet inal de construction
 * @param {string} nomCalcul  Le nom de la fonction.
 * @param {string} chaineCalcul  La formule définissnt la fonction
 * @param {string[]} nomsVariables  Un array de String donnant les variables formelles.
 * @param {CCb} calcul  Un arbre binaire de calcul représentant la fonction.
 * @returns {void}
 */
function CFoncNVar (listeProprietaire, impProto, estElementFinal, nomCalcul,
  chaineCalcul, nomsVariables, calcul) {
  let calc
  if (arguments.length === 0) return
  if (arguments.length === 1) CCalcul.call(this, listeProprietaire)
  else {
    if (arguments.length <= 6) calc = null; else calc = calcul
    if (typeof nomsVariables === 'number') {
      // Constructeur sécial pour CDeriveePartielle
      this.nbVar = nomsVariables
      this.nomsVariables = null
      CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calc)
    } else {
      this.nomsVariables = nomsVariables // ChaineVariable est un Array de String
      this.nbVar = nomsVariables.length
      if ((calc === null) && (chaineCalcul.length !== 0)) {
        CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul,
          CalcR.ccb(chaineCalcul, listeProprietaire, 0, chaineCalcul.length - 1, nomsVariables))
      } else CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calc)
    }
  }
}
CFoncNVar.prototype = new CCalcul()
CFoncNVar.prototype.constructor = CFoncNVar
CFoncNVar.prototype.superClass = 'CCalcul'
CFoncNVar.prototype.className = 'CFoncNVar'

/**
 * Fonction renvoyant un pointeur sur le tableau de chaînes représentant les variables de la fonction
 * Devra être redéfini pour CDeriveePartielle
 * @returns {string[]}
 */
CFoncNVar.prototype.nomsVariables = function () {
  return this.nomsVariables
}

CFoncNVar.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CFoncNVar(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, this.nomsVariables, calculClone)
}
CFoncNVar.prototype.getNatureCalcul = function () {
  switch (this.nbVar) {
    case 2 :
      return NatCal.NFonction2Var
    case 3 :
      return NatCal.NFonction3Var
    case 4 :
      return NatCal.NFonction4Var
    case 5 :
      return NatCal.NFonction5Var
    case 6 :
      return NatCal.NFonction6Var
  }
}
// Modification version 6.8.0 : Pour que le résultat renvoyé marche aussi pour les CDeriveePartielle qui
// descendent de CFoncNVar on n'utilise pas this.nbVar
CFoncNVar.prototype.nombreVariables = function () {
  // return this.nbVar
  return this.variableFormelle().length
}
CFoncNVar.prototype.rendValeurFonction = function (infoRandom, parametre) {
  return this.calcul.resultatFonction(infoRandom, parametre)
}
CFoncNVar.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.calcul.existePourFonc()
}
CFoncNVar.prototype.reconstruitChaineCalcul = function () {
  this.chaineCalcul = this.calcul.chaineCalculSansPar(this.nomsVariables)
}
CFoncNVar.prototype.read = function (inps, list) {
  CCalcul.prototype.read.call(this, inps, list)
  this.nbVar = inps.readInt()
  this.nomsVariables = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) this.nomsVariables[i] = inps.readUTF()
}
CFoncNVar.prototype.write = function (oups, list) {
  CCalcul.prototype.write.call(this, oups, list)
  oups.writeInt(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) oups.writeUTF(this.nomsVariables[i])
}
CFoncNVar.prototype.estFonctionOuSuite = function () {
  return true
}
CFoncNVar.prototype.rendValeurFonctionComplexe = function (infoRandom, parametre, zRes) {
  this.calcul.resultatFonctionComplexe(infoRandom, parametre, zRes)
}
