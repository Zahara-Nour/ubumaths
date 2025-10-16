/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Fonte from '../types/Fonte'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CVariableFormelle

/**
 * Classe représentant une variable dormelle d'une fonction dans u arbre de calcul.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet
 * @param {number} indvar L'indice de la variable (entier, 0 pour une fonction de une variable)
 * @returns {CVariableBornee}
 */
function CVariableFormelle (listeProprietaire, indvar) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) this.indvar = indvar
}
CVariableFormelle.prototype = new CCb()
CVariableFormelle.prototype.constructor = CVariableFormelle
CVariableFormelle.prototype.superClass = 'CCb'
CVariableFormelle.prototype.className = 'CVariableFormelle'

CVariableFormelle.prototype.nature = function () {
  return CCbGlob.natVariableFormelle
}

CVariableFormelle.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  if (valeurParametre instanceof Array) return valeurParametre[this.indvar]
  else return valeurParametre
}

CVariableFormelle.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  return this.resultatFonction(infoRandom, valeurParametre)
}

CVariableFormelle.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  if (valeurParametre instanceof Array) {
    zRes.x = valeurParametre[this.indvar].x
    zRes.y = valeurParametre[this.indvar].y
  } else {
    zRes.x = valeurParametre.x
    zRes.y = valeurParametre.y
  }
}

CVariableFormelle.prototype.getClone = function (listeSource, listeCible) {
  return new CVariableFormelle(listeCible, this.indvar)
}

// Modifié version 6.4.8 pour renvoyer true quand indvar vaut -1, ce qui sert à tester si un calcul
// dépend d'une variable formelle donc est inclus dans un calcul de fonction
CVariableFormelle.prototype.dependDeVariable = function (ind) {
  if (ind === -1) return true
  else return (this.indvar === ind)
}

CVariableFormelle.prototype.getCopie = function () {
  return new CVariableFormelle(this.listeProprietaire, this.indvar)
}

CVariableFormelle.prototype.chaineCalcul = function (varFor) {
  return varFor[this.indvar]
}

CVariableFormelle.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const ch = this.chaineCalcul(varFor, fracSimple)
  if (Fonte.estNomGrec(ch)) return ' \\' + ch + ' '
  else return ch
}

CVariableFormelle.prototype.estConstant = function () {
  // return false; // Modifié version 6.3.0
  return true
}

CVariableFormelle.prototype.numeroVersion = function () {
  return 2
}

CVariableFormelle.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  if (this.nVersion === 1) this.indvar = 0
  else this.indvar = inps.readInt()
}

CVariableFormelle.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeInt(this.indvar)
}
