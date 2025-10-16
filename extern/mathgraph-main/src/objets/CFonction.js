/**
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import Complexe from '../types/Complexe'
import Opef from '../types/Opef'
import { ConvDegRad, ConvRadDeg, erreurCalculException, fracCont, getStr, uniteAngleRadian } from '../kernel/kernel'
import CCb, { getLeft, getRight } from './CCb'
import CCbGlob from '../kernel/CCbGlob'
import Ope from '../types/Ope'

const { det, matrix } = mathjs

export default CFonction

/**
 * Classe représentant dans un arbre binaire de calcul un appel de fonction réelle
 * à une variable prédéfinie.
 * @constructor
 * @extends CCb
 * @param {CListeObjets} listeProprietaire La liste propriétaire de l'objet
 * @param {Opef} opef Donne la nature de la fonction.
 * @param {CCb} operande Le calcul donnant l'opérande.
 * @returns {CFonction}
 */
function CFonction (listeProprietaire, opef, operande) {
  CCb.call(this, listeProprietaire)
  if (arguments.length !== 1) {
    this.opef = opef
    this.operande = operande
  }
  this.dejaPositionne = false // ne servira que pour un appel fonction Rand() de génération d'un nombre aléatoire.
  this.valeurDejaPrise = 0 // Comme son nom l'indique pour les appels de random
  this.valeurDejaPriseImaginaire = 0 // Partie imaginaire pour les fonctions complexes pour les appels de random
  this.z1loc = new Complexe()
}
CFonction.prototype = new CCb()
CFonction.prototype.constructor = CFonction
CFonction.prototype.superClass = 'CCb'
CFonction.prototype.className = 'CFonction'

CFonction.prototype.nature = function () {
  return CCbGlob.natFonction
}
CFonction.prototype.numeroVersion = function () {
  return 2
}
CFonction.prototype.nombreVariables = function () {
  return 1
}
CFonction.prototype.getClone = function (listeSource, listeCible) {
  const cloneOperande = this.operande.getClone(listeSource, listeCible)
  const ptcalc = new CFonction(listeCible, this.opef, cloneOperande)
  // Les trois lignes suivantes ajoutées version 4.4 pour que les valeurs rand ne changent pas dans l'annuler-refaire
  ptcalc.dejaPositionne = this.dejaPositionne
  ptcalc.valeurDejaPrise = this.valeurDejaPrise
  ptcalc.valeurDejaPriseImaginaire = this.valeurDejaPriseImaginaire
  return ptcalc
}
CFonction.prototype.initialisePourDependance = function () {
  CCb.prototype.initialisePourDependance.call(this)
  this.operande.initialisePourDependance()
}
CFonction.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCb.prototype.depDe.call(this, p) || this.operande.depDe(p))
}
CFonction.prototype.dependDePourBoucle = function (p) {
  if (this.opef === Opef.Rand) {
    // if (p instanceof CVariableBornee) return true;
    if (p.className === 'CVariableBornee') return true
    else return this.operande.dependDePourBoucle(p)
  } else return this.operande.dependDePourBoucle(p)
}
CFonction.prototype.existe = function () {
  return this.operande.existe()
}

CFonction.prototype.resultatBase = function (infoRandom, x) {
  let a, b
  switch (this.opef) {
    case Opef.Abso:
      return Math.abs(x)
    case Opef.Enti:
      return Math.floor(x)
    case Opef.Raci:
    case Opef.Raci2:
      if (x >= 0) { return Math.sqrt(x) } else throw new Error(erreurCalculException)
    case Opef.Sinu:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return CCbGlob.sinus(x)
      else return CCbGlob.sinus(x * ConvDegRad)
    case Opef.Cosi:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return CCbGlob.cosinus(x)
      else return CCbGlob.cosinus(x * ConvDegRad)
    case Opef.Tang:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return CCbGlob.tangente(x)
      else {
        return CCbGlob.tangente(x * ConvDegRad)
      }
    case Opef.Logn:
      if (x > 0) return Math.log(x)
      else throw new Error(erreurCalculException)
    case Opef.Expo:
      return Math.exp(x)
    case Opef.ATan:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return Math.atan(x)
      else return Math.atan(x) * ConvRadDeg
    case Opef.ACos:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return Math.acos(x)
      else return Math.acos(x) * ConvRadDeg
    case Opef.ASin:
      if (this.listeProprietaire.uniteAngle === uniteAngleRadian) return Math.asin(x)
      else return Math.asin(x) * ConvRadDeg
    case Opef.Cosh:
      return (Math.exp(x) + Math.exp(-x)) / 2
    case Opef.Sinh:
      return (Math.exp(x) - Math.exp(-x)) / 2
    case Opef.Tanh: {
      a = Math.exp(x)
      b = Math.exp(-x)
      return (a - b) / (a + b)
    }
    case Opef.ArgCh:
      if (x >= 1) return Math.log(x + Math.sqrt(x * x - 1))
      else throw new Error(erreurCalculException)
    case Opef.ArgSh:
      return Math.log(x + Math.sqrt(x * x + 1))
    case Opef.ArgTh:
      if ((x > -1) && (x < 1)) return 0.5 * Math.log((1 + x) / (1 - x))
      else throw new Error(erreurCalculException)
    case Opef.Rand:
      if (infoRandom) {
        this.valeurDejaPrise = Math.random()
        this.dejaPositionne = true
        return this.valeurDejaPrise
      } else {
        if (!this.dejaPositionne) {
          this.valeurDejaPrise = Math.random()
          this.dejaPositionne = true
          return this.valeurDejaPrise
        } else return this.valeurDejaPrise
      }
    case Opef.fact:
      if ((x < 0) || (x !== Math.round(x))) throw new Error(erreurCalculException)
      if (x <= 32) {
        let p = 1
        for (let i = 2; i <= x; i++) {
          p = p * i
        }
        return p
      } else {
        let x1 = x
        let d = 1 + 1 / (12 * x1)
        x1 *= x
        d += 1 / (288 * x1)
        x1 *= x
        d -= 139 / (51840 * x1)
        x1 *= x
        d -= 571 / (2488320 * x1)
        x1 *= x
        d -= 163879 / (209018880 * x1)
        return Math.exp(0.5 * Math.log(2 * Math.PI * x) + x * (Math.log(x) - 1)) * d
      }
    case Opef.Transp: // Ajout version 6.7 pour la transposition d'une matrice
    case Opef.Deter: // Ajout version 6.7 pour la transposition d'une matrice
      // Appelé pour un réel ne fait rien, renvoie comme résultat le paramètre
      return x
    case Opef.Inv: // Ajouté version 6.7 pour inverse terme à terme d'une matrice
      if (x === 0) throw new Error(erreurCalculException)
      else return 1 / x
    case Opef.Nbcol: // Ajouté version 7.0 pour renvoyer le combre de colonnes d'une matrice
    case Opef.Nbrow: // Ajouté version 7.0 pour renvoyer le combre de colonnes d'une matrice
    // Appliqué à un nombre renvoie 1 (nombre considéré comme matrice à une ligne et une colonne)
      return 1
    default : throw new Error(erreurCalculException)
  }// switch Opef}
}
CFonction.prototype.resultat = function (infoRandom) {
  let mg, md, x1
  switch (this.opef) {
    case Opef.Left :
    case Opef.LeftC : // Rajouté version 4.7.2
      mg = getLeft(this.operande)
      if (mg === null) {
        throw new Error(erreurCalculException)
      } else return mg.resultat(infoRandom)
    case Opef.Right :
    case Opef.RightC : // Rajouté version 4.7.2
      md = getRight(this.operande)
      if (md === null) {
        throw new Error(erreurCalculException)
      }
      return md.resultat(infoRandom)
    case Opef.Core:
    case Opef.CoreC:
      return this.operande.getCore().resultat()
    default :
      x1 = this.operande.resultat(infoRandom)
      return this.resultatBase(infoRandom, x1)
  }
}

CFonction.prototype.resultatFonction = function (infoRandom, valeurParametre) {
  let mg, md, x1
  switch (this.opef) {
    case Opef.Left :
    case Opef.LeftC : // Rajouté version 4.7.2
      mg = getLeft(this.operande)
      if (mg === null) {
        throw new Error(erreurCalculException)
      }
      return mg.resultatFonction(infoRandom, valeurParametre)
    case Opef.Right :
    case Opef.RightC : // Rajouté version 4.7.2
      md = getRight(this.operande)
      if (md === null) {
        throw new Error(erreurCalculException)
      }
      return md.resultatFonction(infoRandom, valeurParametre)
    case Opef.Core:
    case Opef.CoreC:
      return this.operande.getCore().resultatFonction(infoRandom, valeurParametre)
    default :
      x1 = this.operande.resultatFonction(infoRandom, valeurParametre)
      return this.resultatBase(infoRandom, x1)
  }
}
CFonction.prototype.resultatComplexeBase = function (infoRandom, z, zRes) {
  switch (this.opef) {
    case Opef.Abs:
    case Opef.Abso : // Version 8.1.3 : La fonction valeur absolue réelle renvoie, quand elle est injectée
      // dans une formule complexe le module
      zRes.y = 0
      zRes.x = z.module()
      return
    case Opef.Sin:
      z.sinComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Sinu :
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = CCbGlob.sinus(z.x)
        else zRes.x = CCbGlob.sinus(z.x * ConvDegRad)
        return
      }
    case Opef.Cos:
      z.cosComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Cosi :
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = CCbGlob.cosinus(z.x)
        else zRes.x = CCbGlob.cosinus(z.x * ConvDegRad)
        return
      }
    case Opef.Tan:
      z.tanComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Tang :
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = CCbGlob.tangente(z.x)
        else zRes.x = z.x * ConvDegRad // Corrigé version 6.7
        return
      }
    case Opef.Log:
      z.lnComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Logn :
      if ((z.y !== 0) || (z.x <= 0)) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        zRes.x = Math.log(z.x)
        return
      }
    case Opef.Exp:
      z.expComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Expo:
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        zRes.x = Math.exp(z.x)
        return
      }
    case Opef.Ch:
      z.chComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Cosh:
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        zRes.x = (Math.exp(z.x) + Math.exp(-z.x)) / 2
        return
      }
    case Opef.Sh:
      z.shComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Sinh :
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        zRes.x = (Math.exp(z.x) - Math.exp(-z.x)) / 2
        return
      }
    case Opef.Th:
      z.thComp(this.listeProprietaire.uniteAngle, zRes)
      return
    case Opef.Tanh :
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        const a = Math.exp(z.x)
        const b = Math.exp(-z.x)
        zRes.x = (a - b) / (a + b)
        return
      }
    case Opef.Rnd:
      zRes.y = 0
      if (infoRandom) {
        this.valeurDejaPrise = Math.random()
        this.dejaPositionne = true
        zRes.x = this.valeurDejaPrise
      } else {
        if (!this.dejaPositionne) {
          this.valeurDejaPrise = Math.random()
          this.dejaPositionne = true
          zRes.x = this.valeurDejaPrise
        } else zRes.x = this.valeurDejaPrise
      }
      break
    case Opef.Conj:
      zRes.x = z.x
      zRes.y = -z.y
      return
    case Opef.Arg:
      if ((z.x === 0) && (z.y === 0)) {
        zRes.x = 0
        zRes.y = 0
        throw new Error(erreurCalculException)
      } else {
        zRes.x = z.argument(this.listeProprietaire.uniteAngle)
        zRes.y = 0
        return
      }
    case Opef.Re:
      zRes.x = z.x
      zRes.y = 0
      return
    case Opef.Im:
      zRes.x = z.y
      zRes.y = 0
      return
    case Opef.Rac:
    case Opef.Rac2:
    case Opef.Raci:
    case Opef.Raci2:
      zRes.x = 0
      zRes.y = 0
      if ((z.y !== 0) || (z.x < 0)) throw new Error(erreurCalculException)
      else {
        zRes.x = Math.sqrt(z.x)
        return
      }
    case Opef.EntiC :
    case Opef.Enti :
      zRes.x = 0
      zRes.y = 0
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.x = Math.floor(z.x)
        return
      }
    case Opef.ACosC :
    case Opef.ACos :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = Math.acos(z.x)
        else zRes.x = Math.acos(z.x) * ConvRadDeg
        return
      }
    case Opef.ASinC :
    case Opef.ASin :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = Math.asin(z.x)
        else zRes.x = Math.asin(z.x) * ConvRadDeg
        return
      }
    case Opef.ATanC :
    case Opef.ATan :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (this.listeProprietaire.uniteAngle === uniteAngleRadian) zRes.x = Math.atan(z.x)
        else zRes.x = Math.atan(z.x) * ConvRadDeg
        return
      }
    case Opef.ArgChC :
    case Opef.ArgCh :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if (z.x >= 1) zRes.x = Math.log(z.x + Math.sqrt(z.x * z.x - 1))
        else throw new Error(erreurCalculException)
      }
      break
    case Opef.ArgShC :
    case Opef.ArgSh :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        zRes.x = Math.log(z.x + Math.sqrt(z.x * z.x + 1))
        return
      }
    case Opef.ArgThC :
      // le résultat n'existe que si l'argument est réel
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if ((z.x > -1) && (z.x < 1)) zRes.x = 0.5 * Math.log((1 + z.x) / (1 - z.x))
        else throw new Error(erreurCalculException)
      }
      break
    case Opef.factC:
    case Opef.fact:
      if (z.y !== 0) throw new Error(erreurCalculException)
      else {
        zRes.y = 0
        if ((z.x < 0) || (z.x !== Math.round(z.x))) throw new Error(erreurCalculException)
        if (z.x <= 32) {
          let p = 1
          for (let i = 2; i <= z.x; i++) {
            p = p * i
          }
          zRes.x = p
        } else {
          const x = z.x
          let x1 = x
          let d = 1 + 1 / (12 * x1)
          x1 *= x
          d += 1 / (288 * x1)
          x1 *= x
          d -= 139 / (51840 * x1)
          x1 *= x
          d -= 571 / (2488320 * x1)
          x1 *= x
          d -= 163879 / (209018880 * x1)
          zRes.x = Math.exp(0.5 * Math.log(2 * Math.PI * x) + x * (Math.log(x) - 1)) * d
        }
      }
  } // switch Opef}
}
CFonction.prototype.resultatComplexe = function (infoRandom, zRes) {
  switch (this.opef) {
    case Opef.Left :
    case Opef.LeftC : // Rajouté version 4.7.2
      // this.operande.membreGauche().resultatComplexe(infoRandom, zRes)
      getLeft(this.operande).resultatComplexe(infoRandom, zRes)
      break // Rajouté version 4.7.2
    case Opef.Right :
    case Opef.RightC : // Rajouté version 4.7.2
      // this.operande.membreDroit().resultatComplexe(infoRandom, zRes)
      getRight(this.operande).resultatComplexe(infoRandom, zRes)
      break // Rajouté version 4.7.2
    case Opef.Core:
    case Opef.CoreC:
      this.operande.getCore().resultatComplexe(infoRandom, zRes)
      break
    default :
      this.operande.resultatComplexe(infoRandom, this.z1loc)
      this.resultatComplexeBase(infoRandom, this.z1loc, zRes)
  }
}
CFonction.prototype.resultatFonctionComplexe = function (infoRandom, valeurParametre, zRes) {
  let mg, md
  switch (this.opef) {
    case Opef.Left :
    case Opef.LeftC : // Rajouté version 4.7.2
      // mg = this.operande.membreGauche()
      mg = getLeft(this.operande)
      if (mg === null) throw new Error(erreurCalculException)
      mg.resultatFonctionComplexe(infoRandom, valeurParametre, zRes)
      break // Rajouté version 4.7.2
    case Opef.Right :
    case Opef.RightC : // Rajouté version 4.7.2
      // md = this.operande.membreDroit()
      md = getRight(this.operande)
      if (md === null) throw new Error(erreurCalculException)
      md.resultatFonctionComplexe(infoRandom, valeurParametre, zRes)
      break // Rajouté version 4.7.2
    case Opef.Core:
    case Opef.CoreC:
      this.operande.getCore().resultatFonctionComplexe(infoRandom, valeurParametre, zRes)
      break
    default :
      this.operande.resultatFonctionComplexe(infoRandom, valeurParametre, this.z1loc)
      this.resultatComplexeBase(infoRandom, this.z1loc, zRes)
  }
}

CFonction.prototype.resultatMatBase = function (op, infoRandom) {
  if (this.opef === Opef.Frac) {
    // L'opérande ne peut être qu'un nombre, une matrice colonne ou une matrice ligne
    if (typeof op === 'number') {
      return matrix([fracCont(op)])
    } else {
      const size = op.size()
      const n = size[0]
      const p = size[1]
      if (n > 1 && p > 1) throw new Error(erreurCalculException)
      if (n === 1) { // Matrice d'une ligne. ON renvoie une matrice de deux lignes
        const lig1 = []
        const lig2 = []
        for (let j = 0; j < p; j++) {
          // const nb = op(0, j)
          const nb = op.get([0, j])
          const frac = fracCont(nb)
          lig1.push(frac[0])
          lig2.push(frac[1])
        }
        return matrix([lig1, lig2])
      } else { // Cas d'une matrice colonne
        const res = []
        for (let i = 0; i < n; i++) {
          // const nb = op(i, 0)
          const nb = op.get([i, 0])
          const frac = fracCont(nb)
          res.push(frac)
        }
        return matrix(res)
      }
    }
  }
  if (typeof op === 'number') return this.resultatBase(infoRandom, op)
  if (this.opef === Opef.Transp) {
    const size = op.size()
    const n = size[0]
    const p = size[1]
    const tab = []
    for (let j = 0; j < p; j++) {
      const lig = []
      tab.push(lig)
      for (let i = 0; i < n; i++) {
        lig.push(op.get([i, j]))
      }
    }
    return matrix(tab)
  }
  if (this.opef === Opef.Deter) {
    const size = op.size()
    if (size[0] !== size[1]) throw new Error(erreurCalculException)
    // return op.det()
    return det(op)
  }
  if (this.opef === Opef.Inv) { // Inverse terme à terme d'une matrice
    // On regarde si un des termes de la matrice est nul
    const size = op.size()
    const n = size[0]
    const p = size[1]
    const tab = []
    for (let i = 0; i < n; i++) {
      const lig = []
      tab.push(lig)
      for (let j = 0; j < p; j++) {
        const x = op.get([i, j])
        if (x === 0) throw new Error(erreurCalculException)
        lig.push(1 / x)
      }
    }
    return matrix(tab)
  }
  // Ajout version 7.0
  if (this.opef === Opef.Nbrow) {
    return op.size()[0] // Renvoie le nombre de lignes de la matrice
  }
  if (this.opef === Opef.Nbcol) {
    return op.size()[1] // Renvoie le nombre de lignes de la matrice
  }
  // Fin ajout version 7.0
  // On applique la fonction à chacun des termes de la matrice
  const self = this
  // return matrix(op.map(x => self.resultatBase(infoRandom, x)))
  return op.map(function (value, index, matrix) {
    return self.resultatBase(infoRandom, value)
  })
}

// Ajout version 6.7
CFonction.prototype.resultatMat = function (infoRandom) {
  const op = this.operande.resultatMat(infoRandom)
  return this.resultatMatBase(op, infoRandom)
}

// Ajout version 7.1
CFonction.prototype.resultatMatFonction = function (infoRandom, valeurParametre) {
  const op = this.operande.resultatMatFonction(infoRandom, valeurParametre)
  return this.resultatMatBase(op, infoRandom)
}

CFonction.prototype.dependDeVariable = function (ind) {
  switch (this.opef) {
    case Opef.Left:
    case Opef.LeftC:
      // return this.operande.membreGauche().dependDeVariable(ind)
      return getLeft(this.operande).dependDeVariable(ind)
    case Opef.Right:
    case Opef.RightC:
      // return this.operande.membreDroit().dependDeVariable(ind)
      return getRight(this.operande).dependDeVariable(ind)
    default:
      return this.operande.dependDeVariable(ind)
  }
}
CFonction.prototype.getCopie = function () {
  return new CFonction(this.listeProprietaire, this.opef, this.operande.getCopie())
}
CFonction.prototype.chaineCalcul = function (varFor = null) {
  const cha = this.operande.chaineCalculSansPar(varFor)
  const parouv = '('
  const parfer = ')'

  switch (this.opef) {
    case Opef.Abso:
    case Opef.Abs:
      return getStr('abs') + parouv + cha + parfer
    case Opef.Enti:
    case Opef.EntiC:
      return getStr('intgr') + parouv + cha + parfer
    case Opef.Raci:
    case Opef.Rac:
      return getStr('sqrt') + parouv + cha + parfer
    case Opef.Raci2:
    case Opef.Rac2:
      return getStr('rac') + parouv + cha + parfer
    case Opef.Sinu:
    case Opef.Sin:
      return getStr('sin') + parouv + cha + parfer
    case Opef.Cosi:
    case Opef.Cos:
      return getStr('cos') + parouv + cha + parfer
    case Opef.Tang:
    case Opef.Tan:
      return getStr('tan') + parouv + cha + parfer
    case Opef.Logn:
    case Opef.Log:
      return getStr('ln') + parouv + cha + parfer
    case Opef.Expo:
    case Opef.Exp:
      return getStr('exp') + parouv + cha + parfer
    case Opef.ATan:
    case Opef.ATanC:
      return getStr('arctan') + parouv + cha + parfer
    case Opef.ACos:
    case Opef.ACosC:
      return getStr('arccos') + parouv + cha + parfer
    case Opef.ASin:
    case Opef.ASinC:
      return getStr('arcsin') + parouv + cha + parfer
    case Opef.Cosh:
    case Opef.Ch:
      return getStr('ch') + parouv + cha + parfer
    case Opef.Sinh:
    case Opef.Sh:
      return getStr('sh') + parouv + cha + parfer
    case Opef.Tanh:
    case Opef.Th:
      return getStr('th') + parouv + cha + parfer
    case Opef.fact:
    case Opef.factC:
      return getStr('fact') + parouv + cha + parfer
    // Deux ajouts version 4.6
    case Opef.Left:
    case Opef.LeftC:
      return getStr('left') + parouv + cha + parfer
    case Opef.Right:
    case Opef.RightC:
      return getStr('right') + parouv + cha + parfer
    case Opef.Transp: // Ajout version 6.7 pour transposer une matrice
      return getStr('transp') + parouv + cha + parfer
    case Opef.Deter: // Ajout version 6.7 pour calculer le déterminant d'une matrice
      return getStr('deter') + parouv + cha + parfer
    case Opef.Inv: // Ajout version 6.7 pour calculer l'inverse d'une matrice
      return getStr('inv') + parouv + cha + parfer
    case Opef.Frac: // Ajout version 6.7 pour calculer l'inverse d'une matrice
      return getStr('frac') + parouv + cha + parfer
    case Opef.Nbcol: // Ajout version 7.0 pour renvoyer le nombre de colonnes d'une matrice
      return getStr('nbcol') + parouv + cha + parfer
    case Opef.Nbrow: // Ajout version 7.0 pour renvoyer le nombre de colonnes d'une matrice
      return getStr('nbrow') + parouv + cha + parfer
    // A revoir ici. Pour la version 1.5 j'ai oublie le ArgCh
    case Opef.ArgCh:
    case Opef.ArgChC:
      return getStr('argch') + parouv + cha + parfer
    case Opef.ArgSh:
    case Opef.ArgShC:
      return getStr('argsh') + parouv + cha + parfer
    case Opef.ArgTh:
    case Opef.ArgThC:
      return getStr('argth') + parouv + cha + parfer
    case Opef.Rand:
    case Opef.Rnd:
      return getStr('rand') + parouv + cha + parfer
    case Opef.Conj:
      return getStr('conj') + parouv + cha + parfer
    case Opef.Arg:
      return getStr('arg') + parouv + cha + parfer
    case Opef.Re:
      return getStr('re') + parouv + cha + parfer
    case Opef.Im:
      return getStr('im') + parouv + cha + parfer
    case Opef.Core:
    case Opef.CoreC:
      return getStr('core') + parouv + cha + parfer
    default:
      return ''
  } // switch Opef}}
}

// Avant la version 6.4.8, la foncton ci-dessous était CFonction.prototype.chaineLatexSans
// Modifié pour un meilleur rendu des conjugués
CFonction.prototype.chaineLatexSansPar = function (varFor, fracSimple = false) {
  const parouvLatex = '\\left('
  const parferLatex = '\\right)'
  const cha = this.operande.chaineLatexSansPar(varFor, fracSimple)

  switch (this.opef) {
    case Opef.Abso:
    case Opef.Abs:
      return '\\left| {' + cha + '} \\right|'
    case Opef.Enti:
    case Opef.EntiC:
      return getStr('intgr') + parouvLatex + cha + parferLatex
    case Opef.Raci:
    case Opef.Rac:
      return '\\sqrt{' + cha + '}'
    case Opef.Raci2:
    case Opef.Rac2:
      return '\\sqrt{' + cha + '}'
    case Opef.Sinu:
    case Opef.Sin:
      return '\\sin' + parouvLatex + cha + parferLatex
    case Opef.Cosi:
    case Opef.Cos:
      return '\\cos' + parouvLatex + cha + parferLatex
    case Opef.Tang:
    case Opef.Tan:
      return '\\tan' + parouvLatex + cha + parferLatex
    case Opef.Logn:
    case Opef.Log:
      return getStr('lnlat') + parouvLatex + cha + parferLatex
    case Opef.Expo:
    case Opef.Exp:
      return 'e^' + '{' + cha + '}'
    case Opef.ATan:
    case Opef.ATanC:
      return getStr('arctanlat') + parouvLatex + cha + parferLatex
    case Opef.ACos:
    case Opef.ACosC:
      return getStr('arccoslat') + parouvLatex + cha + parferLatex
    case Opef.ASin:
    case Opef.ASinC:
      return getStr('arcsinlat') + parouvLatex + cha + parferLatex
    case Opef.Cosh:
    case Opef.Ch:
      return getStr('chlat') + parouvLatex + cha + parferLatex
    case Opef.Sinh:
    case Opef.Sh:
      return getStr('shlat') + parouvLatex + cha + parferLatex
    case Opef.Tanh:
    case Opef.Th:
      return getStr('thlat') + parouvLatex + cha + parferLatex
    case Opef.fact:
    case Opef.factC:
      if ((this.operande.nature() & (CCbGlob.natIntegraleDansFormule | CCbGlob.natMoinsUnaire | CCbGlob.natOperation |
        CCbGlob.natSommeDansFormule)) !== 0) { return parouvLatex + cha + parferLatex + '!' } else return cha + '!' // A revoir
    // Deux ajouts version 4.6
    case Opef.Left:
    case Opef.LeftC:
      // return getStr('Left') + parouvLatex + cha + parferLatex
      return getLeft(this.operande).chaineLatexSansPar(varFor, fracSimple)
    case Opef.Right:
    case Opef.RightC:
      // return getStr('Left') + parouvLatex + cha + parferLatex
      return getRight(this.operande).chaineLatexSansPar(varFor, fracSimple)
    case Opef.Transp: // Ajout version 6.7 pour transposer une matrice
      return getStr('transp') + parouvLatex + cha + parferLatex
    case Opef.Deter: // Ajout version 6.7 pour calculer le déterminant d'une matrice
      return getStr('deter') + parouvLatex + cha + parferLatex
    case Opef.Inv: // Ajout version 6.7 pour calculer l'inverse d'une matrice
      return getStr('inv') + parouvLatex + cha + parferLatex
    case Opef.Frac: // Ajout version 6.7 pour calculer l'inverse d'une matrice
      return getStr('frac') + parouvLatex + cha + parferLatex
    case Opef.Nbcol: // Ajout version 7.0 pour renvoyer le nombre de colonnes d'une matrice
      return getStr('nbcol') + parouvLatex + cha + parferLatex
    case Opef.Nbrow: // Ajout version 7.0 pour renvoyer le nombre de colonnes d'une matrice
      return getStr('nbrow') + parouvLatex + cha + parferLatex
    // A revoir ici. Pour la version 1.5 j'ai oublie le ArgCh
    case Opef.ArgCh:
    case Opef.ArgChC:
      return getStr('argch') + parouvLatex + cha + parferLatex
    case Opef.ArgSh:
    case Opef.ArgShC:
      return getStr('argsh') + parouvLatex + cha + parferLatex
    case Opef.ArgTh:
    case Opef.ArgThC:
      return getStr('argth') + parouvLatex + cha + parferLatex
    case Opef.Rand:
    case Opef.Rnd:
      return getStr('rand') + parouvLatex + cha + parferLatex
    case Opef.Conj:
    {
      // Version 6.4.8 : On rajoute un petit espace devant un conjugué
      // return '\\overline {' + cha + '}'
      const op = this.operande
      if ((op.nature() === CCbGlob.natOperation) && (op.ope === Ope.Divi)) {
        return '\\,\\overline {' + parouvLatex + op.chaineLatexSansPar(varFor, fracSimple) + parferLatex + '}'
      } else return '\\,\\overline {' + cha + '}'
    }
    case Opef.Arg:
      return '\\arg' + parouvLatex + cha + parferLatex
    case Opef.Re:
      return getStr('re') + parouvLatex + cha + parferLatex
    case Opef.Im:
      return getStr('im') + parouvLatex + cha + parferLatex
    case Opef.Core:
    case Opef.CoreC:
      return getStr('core') + parouvLatex + cha + parferLatex
    default:
      return ''
  } // switch Opef}}
}

// Fonction ajoutée version 6.4.8 pour un meilleur rendu des conjugués
/** @inheritDoc */
CFonction.prototype.chaineLatex = function (varFor, fracSimple = false) {
  const parouvLatex = '\\left('
  const parferLatex = '\\right)'
  const op = this.operande
  const nat = (this.opef)
  switch (nat) {
    case Opef.Conj:
      if (op.nature() === CCbGlob.natOperation) {
        if (op.ope === Ope.Mult) return this.chaineLatexSansPar(varFor, fracSimple)
        else {
          if (op.ope === Ope.Divi) {
            return '\\,\\overline {' + parouvLatex + op.chaineLatexSansPar(varFor, fracSimple) + parferLatex + '}'
          } else return '\\,' + parouvLatex + '\\overline {' + op.chaineLatexSansPar(varFor, fracSimple) + '}' + parferLatex
        }
      } else return this.chaineLatexSansPar(varFor, fracSimple)
    case Opef.Left:
    case Opef.LeftC:
      return getLeft(this.operande).chaineLatex(varFor, fracSimple)
    case Opef.Right:
    case Opef.RightC:
      return getRight(this.operande).chaineLatex(varFor, fracSimple)
    case Opef.Core:
    case Opef.CoreC:
      return this.operande.getCore().chaineLatex(varFor, fracSimple)
    default:
      return this.chaineLatexSansPar(varFor, fracSimple)
  }
}

CFonction.prototype.read = function (inps, list) {
  CCb.prototype.read.call(this, inps, list)
  this.opef = inps.readByte()
  // A partir de la version 3.0, décalage des indices de fonctions complexes
  if ((this.nVersion === 1) && (this.opef >= 19)) this.opef += 45
  this.operande = inps.readObject(list)
  if (this.opef === Opef.Rand) {
    this.valeurDejaPrise = inps.readDouble()
    this.dejaPositionne = true
  }
}
CFonction.prototype.write = function (oups, list) {
  CCb.prototype.write.call(this, oups, list)
  oups.writeByte(this.opef)
  oups.writeObject(this.operande)
  if (this.opef === Opef.Rand) {
    oups.writeDouble(this.valeurDejaPrise)
  }
}
CFonction.prototype.estConstant = function () {
  return (this.opef !== Opef.Rand) && this.operande.estConstant()
}
CFonction.prototype.deriveePossible = function (indiceVariable) {
  return this.operande.deriveePossible(indiceVariable)
}
CFonction.prototype.calculAvecValeursRemplacees = function (bfrac) {
  return new CFonction(this.listeProprietaire, this.opef, this.operande.calculAvecValeursRemplacees(bfrac))
}
// Déplacé ici version 6.4.7
CFonction.prototype.calculNormalise = function (rempval, sousdivnorm, rempDecParFrac, eliminMult1 = true) {
  switch (this.opef) {
    case Opef.Left:
    case Opef.LeftC:
      // return this.operande.membreGauche().calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      return getLeft(this.operande).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
    case Opef.Right:
    case Opef.RightC:
      // return this.operande.membreDroit().calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
      return getRight(this.operande).calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
    case Opef.Core:
    case Opef.CoreC:
      return this.operande.getCore().calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1)
    default :
      return new CFonction(this.listeProprietaire, this.opef, this.operande.calculNormalise(rempval, sousdivnorm, rempDecParFrac, eliminMult1))
  }
}
