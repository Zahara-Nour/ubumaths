/**
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import Complexe from '../types/Complexe'
import Opef2v from '../types/Opef2v'
import { erreurCalculException, getStr, ncr, npr, pgcd, ppcm } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'

const { matrix } = mathjs

export default CFonction2Var

/**
 * Classe représentant dans un arbre binaire de calcul un appel de fonction
 * prédéfinie à deux variables : maxi, mini, gcd, lcm, ncr, npr ou mod.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire La liste propriétaire.
 * @param {number} opef Entier donnant l'opérateur (voir OperateurFonction Opef)
 * @param {CCb} operande1 Le premier opérande.
 * @param {CCb} operande2 Le deuxième opérande.
 * @returns {CFonction2Var}
 */
function CFonction2Var (listeProprietaire, opef, operande1, operande2) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.opef = opef
    this.operande1 = operande1
    this.operande2 = operande2
  }
  this.z1loc = new Complexe()
  this.z2loc = new Complexe()
}
CFonction2Var.prototype = new CCb()
CFonction2Var.prototype.constructor = CFonction2Var
CFonction2Var.prototype.superClass = 'CCb'
CFonction2Var.prototype.className = 'CFonction2Var'

CFonction2Var.prototype.nombreVariables = function () {
  return 2
}

CFonction2Var.prototype.nature = function () {
  return CCbGlob.natFonction2Var
}

CFonction2Var.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande1 = this.operande1.getClone(listeSource, listeCible)
  const cloneOperande2 = this.operande2.getClone(listeSource, listeCible)
  return new CFonction2Var(listeCible, this.opef, cloneOperande1, cloneOperande2)
}

CFonction2Var.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande1.initialisePourDependance()
  this.operande2.initialisePourDependance()
}

CFonction2Var.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) ||
    this.operande1.depDe(p) || this.operande2.depDe(p))
}

CFonction2Var.prototype.dependDePourBoucle = function (p) {
  return this.operande1.dependDePourBoucle(p) || this.operande2.dependDePourBoucle(p)
}

CFonction2Var.prototype.existe = function () {
  return this.operande1.existe() && this.operande2.existe()
}

function divmax (n, k) {
  const N = Math.abs(n)
  const nimpair = n !== 2 * Math.round(n / 2)
  const pstart = nimpair ? 3 : 2
  const step = nimpair ? 2 : 1
  // Si Math.exp(Math.log(N) / k) est un entier la valeur rendue peut être approchée et inférieure à la valeur exacte
  // Il faut donc arrondir à l'entier le plus proche au risque de faire un test inutile pour la dernière valeur
  const max = Math.round(Math.exp(Math.log(N) / k))
  let res = 1
  for (let p = pstart; p <= max; p += step) {
    if (N === p * Math.round(N / p)) { // On regarde d'abord si N est divisible par p pour optimiser
      const puis = CCbGlob.puisExpEnt(p, k)
      if (N === puis * Math.round(N / puis)) res = p
    }
  }
  return res
}
/**
 * Renvoie le résultat de la fonction réelle prédéfinie appliquée
 * aux opérandes x et y.
 * @param {boolean} infoRandom true si les calculs aléatoires par rand
 * soient réactualisés.
 * @param {number} x Le premier opérande
 * @param {number} y Le second opérande
 * @returns {number}
 */
CFonction2Var.prototype.resultatBase = function (infoRandom, x, y) {
  switch (this.opef) {
    case Opef2v.maxi:
      if (x > y) return x; else return y
    case Opef2v.mini:
      if (x < y) return x; else return y
    case Opef2v.gcd:
      if ((x !== Math.floor(x)) || (y !== Math.floor(y)) || ((x === 0) && (y === 0)) ||
        (x < 0) || (y < 0)) { throw new Error(erreurCalculException) } else return pgcd(x, y)
    case Opef2v.lcm:
      if ((x !== Math.floor(x)) || (y !== Math.floor(y)) || (x < 0) || (y < 0)) { throw new Error(erreurCalculException) } else return ppcm(x, y)
    case Opef2v.ncr:
      if ((x !== Math.floor(x)) || (y !== Math.floor(y)) || (x < 0) || (y < 0) || (y > x)) { throw new Error(erreurCalculException) } else return ncr(x, y)
    case Opef2v.npr:
      if ((x !== Math.floor(x)) || (y !== Math.floor(y)) || (x < 0) || (y < 0) || (y > x)) { throw new Error(erreurCalculException) } else return npr(x, y)
    case Opef2v.mod:
      // Version 9.7.1 on accepte les nombres non entiers pour x et on utilise %
      if ((y !== Math.floor(y)) || (y <= 0)) {
        throw new Error(erreurCalculException)
      } else {
        if (x % y === 0) return 0
        if (x >= 0) return x % y
        return x % y + y
      }
    case Opef2v.divmaxp:
      if ((x !== Math.floor(x)) || (y !== Math.floor(y)) || y < 2 || y >= 256 || x === 0 || x > 1000000) {
        throw new Error(erreurCalculException)
      } else return divmax(x, y)
    default : throw new Error(erreurCalculException)
  }
}

CFonction2Var.prototype.resultat = function (infoRandom) {
  const x1 = this.operande1.resultat(infoRandom)
  const y1 = this.operande2.resultat(infoRandom)
  return this.resultatBase(infoRandom, x1, y1)
}

CFonction2Var.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const x1 = this.operande1.resultatFonction(infoRandom, valeurParametre)
  const y1 = this.operande2.resultatFonction(infoRandom, valeurParametre)
  return this.resultatBase(infoRandom, x1, y1)
}
/**
 * Renvoie le résultat de la fonction réelle prédéfinie appliquée
 * aux opérandes complexes z1 et z2.
 * @param {boolean} infoRandom true si les calculs aléatoires par rand doivent
 * être réactualisés.
 * @param {Complexe} z1 Le premier opérande.
 * @param {Complexe} z2 Le second opérande.
 * @param {Complexe} zRes Contient au retour le résultat.
 * @returns {void}
 */
CFonction2Var.prototype.resultatComplexeBase = function (infoRandom, z1, z2, zRes) {
  zRes.y = 0
  if ((z1.y !== 0) || (z2.y !== 0)) throw new Error(erreurCalculException)
  switch (this.opef) {
    case Opef2v.maxiC:
      if (z1.x > z2.x) zRes.x = z1.x; else zRes.x = z2.x
      break
    case Opef2v.miniC:
      if (z1.x < z2.x) zRes.x = z1.x; else zRes.x = z2.x
      break
    case Opef2v.gcdC:
      if ((z1.x !== Math.floor(z1.x)) || (z2.x !== Math.floor(z2.x)) || ((z1.x === 0) && (z2.x === 0)) ||
        (z1.x < 0) || (z1.x < 0)) throw new Error(erreurCalculException)
      else zRes.x = pgcd(z1.x, z2.x)
      break
    case Opef2v.lcmC:
      if ((z1.x !== Math.floor(z1.x)) || (z2.x !== Math.floor(z2.x)) || (z1.x < 0) || (z2.x < 0)) { throw new Error(erreurCalculException) } else zRes.x = ppcm(z1.x, z2.x)
      break
    case Opef2v.ncrC:
      if ((z1.x !== Math.floor(z1.x)) || (z2.x !== Math.floor(z2.x)) || (z1.x < 0) || (z2.x < 0) || (z2.x > z1.x)) { throw new Error(erreurCalculException) } else zRes.x = ncr(z1.x, z2.x)
      break
    case Opef2v.nprC:
      if ((z1.x !== Math.floor(z1.x)) || (z2.x !== Math.floor(z2.x)) || (z1.x < 0) || (z2.x < 0) || (z2.x > z1.x)) { throw new Error(erreurCalculException) } else zRes.x = npr(z1.x, z2.x)
      break
    case Opef2v.modC:
      // Version 7.9.1 on accepte un dividende négatif
      if ((z2.x !== Math.floor(z2.x)) || (z2.x <= 0)) throw new Error(erreurCalculException)
      else {
        if (z1.x % z2.x === 0) zRes.x = 0
        else {
          if (z1.x >= 0) zRes.x = z1.x % z2.x
          else zRes.x = z1.x % z2.x + z2.x
        }
      }
      break
    case Opef2v.divmaxp:
      if ((z1.x !== Math.floor(z1.x)) || (z2.x !== Math.floor(z2.x)) || z2.x < 2 || z2.x >= 256 || z1.x === 0 || z1.x > 1000000) {
        throw new Error(erreurCalculException)
      } else zRes.x = divmax(z1.x, z2.x)
      break
    default : throw new Error(erreurCalculException)
  }
}

CFonction2Var.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande1.resultatComplexe(infoRandom, this.z1loc)
  this.operande2.resultatComplexe(infoRandom, this.z2loc)
  this.resultatComplexeBase(infoRandom, this.z1loc, this.z2loc, zRes)
}

CFonction2Var.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande1.resultatFonctionComplexe(infoRandom, valeurParametre, this.z1loc)
  this.operande2.resultatFonctionComplexe(infoRandom, valeurParametre, this.z2loc)
  this.resultatComplexeBase(infoRandom, this.z1loc, this.z2loc, zRes)
}

CFonction2Var.prototype.resultatMatBase = function (op1, op2, infoRandom) {
  if (this.opef === Opef2v.dotmult) {
    if (typeof op1 === 'number' && typeof op2 === 'number') return op1 * op2
    else {
      if (typeof op1 === 'number' || typeof op2 === 'number') throw new Error(erreurCalculException)
      // Cas du produit de deux matrices terme à terme
      const size1 = op1.size()
      const n1 = size1[0]
      const p1 = size1[1]
      const size2 = op1.size()
      const n2 = size2[0]
      const p2 = size2[1]
      if ((n1 !== n2) || (p1 !== p2)) throw new Error(erreurCalculException)
      // return matrix(op1.mul(op2))
      let res = []
      for (let i = 0; i < n1; i++) {
        const lig = []
        res.push(lig)
        for (let j = 0; j < p1; j++) {
          lig.push(op1.get([i, j]) * op2.get([i, j]))
        }
      }
      res = matrix(res)
      const size = res.size()
      if (size[0] === 1 && size[1] === 1) return res.get([0, 0])
      return res
    }
  } else {
    if (this.opef === Opef2v.sortbyrow) {
      if (typeof op2 !== 'number') throw new Error(erreurCalculException)
      if (typeof op1 === 'number') return op1
      const size = op1.size()
      const n = size[0]
      const p = size[1]
      if (op2 !== Math.floor(op2) || op2 <= 0 || op2 > n) throw new Error(erreurCalculException)
      // Pour pouvoir trier la matrice on la transpose
      const transp = []
      for (let j = 0; j < p; j++) {
        const lig = []
        transp.push(lig)
        for (let i = 0; i < n; i++) {
          lig.push(op1.get([i, j]))
        }
      }
      // On trie la matrice transposée suivant l'élement d'indice row - 1 de chaque ligne
      transp.sort((a, b) => a[op2 - 1] - b[op2 - 1])
      // On la retranspose pour revenir au format initial
      const res = []
      for (let i = 0; i < n; i++) {
        const lig = []
        res.push(lig)
        for (let j = 0; j < p; j++) {
          lig.push(transp[j][i])
        }
      }
      return matrix(res)
    } else {
      if (this.opef === Opef2v.sortbycol) {
        // Pour un tri par colonne on n'a pas besoin de créer une trasposée de la matrice mais juste de la cloner
        if (typeof op2 !== 'number') throw new Error(erreurCalculException)
        if (typeof op1 === 'number') return op1
        const size = op1.size()
        const n = size[0]
        const p = size[1]
        if (op2 !== Math.floor(op2) || op2 <= 0 || op2 > p) throw new Error(erreurCalculException)
        const res = []
        for (let i = 0; i < n; i++) {
          const lig = []
          res.push(lig)
          for (let j = 0; j < p; j++) {
            lig.push(op1.get([i, j]))
          }
        }
        res.sort((a, b) => a[op2 - 1] - b[op2 - 1])
        return matrix(res)
      }
    }
  }
  if (typeof op1 !== 'number' || typeof op2 !== 'number') throw new Error(erreurCalculException)
  return this.resultatBase(infoRandom, op1, op2)
}

// Ajout version 6.7
CFonction2Var.prototype.resultatMat = function (infoRandom) {
  const op1 = this.operande1.resultatMat(infoRandom)
  const op2 = this.operande2.resultatMat(infoRandom)
  return this.resultatMatBase(op1, op2, infoRandom)
}

CFonction2Var.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const op1 = this.operande1.resultatMatFonction(infoRandom, valeurParametre)
  const op2 = this.operande2.resultatMatFonction(infoRandom, valeurParametre)
  return this.resultatMatBase(op1, op2, infoRandom)
}

CFonction2Var.prototype.dependDeVariable = function (ind) {
  return this.operande1.dependDeVariable(ind) || this.operande2.dependDeVariable(ind)
}

CFonction2Var.prototype.getCopie = function () {
  return new CFonction2Var(this.listeProprietaire, this.opef, this.operande1.getCopie(), this.operande2.getCopie())
}

CFonction2Var.prototype.chaineCalcul = function (varFor) {
  const parouv = '('
  const parfer = ')'
  const cha1 = this.operande1.chaineCalculSansPar(varFor)
  const cha2 = this.operande2.chaineCalculSansPar(varFor)
  const ch = parouv + cha1 + ',' + cha2 + parfer

  switch (this.opef) {
    case Opef2v.maxi :
    case Opef2v.maxiC :
      return getStr('maxi') + ch
    case Opef2v.mini :
    case Opef2v.miniC :
      return getStr('mini') + ch
    case Opef2v.gcd :
    case Opef2v.gcdC :
      return getStr('gcd') + ch
    case Opef2v.lcm :
    case Opef2v.lcmC :
      return getStr('lcm') + ch
    case Opef2v.ncr :
    case Opef2v.ncrC :
      return getStr('ncr') + ch
    case Opef2v.npr :
    case Opef2v.nprC :
      return getStr('npr') + ch
    case Opef2v.mod :
    case Opef2v.modC :
      return getStr('mod') + ch
    case Opef2v.dotmult :
      return getStr('dotmult') + ch
    case Opef2v.divmaxp:
      return getStr('divmaxp') + ch
    case Opef2v.sortbyrow:
      return getStr('sortbyrow') + ch
    case Opef2v.sortbycol:
      return getStr('sortbycol') + ch
    default : return ''
  }
}

CFonction2Var.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const parouvLatex = '\\left('
  const parferLatex = '\\right)'
  const cha1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
  const cha2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
  const ch = parouvLatex + cha1 + ',' + cha2 + parferLatex

  switch (this.opef) {
    case Opef2v.maxi :
    case Opef2v.maxiC :
      return getStr('maxi') + ch
    case Opef2v.mini :
    case Opef2v.miniC :
      return getStr('mini') + ch
    case Opef2v.gcd :
    case Opef2v.gcdC :
      return getStr('gcd') + ch
    case Opef2v.lcm :
    case Opef2v.lcmC :
      return getStr('lcm') + ch
    case Opef2v.ncr :
    case Opef2v.ncrC :
      return getStr('ncr') + ch
    case Opef2v.npr :
    case Opef2v.nprC :
      return getStr('npr') + ch
    case Opef2v.mod :
    case Opef2v.modC :
      return getStr('mod') + ch
    case Opef2v.dotmult :
      return getStr('dotmult') + ch
    case Opef2v.divmaxp:
      return getStr('divmaxp') + ch
    case Opef2v.sortbyrow:
      return getStr('sortbyrow') + ch
    case Opef2v.sortbycol:
      return getStr('sortbycol') + ch
    default : return ''
  }
}

CFonction2Var.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.opef = inps.readByte()
  this.operande1 = inps.readObject(list)
  this.operande2 = inps.readObject(list)
}

CFonction2Var.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeByte(this.opef)
  oups.writeObject(this.operande1)
  oups.writeObject(this.operande2)
}

CFonction2Var.prototype.estConstant = function () {
  return (this.operande1.estConstant() && this.operande2.estConstant())
}

CFonction2Var.prototype.deriveePossible = function (indiceVariable) {
  return this.operande1.deriveePossible(indiceVariable) && this.operande2.deriveePossible(indiceVariable)
}

CFonction2Var.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CFonction2Var(this.listeProprietaire, this.opef,
    this.operande1.calculAvecValeursRemplacees(bfrac), this.operande2.calculAvecValeursRemplacees(bfrac))
}
// Déplacé ici version 6.4.7
CFonction2Var.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  const op1 = this.operande1.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  const op2 = this.operande2.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
  return new CFonction2Var(this.listeProprietaire, this.opef, op1, op2)
}
