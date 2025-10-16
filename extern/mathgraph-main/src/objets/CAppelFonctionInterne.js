/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CAppelFonctionInterne
/**
 * @constructor
 * @extends CCb
 * Objet d'un arbre binaire de calcul représentant un appel de fonction interne.
 * Utilisé dans les calculs de dérivées et dérivées partielles.
 * @param {CCb} fonctionInterne  Pointe sur la fonction à appliquer.
 * @param {CCb} operande  Pointe sur l'opérande.
 * @returns {CAppelFonctionInterne}
 */
function CAppelFonctionInterne (fonctionInterne, operande) {
  CCb.call(this, fonctionInterne.listeProprietaire)
  this.fonctionInterne = fonctionInterne
  this.operande = operande
}
CAppelFonctionInterne.prototype = new CCb()
CAppelFonctionInterne.prototype.constructor = CAppelFonctionInterne
CAppelFonctionInterne.prototype.superClass = 'CCb'
CAppelFonctionInterne.prototype.className = 'CAppelFonctionInterne'

CAppelFonctionInterne.prototype.nature = function () {
  return CCbGlob.natAppelFonctionInterne
}

CAppelFonctionInterne.prototype.resultat = function (infoRandom) {
  return this.fonctionInterne.resultatFonction(infoRandom, this.operande.resultat(infoRandom))
}

CAppelFonctionInterne.prototype.resultatFonction = function (infoRandom, valeurparametre) {
  return this.fonctionInterne.resultatFonction(infoRandom, this.operande.resultatFonction(infoRandom, valeurparametre))
}

// Comme une fonction complexe peut utiliser la formule d'une fonction réelle d'une variable réelle
// il faut aussi définir les deux fonctions suivantes
CAppelFonctionInterne.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.fonctionInterne.resultatComplexe(infoRandom, zRes)
}

CAppelFonctionInterne.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.fonctionInterne.resultatFonctionComplexe(infoRandom, valeurParametre, zRes)
}

CAppelFonctionInterne.prototype.getCopie = function () {
  return new CAppelFonctionInterne(this.fonctionInterne.getCopie(), this.operande.getCopie())
}

CAppelFonctionInterne.prototype.getCore = function () {
  return this.fonctionInterne.getCore()
}

CAppelFonctionInterne.prototype.dependDeVariable = function (ind) {
  return this.operande.dependDeVariable(ind)
}

CAppelFonctionInterne.prototype.estConstant = function () {
  return this.fonctionInterne.estConstant() && this.operande.estConstant()
}
CAppelFonctionInterne.prototype.deriveePossible = function (indiceVariable) {
  return this.fonctionInterne.deriveePossible(indiceVariable) && this.operande.deriveePossible(indiceVariable)
}

CAppelFonctionInterne.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CAppelFonctionInterne(this.fonctionInterne, this.operande.calculAvecValeursRemplacees(bfrac))
}

// Pour cette classe, isCalcVect renvoie fausse par défaut
CAppelFonctionInterne.prototype.isCalcOK4Vect = function (tabNames) {
  return !this.operande.isCalcVect(tabNames)
}
