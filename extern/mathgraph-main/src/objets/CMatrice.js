// Ajout le 26/5/2021 par Yves Biton
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import CCalculAncetre from './CCalculAncetre'
import CCalcul from './CCalculBase'
import CValeur from './CValeur'
import NatCal from '../types/NatCal'
import { latexMat, latexMatFrac } from '../kernel/kernel'

const { matrix } = mathjs

export default CMatrice

/**
 Classe représentant une matrice à coefficients réels.
 * @constructor
 * @extends CCalculAncetre
 * @param {CListeObjets} listeProprietaire La liste propriétaire
 * @param {CImplementationProto} impProto  null ou a construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction
 * @param {string} nomCalcul  Le nom donné au calcul.
 * @param {number} n Le nombre de lignes de la matrice
 * @param {number} p Le nombre de colonnes de la matrice
 * @param {Array<CValeur[]>} tabVal Un tableau à deux dimensions dont les éléments sont les lignes de la matrice de type CValeur
 */
function CMatrice (listeProprietaire, impProto, estElementFinal, nomCalcul, n, p,
  tabVal) {
  if (arguments.length === 0) CCalculAncetre.call(this)
  else {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.n = n // Le nombre de lignes
      this.p = p // Le nombre de colonnes
      this.tabVal = tabVal // Les éléments de la matrice qui sont des CValeur
    }
  }
}
CMatrice.prototype = new CCalcul()
CMatrice.prototype.constructor = CMatrice
CMatrice.prototype.superClass = 'CCalculAncetre'
CMatrice.prototype.className = 'CMatrice'

CMatrice.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const tabclone = []
  // On clone tous les éléments de la matrice
  for (let i = 0; i < this.n; i++) {
    const lig = []
    for (let j = 0; j < this.p; j++) {
      lig.push(this.tabVal[i][j].getClone(listeSource, listeCible))
    }
    tabclone.push(lig)
  }
  return new CMatrice(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.n, this.p, tabclone)
}
CMatrice.prototype.getNatureCalcul = function () {
  return NatCal.NMatrice
}
CMatrice.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      this.tabVal[i][j].initialisePourDependance()
    }
  }
}
CMatrice.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  let res = false
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      res = res || this.tabVal[i][j].depDe(p)
      if (res) break
    }
  }
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || res)
}
CMatrice.prototype.dependDePourBoucle = function (p) {
  let res = true
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      res = res && this.tabVal[i][j].dependDePourBoucle(p)
    }
  }
  return (p === this) || res
}

CMatrice.prototype.positionne = function (infoRandom, dimfen) {
  let existe = true
  for (let i = 0; i < this.n && existe; i++) {
    for (let j = 0; j < this.p; j++) {
      this.tabVal[i][j].positionne(infoRandom, dimfen)
      existe = existe && this.tabVal[i][j].existe
    }
  }
  this.existe = existe
  if (!existe) return
  const tab = [] // Sera le tableau des valeurs calculées de la matrice
  for (let i = 0; i < this.n; i++) {
    const lig = []
    tab.push(lig)
    for (let j = 0; j < this.p; j++) {
      lig.push(this.tabVal[i][j].rendValeur())
    }
  }
  this.mat = matrix(tab)
}

CMatrice.prototype.positionneFull = function (infoRandom, dimfen) {
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      this.tabVal[i][j].dejaPositionne = false
    }
  }
  this.positionne(infoRandom, dimfen)
}

CMatrice.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  this.n = inps.readInt()
  this.p = inps.readInt()
  this.tabVal = []
  for (let i = 0; i < this.n; i++) {
    const lig = []
    for (let j = 0; j < this.p; j++) {
      const val = new CValeur()
      val.read(inps, list)
      lig.push(val)
    }
    this.tabVal.push(lig)
  }
}

CMatrice.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  oups.writeInt(this.n)
  oups.writeInt(this.p)
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      this.tabVal[i][j].write(oups, list)
    }
  }
}

/**
 * Pour l'interprétation syntaxique, les matrices sont considérées comme des fonctions à deu variables
 * @returns {number}
 */
CMatrice.prototype.nombreVariables = function () {
  return 2
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat, CMatriceParForm et CCalcMat CCalcMat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction
 * @returns {boolean}
 */
CMatrice.prototype.estMatrice = function () {
  return true
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction (matrices ne résultant pas d'un calcul)
 * @returns {boolean}
 */
CMatrice.prototype.estMatriceBase = function () {
  return true
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec n décimales
 * @returns {string}
 */
CMatrice.prototype.latexMat = function () {
  return latexMat(this.mat, 12)
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec appriximation
 * des valeurs par des fractions rationnelles à 10^(-12) près
 * @returns {string}
 */
CMatrice.prototype.latexMatFrac = function () {
  return latexMatFrac(this.mat)
}
