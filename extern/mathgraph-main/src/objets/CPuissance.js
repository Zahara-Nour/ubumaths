/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import Complexe from '../types/Complexe'
import Opef from '../types/Opef'
import { erreurCalculException, identity } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import CConstante from 'src/objets/CConstanteBase'
import CFonction from 'src/objets/CFonction'

const { det, inv, matrix, multiply } = mathjs

export default CPuissance

/**
 * Classe représentant une élévation à une puissance dans un arbre de calcul binaire.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CCb} operande
 * @param {CCb} exposant
 * @returns {CPuissance}
 */
function CPuissance (listeProprietaire, operande, exposant) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.operande = operande
    this.exposant = exposant
  }
  this.z1 = new Complexe()
  this.ope1 = new Complexe()
  this.exp1 = new Complexe()
}
CPuissance.prototype = new CCb()
CPuissance.prototype.constructor = CPuissance
CPuissance.prototype.superClass = 'CCb'
CPuissance.prototype.className = 'CPuissance'

CPuissance.prototype.nature = function () {
  return CCbGlob.natPuissance
}
CPuissance.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  const cloneExposant = this.exposant.getClone(listeSource, listeCible)
  // à revoir car la fonction a déjà été créée
  return new CPuissance(listeCible, cloneOperande, cloneExposant)
}
CPuissance.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande.initialisePourDependance()
  this.exposant.initialisePourDependance()
}
CPuissance.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.operande.depDe(p) || this.exposant.depDe(p))
}
CPuissance.prototype.dependDePourBoucle = function (p) {
  return this.operande.dependDePourBoucle(p) || this.exposant.dependDePourBoucle(p)
}
CPuissance.prototype.existe = function () {
  return this.operande.existe() && this.exposant.existe()
}
CPuissance.prototype.resultatBase = function (x, n) {
  if ((x === 0) && (n !== 0)) {
    if (n > 0) return 0
    else throw new Error(erreurCalculException)
  }
  if (n === 0) {
    // Version 7.0 : Pour simplifier les calculs de fonctions polynômes on ne lève plus d'erreur
    // pour le calcul de 0^0 et on renvoie 1
    // if (x === 0) throw new Error(erreurCalculException)
    // else return 1
    return 1
  } else {
    // Optimisation pour la version 2.0
    // Pour un exposant entier compris entre 1 et 255
    // on ne fait que des produits
    if ((n === Math.floor(n)) && (n > 0) && (n < 256)) return CCbGlob.puisExpEnt(x, n)
    else {
      if (x < 0) {
        if (n === Math.floor(n)) {
          if (n === 2 * Math.floor(n / 2)) { return Math.exp(n * Math.log(Math.abs(x))) } else return -Math.exp(n * Math.log(Math.abs(x)))
        } else throw new Error(erreurCalculException)
      } else return Math.exp(n * Math.log(x))
    }
  }
}
CPuissance.prototype.resultat = function (infoRandom) {
  const x1 = this.operande.resultat(infoRandom)
  const n1 = this.exposant.resultat(infoRandom)
  return this.resultatBase(x1, n1)
}
CPuissance.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const x1 = this.operande.resultatFonction(infoRandom, valeurParametre)
  const n1 = this.exposant.resultatFonction(infoRandom, valeurParametre)
  return this.resultatBase(x1, n1)
}
CPuissance.prototype.resultatComplexeBase = function (ope, exp, zRes) {
  const openull = ope.moduleCarre() === 0
  const expnull = exp.moduleCarre() === 0
  if (expnull) {
    if (openull) throw new Error(erreurCalculException)
    else {
      zRes.x = 1
      zRes.y = 0
    }
  } else {
    if (openull) {
      zRes.x = 0
      zRes.y = 0
      // Si l'opérande est nul, on regarde si l'exposant est réel ou pas.
      // S'il ne l'est pas, le résultat n'existe pas
      if (exp.y !== 0) throw new Error(erreurCalculException)
      else {
        if (exp.x <= 0) throw new Error(erreurCalculException)
      }
    } else { // Si l'opérande n'est pas nul ni l'exposant
      // On regarde si l'exposant est entier et stricteemnt inférieur à 256.
      // Si oui on utilise un algorithme n'utilisant que des produits
      if ((exp.y === 0) && (exp.x === Math.floor(exp.x))) {
        if ((exp.x > 0) && (exp.x < 256)) {
          const expent = exp.x
          ope.puisCompExpEnt(expent, zRes)
        } else {
          if ((exp.x < 0) && (exp.x > -256)) {
            const expent = exp.x
            ope.puisCompExpEnt(-expent, this.z1)
            this.z1.inverseComp(zRes)
          } else ope.puisComp(exp, zRes)
        }
      } else ope.puisComp(exp, zRes)
    }
  }
}
CPuissance.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande.resultatComplexe(infoRandom, this.ope1)
  this.exposant.resultatComplexe(infoRandom, this.exp1)
  this.resultatComplexeBase(this.ope1, this.exp1, zRes)
}
CPuissance.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande.resultatFonctionComplexe(infoRandom, valeurParametre, this.ope1)
  this.exposant.resultatFonctionComplexe(infoRandom, valeurParametre, this.exp1)
  this.resultatComplexeBase(this.ope1, this.exp1, zRes)
}
// Ajout version 6.7
CPuissance.prototype.resultatMatBase = function (op, exp) {
  if (typeof exp !== 'number') throw new Error(erreurCalculException)
  if (typeof op === 'number') return this.resultatBase(op, exp)
  // Cas d'une matrice élevée à une puissance
  const size = op.size()
  const n = size[0] // Nombre de lignes
  const p = size[1] // Nombre de colonnes
  // Si exposant > 256, erreur de dépassement de capacité
  if (n !== p) throw new Error(erreurCalculException)
  if (exp === -1) {
    // Cas de l'inverse d'une matrice
    // Si la matrice n'est pas carrée erreur
    // On calcule d'abord le déterminant
    const determinant = det(op)
    if (determinant === 0) throw new Error(erreurCalculException)
    return inv(op)
  }
  if (exp < 0 || exp !== Math.round(exp) || exp >= 256) throw new Error(erreurCalculException)
  return this.puissMat(op, exp)
}
CPuissance.prototype.resultatMat = function (infoRandom) {
  const op = this.operande.resultatMat(infoRandom)
  const exp = this.exposant.resultatMat(infoRandom)
  return this.resultatMatBase(op, exp)
}
CPuissance.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const op = this.operande.resultatMatFonction(infoRandom, valeurParametre)
  const exp = this.exposant.resultatFonction(infoRandom, valeurParametre)
  return this.resultatMatBase(op, exp)
}
CPuissance.prototype.dependDeVariable = function (ind) {
  return this.operande.dependDeVariable(ind) || this.exposant.dependDeVariable(ind)
}
CPuissance.prototype.getCopie = function () {
  return new CPuissance(this.listeProprietaire, this.operande.getCopie(), this.exposant.getCopie())
}
CPuissance.prototype.getCore = function () {
  return new CPuissance(this.listeProprietaire, this.operande.getCore(), this.exposant.getCore())
}
CPuissance.prototype.chaineCalcul = function (varFor) {
  let chexp = this.exposant.chaineCalcul(varFor)
  const natexp = this.exposant.nature()
  let expestpuis = (natexp === CCbGlob.natPuissance)
  if (natexp === CCbGlob.natFonction) {
    // CFonction fonc = (CFonction) exposant;
    expestpuis = expestpuis || (this.exposant.opef === Opef.Exp) ||
      (this.exposant.opef === Opef.Expo)
  }
  if (expestpuis) chexp = '(' + chexp + ')'
  const natop = this.operande.nature()
  const opestpuis = (natop === CCbGlob.natPuissance)
  if (opestpuis) return '(' + this.operande.chaineCalcul(varFor) + ')^' + chexp
  else return this.operande.chaineCalcul(varFor) + '^' + chexp
}
CPuissance.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const parouvLatex = '\\left('
  const parferLatex = '\\right)'
  // On passe comme deuxième paramètre true pour que les fractions en exposant ne soient pas en dfrac
  const chexp = this.exposant.chaineLatexSansPar(varFor, true) // Parenthèses inutiles pour le LaTeX
  const natop = this.operande.nature()
  // Bug corrigé version 4.7.2.1
  if (((natop & (CCbGlob.natPuissance | CCbGlob.natOperation | CCbGlob.natMoinsUnaire)) !== 0) ||
      ((natop & (CCbGlob.natFonction | CCbGlob.natFonction2Var | CCbGlob.natFonction3Var)) !== 0)) {
    return parouvLatex + this.operande.chaineLatexSansPar(varFor, fracSimple) + parferLatex + '^{' + chexp + '}'
  } else return this.operande.chaineLatexSansPar(varFor, fracSimple) + '^{' + chexp + '}'
}
CPuissance.prototype.estConstant = function () {
  return this.operande.estConstant() && this.exposant.estConstant()
}
CPuissance.prototype.deriveePossible = function (indiceVariable) {
  return this.operande.deriveePossible(indiceVariable) && this.exposant.deriveePossible(indiceVariable)
}
CPuissance.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CPuissance(this.listeProprietaire, this.operande.calculAvecValeursRemplacees(bfrac),
    this.exposant.calculAvecValeursRemplacees(bfrac))
}
CPuissance.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.operande = inps.readObject(list)
  this.exposant = inps.readObject(list)
}
CPuissance.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeObject(this.operande)
  oups.writeObject(this.exposant)
}

// Pour cette classe, isCalcVect renvoie false
// sauf si l'opérande est un vecteur et l'exposant une constante réelle égale à 2 auquel cas
// la puissance sera remplacée par un carré scalaire
CPuissance.prototype.isCalcOK4Vect = function (tabNames) {
  // return !this.operande.isCalcVect(tabNames) && !this.exposant.isCalcVect(tabNames)
  const opisvect = this.operande.isCalcVect(tabNames)
  if (!opisvect && !this.exposant.isCalcVect(tabNames)) return true
  if (opisvect && this.exposant.estConstant()) {
    const z = new Complexe()
    try {
      this.listeProprietaire.initialiseNombreIterations()
      this.exposant.resultatComplexe(false, z)
    } catch (e) {
      return false
    }
    if (z.x === 2 && z.y === 0) return true
  }
  return false
}

// Déplacé ici version 6.4.7
CPuissance.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  // Amélioration version 4.7.9 : Remplace a^1 par a
  const calcPui = this.exposant.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const natexp = calcPui.nature()
  if (natexp === CCbGlob.natConstante) {
    const res = calcPui.valeur
    if (res === 1) return this.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  }
  return new CPuissance(this.listeProprietaire, this.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1), calcPui)
}

/**
 * Fonction élevant une matrice carrée mat à la puissance exposant avec un processus de calcul optimisé
 * @param {MathJsChain} mat
 * @param {number} exposant
 * @returns {MathJsChain}
 */
CPuissance.prototype.puissMat = function (mat, exposant) {
  // On initialise le résultat à une matrice identité
  const n = mat.size()[0] // Nb de lignes et colonnes de la matrice carrée
  let res = matrix(identity(n))
  if (exposant === 0) return res
  if (exposant === 1) return mat
  let tampon = matrix(mat)
  // Version n'utilisant que des décalages de bits pour optimisation
  let b = 128
  let indfin = 7
  while ((b & exposant) === 0) {
    indfin--
    b = b >> 1
  }
  for (let i = 0; i <= indfin; i++) {
    if ((exposant % 2) !== 0) {
      // res = matrix(res.prod(tampon))
      res = multiply(res, tampon)
    }
    exposant >>= 1
    // On élève tampon au carré
    // tampon = matrix(tampon.prod(tampon))
    tampon = multiply(tampon, tampon)
  }
  return res
}

/** @inheritDoc */
CPuissance.prototype.getCalc4Prosca = function (tabNames) {
  // Si le calcul a été accepté comme valide via isCalcVectOK c'est que l'exposant a un résultat exact de valeur 2
  const opisvect = this.operande.isCalcVect(tabNames)
  if (opisvect) {
    // Quand un vecteur est élevé au carré c'est qu'on demande son carré scalaire
    // On crée donc une fonction abs (module pour les complexes) appliquée à l'opérande
    // et on élève le résultat au carré
    const liste = this.listeProprietaire
    return new CPuissance(liste, new CFonction(liste, Opef.Abs, this.operande), new CConstante(liste, 2))
  } else return this
}
