/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import Complexe from '../types/Complexe'
import Fonte from '../types/Fonte'
import Ope from '../types/Ope'
import { divComp, erreurCalculException } from '../kernel/kernel'
import CCb from './CCb'
import CCbGlob from '../kernel/CCbGlob'

const { add, multiply, matrix } = mathjs

export default COperation

/**
 * @constructor
 * @extends CCb
 * Classe représentant une opération dans un arbre binaire de calcul.
 * @param {CListeObjets} listeProprietaire  La liste propriétaire
 * @param {CCb} operande1  L'opérande de gauche
 * @param {CCb} operande2  L'opérande de droite
 * @param {number} ope  Caractérise l'opérateur. Voir Operateur.
 * @returns {COperation}
 */
function COperation (listeProprietaire, operande1, operande2, ope) {
  CCb.call(this, listeProprietaire)
  if (arguments.length > 1) {
    this.operande1 = operande1
    this.operande2 = operande2
    this.ope = ope
  }
  this.c1 = new Complexe()
  this.c2 = new Complexe()
}
COperation.prototype = new CCb()
COperation.prototype.constructor = COperation
COperation.prototype.superClass = 'CCb'
COperation.prototype.className = 'COperation'

COperation.zeroComp = '0+0*i'

COperation.prototype.nature = function () {
  return CCbGlob.natOperation
}

COperation.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande1 = this.operande1.getClone(listeSource, listeCible)
  const cloneOperande2 = this.operande2.getClone(listeSource, listeCible)
  return new COperation(listeCible, cloneOperande1, cloneOperande2, this.ope)
}

COperation.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande1.initialisePourDependance()
  this.operande2.initialisePourDependance()
}

COperation.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(this.operande1.depDe(p) || this.operande2.depDe(p))
}

COperation.prototype.dependDePourBoucle = function (p) {
  return this.operande1.dependDePourBoucle(p) || this.operande2.dependDePourBoucle(p)
}

COperation.prototype.existe = function () {
  return this.operande1.existe() && this.operande2.existe()
}
/**
 * Fonction renvoyant le résultat de l'opérateur appliqué aux nombres réels
 * op1 (opérande de gauche) et op2 (opérande de droite).
 * @param {number} op1  Opérande de gauche
 * @param {number} op2  Opérande de droite
 * @returns {number} : Le résultat de l'opération
 */
COperation.prototype.resultatBase = function (op1, op2) {
  let denom
  switch (this.ope) {
    case Ope.Plus:
      return op1 + op2
    case Ope.Moin:
      return op1 - op2
    case Ope.Mult:
      return op1 * op2
    // à revoir pour gestion des exceptions
    case Ope.Divi:
      denom = op2
      if (denom === 0) throw new Error(erreurCalculException)
      else return op1 / denom
    case Ope.Inf:
      if (op1 < op2) { return 1 } else return 0
    case Ope.Sup:
      if (op1 > op2) { return 1 } else return 0
    case Ope.InfOuEgal:
      if (op1 <= op2) { return 1 } else return 0
    case Ope.SupOuEgal:
      if (op1 >= op2) { return 1 } else return 0
    case Ope.Egalite:
      if (op1 === op2) { return 1 } else return 0
    case Ope.Diff:
      if (op1 !== op2) { return 1 } else return 0
    // Ajout version 4.9.5
    case Ope.And:
      if ((op1 === 1) && (op2 === 1)) return 1; else return 0
    case Ope.Or:
      if ((op1 === 1) || (op2 === 1)) return 1; else return 0

    default: return 0
  } // switch Ope
}

COperation.prototype.resultatMatBase = function (op1, op2) {
  if (typeof op1 === 'number' && typeof op2 === 'number') return this.resultatBase(op1, op2)
  if (typeof op1 === 'number') {
    // Cas du produit d'une matrice par un nombre
    return this.applyToMat(op1, op2, true)
  }
  if (typeof op2 === 'number') {
    // Cas du produit d'une matrice par un nombre
    return this.applyToMat(op2, op1, false)
  }
  // Cas de l'opération appliquée à deux matrices qui sont données sous forme d'arrays
  const size1 = op1.size()
  const n1 = size1[0] // Nb lignes matrice de droite
  const p1 = size1[1] // Nb colonnes matrice de gauche
  const size2 = op2.size()
  const n2 = size2[0] // Nb lignes matrice de droite
  const p2 = size2[1] // Nb colonnes matrice de droite
  let res, size
  switch (this.ope) {
    case Ope.Mult :
      if (p1 !== n2) throw new Error(erreurCalculException)
      res = multiply(op1, op2)
      size = res.size()
      if (size[0] === 1 && size[1] === 1) return res.get([0, 0])
      return res
    case Ope.Plus :
      if (n1 !== n2 || p1 !== p2) throw new Error(erreurCalculException)
      res = add(op1, op2)
      size = res.size()
      if (size[0] === 1 && size[1] === 1) return res.get([0, 0])
      return res
    case Ope.Moin :
      if (n1 !== n2 || p1 !== p2) throw new Error(erreurCalculException)
      // Curieusement mathjs n'a pas prévu d'exporter la soustraction
      // res = add.subtract(op1, op2)
      res = []
      for (let i = 0; i < n1; i++) {
        const lig = []
        res.push(lig)
        for (let j = 0; j < p1; j++) {
          lig.push(op1.get([i, j]) - op2.get([i, j]))
        }
      }
      res = matrix(res)
      size = res.size()
      if (size[0] === 1 && size[1] === 1) return res.get([0, 0])
      return res
    case Ope.Divi: // Division terme à terme
      if (n1 !== n2 || p1 !== p2) throw new Error(erreurCalculException)
      // Curieusement mathjs n'a pas prévu d'exporter la soustraction
      // res = add.subtract(op1, op2)
      res = []
      for (let i = 0; i < n1; i++) {
        const lig = []
        res.push(lig)
        for (let j = 0; j < p1; j++) {
          const n = op1.get([i, j])
          const d = op2.get([i, j])
          if (d === 0) throw new Error(erreurCalculException)
          lig.push(n / d)
        }
      }
      res = matrix(res)
      size = res.size()
      if (size[0] === 1 && size[1] === 1) return res.get([0, 0])
      return res
    case Ope.Egalite : // Test d'égalité de deux matrices ajouté version 6.7.2
      if (n1 !== n2 || p1 !== p2) throw new Error(erreurCalculException)
      for (let i = 0; i < n1; i++) {
        for (let j = 0; j < p1; j++) {
          if (op1.get([i, j]) !== op2.get([i, j])) return 0
        }
      }
      return 1
    case Ope.Diff : // Test d'égalité de deux matrices ajouté version 6.7.2
      if (n1 !== n2 || p1 !== p2) throw new Error(erreurCalculException)
      for (let i = 0; i < n1; i++) {
        for (let j = 0; j < p1; j++) {
          if (op1.get([i, j]) !== op2.get([i, j])) return 1
        }
      }
      return 0
    default :
      throw new Error(erreurCalculException)
  }
}

COperation.prototype.resultat = function (infoRandom) {
  const o1 = this.operande1.resultat(infoRandom)
  const o2 = this.operande2.resultat(infoRandom)
  return this.resultatBase(o1, o2)
}
COperation.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  const o1 = this.operande1.resultatFonction(infoRandom, valeurParametre)
  const o2 = this.operande2.resultatFonction(infoRandom, valeurParametre)
  return this.resultatBase(o1, o2)
}
COperation.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const o1 = this.operande1.resultatMatFonction(infoRandom, valeurParametre)
  const o2 = this.operande2.resultatMatFonction(infoRandom, valeurParametre)
  return this.resultatMatBase(o1, o2)
}
// op1 et op2 pointent sur deux complexes : les opérandes
/**
 * Fonction renvoyant le résultat de l'opérateur appliqué aux nombres complexes
 * pointés par op1 (opérande de gauche) et op2 (opérande de droite).
 * @param {Complexe} op1  Opérande de gauche
 * @param {Complexe} op2  Opérande de droite
 * @param {Complexe} zRes  Le complexe dans lequel on met le résultat de l'opération.
 * @returns {void}
 */
COperation.prototype.resultatComplexeBase = function (op1, op2, zRes) {
  switch (this.ope) {
    case Ope.Plus:
      zRes.x = op1.x + op2.x
      zRes.y = op1.y + op2.y
      return
    case Ope.Moin:
      zRes.x = op1.x - op2.x
      zRes.y = op1.y - op2.y
      return
    case Ope.Mult:
      zRes.x = op1.x * op2.x - op1.y * op2.y
      zRes.y = op1.x * op2.y + op1.y * op2.x
      return
    case Ope.Divi:
      if ((op2.x === 0) && (op2.y === 0)) throw new Error(erreurCalculException)
      else divComp(op1, op2, zRes)
      return
    case Ope.Inf:
      // Si on est dans C, on n'accepte de comparer deux complexes
      // que s'ils sont réels
      zRes.x = 0
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) { throw new Error(erreurCalculException) } else {
        const mod1 = op1.x * op1.x + op1.y * op1.y
        const mod2 = op2.x * op2.x + op2.y * op2.y
        if (mod1 < mod2) zRes.x = 1
        else zRes.x = 0
        return
      }
    case Ope.Sup:
      // Si on est dans C, on n'accepte de comparer deux complexes
      // que s'ils sont réels
      zRes.x = 0
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) { throw new Error(erreurCalculException) } else {
        if (op1.x > op2.x) zRes.x = 1
        else zRes.x = 0
        return
      }
    case Ope.InfOuEgal:
      // Si on est dans C, on n'accepte de comparer deux complexes
      // que s'ils sont réels
      zRes.x = 0
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) { throw new Error(erreurCalculException) } else {
        if (op1.x <= op2.x) zRes.x = 1
        else zRes.x = 0
        return
      }
    case Ope.SupOuEgal:
      // Si on est dans C, on n'accepte de comparer deux complexes
      // que s'ils sont réels
      zRes.x = 0
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) throw new Error(erreurCalculException)
      else {
        if (op1.x >= op2.x) zRes.x = 1
        else zRes.x = 0
        return
      }
    case Ope.Egalite:
      zRes.y = 0
      if ((op1.x === op2.x) && (op1.y === op2.y)) zRes.x = 1
      else zRes.x = 0
      return
    case Ope.Diff:
      zRes.y = 0
      if ((op1.x !== op2.x) || (op1.y !== op2.y)) zRes.x = 1
      else zRes.x = 0
      return
    // Ajout version 4.9.5
    case Ope.And:
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) zRes.x = 0 // aux si les opérandes ne sont pas réels
      else {
        if ((op1.x === 1) && (op2.x === 1)) zRes.x = 1
        else zRes.x = 0
      }
      return
    case Ope.Or:
      zRes.y = 0
      if ((op1.y !== 0) || (op2.y !== 0)) zRes.x = 0 // Faux si les opérandes ne sont pas réels
      else {
        if ((op1.x === 1) || (op2.x === 1)) zRes.x = 1
        else zRes.x = 0
      }
  } // switch Ope
}

COperation.prototype.resultatComplexe = function (infoRandom, zRes) {
  this.operande1.resultatComplexe(infoRandom, this.c1)
  this.operande2.resultatComplexe(infoRandom, this.c2)
  this.resultatComplexeBase(this.c1, this.c2, zRes)
}

COperation.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  this.operande1.resultatFonctionComplexe(infoRandom, valeurParametre, this.c1)
  this.operande2.resultatFonctionComplexe(infoRandom, valeurParametre, this.c2)
  this.resultatComplexeBase(this.c1, this.c2, zRes)
}

COperation.prototype.resultatMat = function (infoRandom) {
  const op1 = this.operande1.resultatMat(infoRandom)
  const op2 = this.operande2.resultatMat(infoRandom)
  return this.resultatMatBase(op1, op2)
}

/**
 * Fonction appliquant l'opération de base entre une matrice et un nombre
 * @param {number} nb Le nombre
 * @param {MathJsChain} mat La matrice
 * @param nbleft true si la matrice est l'opérande de gauche, false sinon
 * @returns {MathJsChain}
 */
COperation.prototype.applyToMat = function (nb, mat, nbleft) {
  const size = mat.size()
  const n = size[0]
  const p = size[1]
  const res = []
  for (let i = 0; i < n; i++) {
    const lig = []
    for (let j = 0; j < p; j++) {
      lig.push(this.resultatBase(nbleft ? nb : mat.get([i, j]), nbleft ? mat.get([i, j]) : nb))
    }
    res.push(lig)
  }
  return matrix(res)
}

COperation.prototype.dependDeVariable = function (ind) {
  return this.operande1.dependDeVariable(ind) || this.operande2.dependDeVariable(ind)
}

COperation.prototype.getCopie = function () {
  return new COperation(this.listeProprietaire, this.operande1.getCopie(), this.operande2.getCopie(),
    this.ope)
}

COperation.prototype.getCore = function () {
  return new COperation(this.listeProprietaire, this.operande1.getCore(), this.operande2.getCore())
}

COperation.prototype.chaineCalcul = function (varFor) {
  let op1, op2
  let ch1 = ''; let ch2 = ''; let ch = ''
  const parouv = '('
  const parfer = ')'
  switch (this.ope) {
    case Ope.Plus:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) ||
          (op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else {
        if (this.operande1.nature() === CCbGlob.natMoinsUnaire) ch1 = this.operande1.chaineCalculSansPar(varFor)
        else ch1 = this.operande1.chaineCalcul(varFor)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Plus) || (op2 === Ope.Moin) ||
          (op2 === Ope.Mult) || (op2 === Ope.Divi)) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = parouv + ch1 + '+' + ch2 + parfer
      break
    case Ope.Moin:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) ||
          (op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else {
        if (this.operande1.nature() === CCbGlob.natMoinsUnaire) ch1 = this.operande1.chaineCalculSansPar(varFor)
        else ch1 = this.operande1.chaineCalcul(varFor)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Mult) || (op2 === Ope.Divi)) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = parouv + ch1 + '-' + ch2 + parfer
      break
    case Ope.Mult:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      /*
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if (op2 === Ope.Mult) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
       */
      ch2 = this.operande2.chaineCalcul(varFor)
      ch = parouv + ch1 + '*' + ch2 + parfer
      break
    case Ope.Divi:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      ch2 = this.operande2.chaineCalcul(varFor)
      ch = parouv + ch1 + '/' + ch2 + parfer
      break
    case Ope.Inf:
    case Ope.Sup:
    case Ope.InfOuEgal:
    case Ope.SupOuEgal:
    case Ope.Egalite:
    case Ope.Diff:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        // var oper1 = operande1;
        if (Ope.estTest(this.operande1.ope)) ch1 = this.operande1.chaineCalcul(varFor)
        else ch1 = this.operande1.chaineCalculSansPar(varFor)
      } else ch1 = this.operande1.chaineCalculSansPar(varFor)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        // var oper2 = operande2;
        if (Ope.estTest(this.operande2.ope)) ch2 = this.operande2.chaineCalcul(varFor)
        else ch2 = this.operande2.chaineCalculSansPar(varFor)
      } else ch2 = this.operande2.chaineCalculSansPar(varFor)
      ch = parouv + ch1 + Ope.chaineOperateur(this.ope) + ch2 + parfer
      break
    case Ope.And: // Modifié version 6.3.4
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if (op1 === Ope.Or) { ch1 = this.operande1.chaineCalcul(varFor) } else ch1 = this.operande1.chaineCalculSansPar(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if (op2 === Ope.Or) { ch2 = this.operande2.chaineCalcul(varFor) } else ch2 = this.operande2.chaineCalculSansPar(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = parouv + ch1 + Ope.chaineOperateur(this.ope) + ch2 + parfer
      break
    case Ope.Or:
      ch1 = this.operande1.chaineCalculSansPar(varFor)
      ch2 = this.operande2.chaineCalculSansPar(varFor)
      ch = parouv + ch1 + Ope.chaineOperateur(this.ope) + ch2 + parfer
  } // switch Ope}
  // Au cas où le calcul commençait par un moins unaire, la chaine commence par "0-"
  if (ch.substring(0, 3) === '(0-') ch = parouv + '-' + ch.substring(3)
  return ch
}
COperation.prototype.chaineCalculSansPar = function (varFor) {
  let op1, op2
  let ch1 = ''; let ch2 = ''; let ch = ''
  switch (this.ope) {
    case Ope.Plus:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) ||
          (op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else {
        if (this.operande1.nature() === CCbGlob.natMoinsUnaire) ch1 = this.operande1.chaineCalculSansPar(varFor)
        else ch1 = this.operande1.chaineCalcul(varFor)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Plus) || (op2 === Ope.Moin) ||
          (op2 === Ope.Mult) || (op2 === Ope.Divi)) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = ch1 + '+' + ch2
      break
    case Ope.Moin:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) ||
          (op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else {
        if (this.operande1.nature() === CCbGlob.natMoinsUnaire) ch1 = this.operande1.chaineCalculSansPar(varFor)
        else ch1 = this.operande1.chaineCalcul(varFor)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Mult) || (op2 === Ope.Divi)) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = ch1 + '-' + ch2
      break
    case Ope.Mult:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      /* Modifé version 7.2.2 pour laisser certaines parentèses comme par exemple dans 1/4*(1/3*x²)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if (op2 === Ope.Mult) { ch2 = this.operande2.chaineCalculSansPar(varFor) } else ch2 = this.operande2.chaineCalcul(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
       */
      ch2 = this.operande2.chaineCalcul(varFor)
      ch = ch1 + '*' + ch2
      break
    case Ope.Divi:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Mult) || (op1 === Ope.Divi)) { ch1 = this.operande1.chaineCalculSansPar(varFor) } else ch1 = this.operande1.chaineCalcul(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      ch2 = this.operande2.chaineCalcul(varFor)
      ch = ch1 + '/' + ch2
      break
    // Modifié version 3.0
    case Ope.Inf:
    case Ope.Sup:
    case Ope.InfOuEgal:
    case Ope.SupOuEgal:
    case Ope.Egalite:
    case Ope.Diff:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        // var oper1 = operande1;
        if (Ope.estTest(this.operande1.ope)) ch1 = this.operande1.chaineCalcul(varFor)
        else ch1 = this.operande1.chaineCalculSansPar(varFor)
      } else ch1 = this.operande1.chaineCalculSansPar(varFor)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        // var oper2 = operande2;
        if (Ope.estTest(this.operande2.ope)) ch2 = this.operande2.chaineCalcul(varFor)
        else ch2 = this.operande2.chaineCalculSansPar(varFor)
      } else ch2 = this.operande2.chaineCalculSansPar(varFor)
      ch = ch1 + Ope.chaineOperateur(this.ope) + ch2
      break
    case Ope.And: // Modifié version 6.3.4
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if (op1 === Ope.Or) { ch1 = this.operande1.chaineCalcul(varFor) } else ch1 = this.operande1.chaineCalculSansPar(varFor)
      } else ch1 = this.operande1.chaineCalcul(varFor)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if (op2 === Ope.Or) { ch2 = this.operande2.chaineCalcul(varFor) } else ch2 = this.operande2.chaineCalculSansPar(varFor)
      } else ch2 = this.operande2.chaineCalcul(varFor)
      ch = ch1 + Ope.chaineOperateur(this.ope) + ch2
      break
    case Ope.Or:
      ch1 = this.operande1.chaineCalculSansPar(varFor)
      ch2 = this.operande2.chaineCalculSansPar(varFor)
      ch = ch1 + Ope.chaineOperateur(this.ope) + ch2
  } // switch Ope}
  // Pour un calcul complexe nul la chaîne renvoyée est "0+0*i" on renvoie alors "0"
  if (ch === COperation.zeroComp) return '0'
  // Au cas où le calcul commençait par un moins unaire, la chaine commence par "0-"
  if (ch.substring(0, 2) === '0-') ch = ch.substring(1)

  return ch
}

COperation.prototype.chaineLatex = function (varFor, fracSimple = false) {
  return '\\left(' + this.chaineLatexSansPar(varFor, fracSimple) + '\\right)'
}

COperation.prototype.chaineLatexSansPar = function (varFor, fracSimple = false) {
  const codefrac = fracSimple ? '\\frac{' : '\\dfrac{'
  let op1, op2, bsignemult, bfrac, natop2
  let ch1 = ''; let ch2 = ''; let ch = ''
  switch (this.ope) {
    case Ope.Plus:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) || (op1 === Ope.Mult) || (op1 === Ope.Divi)) {
          ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
        } else ch1 = this.operande1.chaineLatex(varFor, fracSimple)
      } else ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Plus) || (op2 === Ope.Moin) ||
          (op2 === Ope.Mult) || (op2 === Ope.Divi)) {
          ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
        } else ch2 = this.operande2.chaineLatex(varFor, fracSimple)
        // } else ch2 = this.operande2.chaineLatex(varFor) // Modifié version 6.4.8
      } else ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
      if (ch2.charAt(0) === '-') ch = ch1 + '-' + ch2.substring(1)
      else ch = ch1 + '+' + ch2
      break
    case Ope.Moin:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Plus) || (op1 === Ope.Moin) || (op1 === Ope.Mult) || (op1 === Ope.Divi)) {
          ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
        } else ch1 = this.operande1.chaineLatex(varFor, fracSimple)
      } else {
        if (this.operande1.nature() === CCbGlob.natMoinsUnaire) ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
        else ch1 = this.operande1.chaineLatex(varFor, fracSimple)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Mult) || (op2 === Ope.Divi)) {
          ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
        } else ch2 = this.operande2.chaineLatex(varFor, fracSimple)
      } else ch2 = this.operande2.chaineLatex(varFor, fracSimple)
      ch = ch1 + '-' + ch2
      break
    case Ope.Mult:
      bsignemult = false
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if ((op1 === Ope.Mult) || (op1 === Ope.Divi)) {
          ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
        } else ch1 = this.operande1.chaineLatex(varFor, fracSimple)
        // if (op1 == Ope.Divi) bsignemult = true; // Supprimé version 4.9.2
      } else ch1 = this.operande1.chaineLatex(varFor, fracSimple)
      if (this.operande2.nature() === CCbGlob.natOperation) {
        op2 = this.operande2.ope
        if ((op2 === Ope.Mult) || (op2 === Ope.Divi)) {
          ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
        } else ch2 = this.operande2.chaineLatex(varFor, fracSimple)
        if (op2 === Ope.Divi) bsignemult = true
      } else {
        if (this.operande2.nature() === CCbGlob.natMoinsUnaire) {
          bsignemult = true
        }
        ch2 = this.operande2.chaineLatex(varFor, fracSimple)
      }
      // Amélioration version 7.6.2 : Si ch2 est une lettre de un caractère et que ch1 finit par ch2
      // on rajoute un signe de multiplication
      if (bsignemult || Fonte.chiffre(ch2.charAt(0)) || ((ch2.length === 1) && (ch1.endsWith(ch2)) && Fonte.lettre(ch2))) ch = ch1 + '\\times ' + ch2 // Espace de fin nécessaire
      else ch = ch1 + ch2
      break
    case Ope.Divi:
      bfrac = true
      if (this.operande1.nature() === CCbGlob.natOperation) {
        op1 = this.operande1.ope
        if (op1 === Ope.Mult) {
          bfrac = false
          const operandegauche1 = this.operande1.operande1
          if (operandegauche1.nature() === CCbGlob.natOperation) {
            const opgauche1 = operandegauche1.ope
            if (opgauche1 === Ope.Divi) {
              bfrac = false
              ch1 = this.operande1.operande1.chaineLatexSansPar(varFor, fracSimple)
              ch2 = codefrac + this.operande1.operande2.chaineLatexSansPar(varFor, fracSimple) +
                '} {' + this.operande2.chaineLatexSansPar(varFor, fracSimple) + '}'
            } else {
              bfrac = true
              ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
              ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
            }
          } else {
            bfrac = true
            ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
            ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
          }
        } else {
          ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
          ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
        }
      } else {
        ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
        ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
      }
      if (bfrac) ch = codefrac + ch1 + '}{' + ch2 + '}'
      else ch = ch1 + '\\times' + ch2

      break
    // Modifié version 3.0
    case Ope.Inf:
    case Ope.Sup:
    case Ope.InfOuEgal:
    case Ope.SupOuEgal:
    case Ope.Egalite:
    case Ope.Diff:
      if (this.operande1.nature() === CCbGlob.natOperation) {
        // var oper1 = operande1;
        if (Ope.estTest(this.operande1.ope)) ch1 = this.operande1.chaineLatex(varFor, fracSimple)
        else ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
      } else {
        // else ch1 = operande1.chaineCalculSansPar(varFor); Correction défaut version 4.7.2
        ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
      }
      if (this.operande2.nature() === CCbGlob.natOperation) {
        // var oper2 = operande2;
        if (Ope.estTest(this.operande2.ope)) ch2 = this.operande2.chaineLatex(varFor, fracSimple)
        else ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
      } else ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)

      ch = ch1 + Ope.chaineOperateurLatex(this.ope) + ' ' + ch2
      break
    case Ope.And:
    case Ope.Or:
      ch1 = this.operande1.chaineLatexSansPar(varFor, fracSimple)
      natop2 = this.operande2.nature()
      if (natop2 === CCbGlob.natOperation) {
        op2 = this.operande2.operateur
        if ((op2 === Ope.And) || (op2 === Ope.Or)) ch2 = this.operande2.chaineLatex(varFor, fracSimple)
        else ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
      } else ch2 = this.operande2.chaineLatexSansPar(varFor, fracSimple)
      ch = ch1 + Ope.chaineOperateurLatex(this.ope) + ch2
  } // switch Ope}
  // Pour un calcul complexe nul la chaîne renvoyée est "0+0*i" on renvoie alors "0"
  if (ch === COperation.zeroComp) return '0'
  // Au cas où le calcul commençait par un moins unaire, la chaine commence par "0-"
  if (ch.substring(0, 2) === '0-') ch = ch.substring(1)

  return ch
}

COperation.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.ope = inps.readByte()
  this.operande1 = inps.readObject(list)
  this.operande2 = inps.readObject(list)
}

COperation.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeByte(this.ope)
  oups.writeObject(this.operande1)
  oups.writeObject(this.operande2)
}

COperation.prototype.estConstant = function () {
  return this.operande1.estConstant() && this.operande2.estConstant()
}

COperation.prototype.deriveePossible = function (indiceVariable) {
  return this.operande1.deriveePossible(indiceVariable) && this.operande2.deriveePossible(indiceVariable)
}

COperation.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new COperation(this.listeProprietaire, this.operande1.calculAvecValeursRemplacees(bfrac),
    this.operande2.calculAvecValeursRemplacees(bfrac), this.ope)
}

COperation.prototype.membreGauche = function () {
  return this.operande1
}

COperation.prototype.membreDroit = function () {
  return this.operande2
}

COperation.prototype.isCalcVect = function (tabNames) {
  const op1 = this.operande1
  const op2 = this.operande2
  switch (this.ope) {
    case Ope.Plus:
    case Ope.Moin:
    case Ope.Egalite: // Une  égamité est considérée comme résultat vectoriel si les deux membres le sont
      return (op1.isCalcVect(tabNames) || op1.isVectNul()) && (op2.isCalcVect(tabNames) || op2.isVectNul())
    case Ope.Mult:
      return !op1.isCalcVect(tabNames) && (op2.isCalcVect(tabNames) || op2.isVectNul()) // On autorise k*vecteur mais pas vecteur*
    default:
      return false
  }
}

COperation.prototype.isCalcOK4Vect = function (tabNames) {
  if (!(this.operande1.isCalcOK4Vect(tabNames) && this.operande2.isCalcOK4Vect(tabNames))) return false
  const op1 = this.operande1
  const op2 = this.operande2
  switch (this.ope) {
    case Ope.Plus:
    case Ope.Moin:
      return (op1.isCalcVect(tabNames) && op2.isCalcVect(tabNames)) || (!op1.isCalcVect(tabNames) && !op2.isCalcVect(tabNames))
    case Ope.Mult:
      // On autorise k*vecteur mais pas vecteur*k
      return (!op1.isCalcVect(tabNames) && op2.isCalcVect(tabNames)) || (!op1.isCalcVect(tabNames) && !op2.isCalcVect(tabNames))
    case Ope.Divi:
      // On n'autorise pas de division par un vecteur et on ne divise pas un vecteur même par un nombre
      // Mais on peut diviser un nombre par un nombre
      return !op1.isCalcVect(tabNames) && !op2.isCalcVect(tabNames)
    default:
      return true
  }
}

/**
 * Fonction servant uniquement dans les exercices sur le produit scalaire pour rendre un calcul
 * adapté à un calcul de produit scalaire.
 * La seule différence avec un arbre de calcul normal est de remplacer un vecteur élevé au carré par le carré de sa norme
 * @param {string[]} tabNames Tableau ontenant les noms des calculs complexes considérés comme des vecteurs
 * @returns {CCb}
 */
COperation.prototype.getCalc4Prosca = function (tabNames) {
  return new COperation(
    this.listeProprietaire,
    this.operande1.getCalc4Prosca(tabNames),
    this.operande2.getCalc4Prosca(tabNames),
    this.ope
  )
}
