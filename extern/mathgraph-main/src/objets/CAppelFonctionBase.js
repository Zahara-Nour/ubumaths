/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import Complexe from '../types/Complexe'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import NatCal from 'src/types/NatCal'

const { matrix } = mathjs

// export default CAppelFonction
export default CAppelFonction

/**
 * Objet d'un arbre binaire de calcul représentant un appel de fonction réelle utilisateur.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCalculAncetre} fonctionAssociee  Peut pointer sur une fonction ou une suite.
 * @param {CCb} operande  L'opérande dont on cherche l'image.
 * @returns {CAppelFonction}
 */
function CAppelFonction (listeProprietaire, fonctionAssociee, operande) {
  if (arguments.length === 0) CCb.call(this) // Ajout version WebPack
  else {
    CCb.call(this, listeProprietaire)
    this.fonctionAssociee = fonctionAssociee
    this.operande = operande
    /**
     * @since 4.9.7
     * @type {Complexe}
     */
    this.z1loc = new Complexe()
  }
}
CAppelFonction.prototype = new CCb()
CAppelFonction.prototype.constructor = CAppelFonction
CAppelFonction.prototype.superClass = 'CCb'
CAppelFonction.prototype.className = 'CAppelFonction'

CAppelFonction.prototype.nature = function () {
  return CCbGlob.natAppelFonction
}

CAppelFonction.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  // à revoir car la fonction a déjà été créée
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  return new CAppelFonction(listeCible, listeCible.get(ind1, 'CCalculAncetre'), cloneOperande)
}

CAppelFonction.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande.resultatComplexe(infoRandom, this.z1loc)
  this.fonctionAssociee.rendValeurFonctionComplexe(infoRandom, this.z1loc, zRes)
}

CAppelFonction.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande.resultatFonctionComplexe(infoRandom, valeurParametre, this.z1loc)
  this.fonctionAssociee.rendValeurFonctionComplexe(infoRandom, this.z1loc, zRes)
}

CAppelFonction.prototype.existe = function () {
  return this.fonctionAssociee.existe && this.operande.existe()
}

CAppelFonction.prototype.resultat = function (infoRandom) {
  return this.fonctionAssociee.rendValeurFonction(infoRandom, this.operande.resultat(infoRandom))
}

CAppelFonction.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  return this.fonctionAssociee.rendValeurFonction(infoRandom, this.operande.resultatFonction(infoRandom, valeurParametre))
}

// Ajout version 6.7
CAppelFonction.prototype.resultatMat = function (infoRandom) {
  const op = this.operande.resultatMat(infoRandom)
  if (typeof op === 'number') return this.resultat(infoRandom)
  // On applique la fonction à chacun des termes de la matrice
  const res = []
  const size = op.size()
  const n = size[0]
  const p = size[1]
  for (let i = 0; i < n; i++) {
    const lig = []
    res.push(lig)
    for (let j = 0; j < p; j++) {
      lig.push(this.fonctionAssociee.rendValeurFonction(infoRandom, op(i, j)))
    }
  }
  return matrix(res)
}

CAppelFonction.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande.initialisePourDependance()
}

CAppelFonction.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.fonctionAssociee.depDe(p) || this.operande.depDe(p))
}

CAppelFonction.prototype.dependDePourBoucle = function (p) {
  return this.fonctionAssociee.dependDePourBoucle(p) || this.operande.dependDePourBoucle(p)
}

CAppelFonction.prototype.dependDeVariable = function (ind) {
  return this.operande.dependDeVariable(ind)
}

CAppelFonction.prototype.deriveePossible = function (indiceVariable) {
  const b = this.operande.deriveePossible(indiceVariable)
  if (this.fonctionAssociee.className === 'CSuiteRec') return b
  else return b || this.fonctionAssociee.deriveePossible(indiceVariable)
}

CAppelFonction.prototype.getCopie = function () {
  return new CAppelFonction(this.listeProprietaire, this.fonctionAssociee, this.operande.getCopie())
}

CAppelFonction.prototype.getCore = function () {
  return this.fonctionAssociee.calcul.getCore()
}

CAppelFonction.prototype.chaineCalcul = function (varFor = null) {
  // ElimineParenthesesDebut(cha);
  return this.fonctionAssociee.getNom() + '(' + this.operande.chaineCalculSansPar(varFor) + ')'
}

CAppelFonction.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const estSuiteRec = this.fonctionAssociee.estDeNatureCalcul(NatCal.NTteSuiteRec)
  // Si la fonction associée est en fait une  uite récurrente, on passe en indice pour l'argument
  const parouvLatex = estSuiteRec ? '_{' : '\\left('
  const parferLatex = estSuiteRec ? '}' : '\\right)'
  return this.fonctionAssociee.getNom() + parouvLatex + this.operande.chaineLatexSansPar(varFor, fracSimple) + parferLatex
}

CAppelFonction.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.fonctionAssociee = list.get(ind1, 'CCalculAncetre')
  this.operande = inps.readObject(list)
}

CAppelFonction.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.fonctionAssociee)
  oups.writeInt(ind1)
  oups.writeObject(this.operande)
}

CAppelFonction.prototype.estConstant = function () {
  return this.fonctionAssociee.estConstant() && this.operande.estConstant()
}

// Pour cette classe, isCalcVect renvoie fausse par défaut
CAppelFonction.prototype.isCalcOK4Vect = function (tabNames) {
  return !this.operande.isCalcVect(tabNames)
}
