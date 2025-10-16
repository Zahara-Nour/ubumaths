/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Complexe from '../types/Complexe'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
export default CAppelFonctionNVar

/**
 * Objet d'un arbre binaire de calcul représentant un appel de fonction réelle utilisateur
 * à n variables.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {number} nbVar  Le nombre de variables de la fonction.
 * @param {CFoncNVar} fonctionAssociee  La fonction appliquée à l'opérande.
 * @param {CCb[]} operandes  Tableau de CCb représentant les opérandes.
 * @returns {void}
 */
function CAppelFonctionNVar (listeProprietaire, nbVar, fonctionAssociee, operandes) {
  if (arguments.length === 0) return
  CCb.call(this, listeProprietaire)
  this.nbVar = nbVar
  this.fonctionAssociee = fonctionAssociee
  /**
   * Attention, ici c'est un tableau de CCb alors que dans CAppelFonction c'est une propriété operande qui est un CCb unique
   * @type {CCb[]}
   */
  this.operandes = operandes
}
CAppelFonctionNVar.prototype = new CCb()
CAppelFonctionNVar.prototype.constructor = CAppelFonctionNVar
CAppelFonctionNVar.prototype.superClass = 'CCb'
CAppelFonctionNVar.prototype.className = 'CAppelFonctionNVar'

CAppelFonctionNVar.prototype.nature = function () {
  return CCbGlob.natAppelFonctionNVar
}

CAppelFonctionNVar.prototype.getClone = function (listeSource, listeCible) {
  const operandeClone = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) { operandeClone[i] = this.operandes[i].getClone(listeSource, listeCible) }
  // à revoir car la fonction a déjà été créée
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  return new CAppelFonctionNVar(listeCible, this.nbVar, listeCible.get(ind1, 'CFoncNVar'), operandeClone)
}

CAppelFonctionNVar.prototype.resultat = function (infoRandom) {
  const d = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) d[i] = this.operandes[i].resultat(infoRandom)
  return this.fonctionAssociee.rendValeurFonction(infoRandom, d)
}

CAppelFonctionNVar.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const d = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) d[i] = this.operandes[i].resultatFonction(infoRandom, valeurParametre)
  return this.fonctionAssociee.rendValeurFonction(infoRandom, d)
}

CAppelFonctionNVar.prototype.resultatComplexe = function (infoRandom, zRes) {
  const z1 = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) z1[i] = new Complexe()
  for (let i = 0; i < this.nbVar; i++) this.operandes[i].resultatComplexe(infoRandom, z1[i])
  this.fonctionAssociee.rendValeurFonctionComplexe(infoRandom, z1, zRes)
}

CAppelFonctionNVar.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  const z1 = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) z1[i] = new Complexe()
  for (let i = 0; i < this.nbVar; i++) this.operandes[i].resultatFonctionComplexe(infoRandom, valeurParametre, z1[i])
  this.fonctionAssociee.rendValeurFonctionComplexe(infoRandom, z1, zRes)
}

CAppelFonctionNVar.prototype.existe = function () {
  let res = this.fonctionAssociee.existe
  if (!res) return false
  for (let i = 0; i < this.nbVar; i++) res = res || this.operandes[i].existe()
  return res
}

CAppelFonctionNVar.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  for (let i = 0; i < this.nbVar; i++) this.operandes[i].initialisePourDependance()
}

CAppelFonctionNVar.prototype.depDe = function (p) {
  let res = CCb.prototype.depDe.call(this, p)
  for (let i = 0; i < this.nbVar; i++) res = res || this.operandes[i].depDe(p)
  return this.memDep(this.fonctionAssociee.depDe(p) || res)
}

CAppelFonctionNVar.prototype.dependDePourBoucle = function (p) {
  let res = false
  for (let i = 0; i < this.nbVar; i++) res = res || this.operandes[i].dependDePourBoucle(p)
  return this.fonctionAssociee.dependDePourBoucle(p) || res
}

CAppelFonctionNVar.prototype.dependDeVariable = function (ind) {
  let res = false
  for (let i = 0; i < this.nbVar; i++) {
    res = res || (this.fonctionAssociee.calcul.dependDeVariable(i) && this.operandes[i].dependDeVariable(ind))
  }
  return res
}

CAppelFonctionNVar.prototype.getCopie = function () {
  const operandeCopie = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) operandeCopie[i] = this.operandes[i].getCopie()
  return new CAppelFonctionNVar(this.listeProprietaire, this.nbVar, this.fonctionAssociee, operandeCopie)
}

CAppelFonctionNVar.prototype.getCore = function () {
  return this.fonctionAssociee.calcul.getCore()
}

CAppelFonctionNVar.prototype.chaineCalcul = function (varFor = null) {
  // Depuis la version 8.1.2 on peut demander que le séparateur décimal pour les affichages soit
  // la virgule. On ne peut dans ce cas pas utiliser la virgule pour séparer les arguements.
  // On utilise le point-virgule à la palce
  const sep = this.listeProprietaire.decimalDot ? ',' : ';'
  let ch = this.fonctionAssociee.getNom() + '('
  for (let i = 0; i < this.nbVar - 1; i++) ch = ch + this.operandes[i].chaineCalculSansPar(varFor) + sep
  return ch + this.operandes[this.nbVar - 1].chaineCalculSansPar(varFor) + ')'
}

CAppelFonctionNVar.prototype.chaineLatex = function (varFor, fracSimple = false) {
  // Depuis la version 8.1.2 on peut demander que le séparateur décimal pour les affichages soit
  // la virgule. On ne peut dans ce cas pas utiliser la virgule pour séparer les arguements.
  // On utilise le point-virgule à la palce
  const sep = this.listeProprietaire.decimalDot ? ',' : ';'
  let ch = this.fonctionAssociee.getNom() + '('
  for (let i = 0; i < this.nbVar - 1; i++) ch = ch + this.operandes[i].chaineLatexSansPar(varFor, fracSimple) + sep
  return ch + this.operandes[this.nbVar - 1].chaineLatexSansPar(varFor, fracSimple) + ')'
}

CAppelFonctionNVar.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.nbVar = inps.readInt()
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CFoncNVar')
  this.operandes = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) this.operandes[i] = inps.readObject(list)
}

CAppelFonctionNVar.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeInt(this.nbVar)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  for (let i = 0; i < this.nbVar; i++) oups.writeObject(this.operandes[i])
}

CAppelFonctionNVar.prototype.estConstant = function () {
  let res = this.fonctionAssociee.estConstant()
  for (let i = 0; i < this.nbVar; i++) res = res && this.operandes[i].estConstant()
  return res
}

CAppelFonctionNVar.prototype.deriveePossible = function (indiceVariable) {
  let b = true
  for (let i = 0; (i < this.operandes.length) && b; i++) {
    if (this.operandes[i].dependDeVariable(indiceVariable)) { b = this.fonctionAssociee.deriveePossible(i) && this.operandes[i].deriveePossible(indiceVariable) }
  }
  return b
}

CAppelFonctionNVar.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const nbvar = this.fonctionAssociee.nombreVariables()
  const tabcal = new Array(this.fonctionAssociee.nombreVariables())
  for (let i = 0; i < nbvar; i++) {
    tabcal[i] = this.operandes[i].calculAvecValeursRemplacees(bfrac)
  }
  return new CAppelFonctionNVar(this.listeProprietaire, nbvar, this.fonctionAssociee, tabcal)
}

// Pour cette classe, isCalcVect renvoie fausse par défaut
CAppelFonctionNVar.prototype.isCalcOK4Vect = function (tabNames) {
  if (this.fonctionAssociee.nomCalcul === 'prosca') {
    const nbvar = this.fonctionAssociee.nombreVariables()
    for (let i = 0; i < nbvar; i++) {
      if (!this.operandes[i].isCalcVect(tabNames)) return false
    }
    return true
  } else return true
}
// Déplacé ici version 6.4.7
CAppelFonctionNVar.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  const op = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) { op[i] = this.operandes[i].calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1) }
  return new CAppelFonctionNVar(this.listeProprietaire, this.nbVar, this.fonctionAssociee, op)
}
