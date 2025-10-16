/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import Complexe from 'src/types/Complexe.js'

export default CAppelFonctionInterneNVar
/**
 * @constructor
 * @extends CCb
 * Objet d'un arbre binaire de calcul représentant un appel de fonction interne
 * à n variables.
 * Utilisé dans les calculs de dérivées et dérivées partielles.
 * @param {CCb} fonctionInterne  Pointe sur la fonction à appliquer.
 * @param {CCb[]} operandes  Pointe sur l'opérande
 * @returns {CAppelFonctionInterneNVar}
 */
function CAppelFonctionInterneNVar (fonctionInterne, operandes) {
  CCb.call(this, fonctionInterne.listeProprietaire)
  /** @type {CCb} */
  this.fonctionInterne = fonctionInterne
  /** @type {CCb[]} */
  this.operandes = operandes
}
CAppelFonctionInterneNVar.prototype = new CCb()
CAppelFonctionInterneNVar.prototype.constructor = CAppelFonctionInterneNVar
CAppelFonctionInterneNVar.prototype.superClass = 'CCb'
CAppelFonctionInterneNVar.prototype.className = 'CAppelFonctionInterneNVar'

CAppelFonctionInterneNVar.prototype.nature = function () {
  return CCbGlob.natAppelFonctionInterneNVar
}

CAppelFonctionInterneNVar.prototype.resultat = function (infoRandom) {
  const nvar = this.operandes.length
  const d = new Array(nvar)
  for (let i = 0; i < nvar; i++) d[i] = this.operandes[i].resultat(infoRandom)
  return this.fonctionInterne.resultatFonction(infoRandom, d)
}

CAppelFonctionInterneNVar.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const nvar = this.operandes.length
  const d = new Array(nvar)
  for (let i = 0; i < nvar; i++) d[i] = this.operandes[i].resultatFonction(infoRandom, valeurParametre)
  return this.fonctionInterne.resultatFonction(infoRandom, d)
}

// Comme une fonction complexe de plusieurs variables peut utiliser la formule d'une fonction réelle d'une variable réelle
// d'une ou plusieurs variables il faut aussi définir les deux fonctions suivantes
CAppelFonctionInterneNVar.prototype.resultatComplexe = function (infoRandom, zRes) {
  const nvar = this.operandes.length
  const z1 = new Array(nvar)
  for (let i = 0; i < nvar; i++) z1[i] = new Complexe()
  for (let i = 0; i < nvar; i++) this.operandes[i].resultatComplexe(infoRandom, z1[i])
  return this.fonctionInterne.resultatComplexe(infoRandom, z1, zRes)
}

CAppelFonctionInterneNVar.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  const nvar = this.operandes.length
  const z1 = new Array(nvar)
  for (let i = 0; i < nvar; i++) z1[i] = new Complexe()
  for (let i = 0; i < nvar; i++) this.operandes[i].resultatFonctionComplexe(infoRandom, valeurParametre, z1[i])
  this.fonctionInterne.resultatFonctionComplexe(infoRandom, z1, zRes)
}

CAppelFonctionInterneNVar.prototype.getCore = function () {
  return this.fonctionInterne.getCore()
}

CAppelFonctionInterneNVar.prototype.getCopie = function () {
  const nvar = this.operandes.length
  const tab = new Array(nvar)
  for (let i = 0; i < nvar; i++) tab[i] = this.operandes[i].getCopie()
  return new CAppelFonctionInterneNVar(this.fonctionInterne.getCopie(), this.operandes)
}

CAppelFonctionInterneNVar.prototype.dependDeVariable = function (ind) {
  let res = false
  const nvar = this.operandes.length
  for (let i = 0; i < nvar; i++) {
    res = res || (this.fonctionInterne.dependDeVariable(i) && this.operandes[i].dependDeVariable(ind))
  }
  return res
}

CAppelFonctionInterneNVar.prototype.estConstant = function () {
  let res = false
  const nvar = this.operandes.length
  for (let i = 0; i < nvar; i++) {
    res = res || this.operandes[i].estConstant()
  }
  return res
}

CAppelFonctionInterneNVar.prototype.deriveePossible = function (indiceVariable) {
  let b = true
  for (let i = 0; (i < this.operandes.length) && b; i++) {
    if (this.operandes[i].dependDeVariable(indiceVariable)) { b = this.fonctionInterne.deriveePossible(i) && this.operandes[i].deriveePossible(indiceVariable) }
  }
  return b
}

CAppelFonctionInterneNVar.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const nbvar = this.fonctionInterne.nombreVariables()
  const tabcal = new Array(this.fonctionInterne.nombreVariables())
  for (let i = 0; i < nbvar; i++) {
    tabcal[i] = this.operandes[i].calculAvecValeursRemplacees(bfrac)
  }
  return new CAppelFonctionInterneNVar(this.fonctionInterne, tabcal)
}

// Pour cette classe, isCalcVect renvoie fausse par défaut
CAppelFonctionInterneNVar.prototype.isCalcOK4Vect = function (tabNames) {
  const nbvar = this.fonctionInterne.nombreVariables()
  for (let i = 0; i < nbvar; i++) {
    if (!this.operandes[i].isCalcVect(tabNames) && !this.operandes[i].isVectNul()) return false
  }
  return true
}
