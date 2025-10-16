// Ajout le 3/5/2021 par Yves Biton
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import CCalculAncetre from './CCalculAncetre'
import CValeur from './CValeur'
import { latexMat, latexMatFrac, SHORT_MAX_VALUE } from '../kernel/kernel'
import NatCal from '../types/NatCal'

const { matrix } = mathjs

export default CMatriceAleat

/**
 * Classe représentant une matrice de n lignes et p colonnes à valeurs entières distinctes
 * comprises entre les valeurs rendues par min et max
 * Les valeurs générées pour la matrice ne pourront être distinctes quue si max-min+1 est
 * supérieur ou égal au nombre de termes de la matrice
 * @param {CListeObjets} listeProprietaire La liste propriétaire
 * @param {CImplementationProto} impProto  null ou a construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction
 * @param {string} nomCalcul  Le nom donné au calcul.
 * @param {number} n Le nombre de lignes de la matrice
 * @param {number} p Le nombre de colonnes de la matrice
 * @param {CValeur} min La valeur mini des termes de la matrice (dynamique)
 * @param {CValeur} max La valeur maxi des termes de la matrice (dynamique)
 * @constructor
 */
function CMatriceAleat (listeProprietaire, impProto, estElementFinal, nomCalcul, n, p, min, max) {
  if (arguments.length === 0) CCalculAncetre.call(this)
  else {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.n = n // Le nombre de lignes
      this.p = p // Le nombre de colonnes
      this.min = min // Valeur mini entière pour les termes de la matrice
      this.max = max // Valeur maxi entière pour les termes de la matrice
    }
  }
}

CMatriceAleat.prototype = new CCalculAncetre()
CMatriceAleat.prototype.constructor = CMatriceAleat
CMatriceAleat.prototype.superClass = 'CCalculAncetre'
CMatriceAleat.prototype.className = 'CMatriceAleat'

// Version 6.7.2 : On passe à la version 3. Les valeur prises par la matrices ne sont plus sauvegardées
// comme des int sur 4 octets mais des number sur 6 octets
CMatriceAleat.prototype.numeroVersion = function () {
  return 3
}

CMatriceAleat.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const minClone = this.min.getClone(listeSource, listeCible)
  const maxClone = this.max.getClone(listeSource, listeCible)
  const mataleat =
    new CMatriceAleat(listeCible, listeCible.get(ind1, 'CImplementationProto'),
      this.estElementFinal, this.nomCalcul, this.n, this.p, minClone, maxClone)
  // Version 7.4 : Les valeurs prises par la matrice sont clonées à partir des valeurs prises par
  // la matrice this
  if (this.mat) { // Pour les précdentes versions
    const mat = []
    for (let i = 0; i < this.n; i++) {
      const lig = []
      for (let j = 0; j < this.p; j++) {
        lig.push(this.mat.get([i, j]))
      }
      mat.push(lig)
    }
    mataleat.mat = matrix(mat)
  }
  return mataleat
}

CMatriceAleat.prototype.getNatureCalcul = function () {
  return NatCal.NMatriceAleat
}

CMatriceAleat.prototype.positionne = function (infoRandom) {
  this.min.positionne(infoRandom)
  this.max.positionne(infoRandom)
  let existe = this.min.existe && this.max.existe
  let valmin, valmax
  if (existe) {
    valmin = this.min.rendValeur()
    valmax = this.max.rendValeur()
    // Version 7.6.3 (numéro de version 3) : Les valeurs prises doivent être entre -SHORT_MAX_VALUE et SHORT_MAX_VALUE
    existe = valmin === Math.round(valmin) && valmax === Math.round(valmax) && (valmin < valmax) &&
      (valmax - valmin <= 1000) && (valmin >= -SHORT_MAX_VALUE) && (valmax <= SHORT_MAX_VALUE)
  }
  this.existe = existe
  if (this.existe) {
    // Si on ne demande pas un recalcul aléatoire et que la matrice a déjà été calculée on ne la remet pas à jour
    if (!infoRandom && this.mat) return
    let tab = [] // Tableau qui va contenir tous les nombres entiers de min à max
    const tabInit = []
    for (let i = valmin; i <= valmax; i++) {
      tab.push(i)
      tabInit.push(i)
    }
    const mat = []
    for (let i = 0; i < this.n; i++) {
      const lig = []
      mat.push(lig)
      for (let j = 0; j < this.p; j++) {
        // On retire une élément au hasard de tab
        const k = Math.floor(Math.random() * tab.length)
        const val = tab[k]
        tab.splice(k, 1)
        lig.push(val)
        if (tab.length === 0) tab = tabInit.slice(0)
      }
    }
    this.mat = matrix(mat) // Matrice contenant les valeurs aléatoires
  }
}

CMatriceAleat.prototype.initialisePourDependance = function () {
  CCalculAncetre.prototype.initialisePourDependance.call(this)
  this.min.initialisePourDependance()
  this.max.initialisePourDependance()
}

CMatriceAleat.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.min.depDe(p) || this.max.depDe(p))
}

CMatriceAleat.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.min.dependDePourBoucle(p) || this.max.dependDePourBoucle(p)
}

CMatriceAleat.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  this.n = inps.readInt()
  this.p = inps.readInt()
  this.min = new CValeur()
  this.min.read(inps, list)
  this.max = new CValeur()
  this.max.read(inps, list)
  // A partir de la version 7.4, on a sauvegardé des valeurs de la matrice
  // au départ (n° de version 2) sous forme d'un entier sur 4 actets non signés
  // puis (version 3) sous la même forme mais on retranche SHORT_MAX_VALUE = 2^16 - 1
  // ainsi la valeur paut aller de - SHORT_MAX_VALUE à +SHORT_MAX_VALUE
  const nver = this.nVersion
  if (nver >= 2) {
    const mat = []
    for (let i = 0; i < this.n; i++) {
      const lig = []
      for (let j = 0; j < this.p; j++) {
        const ent = inps.readInt()
        lig.push(nver === 2 ? ent : ent - SHORT_MAX_VALUE)
      }
      mat.push(lig)
    }
    this.mat = matrix(mat)
  }
}

CMatriceAleat.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  oups.writeInt(this.n)
  oups.writeInt(this.p)
  this.min.write(oups, list)
  this.max.write(oups, list)
  // A partir de la version 7.4, on sauvegarde des valeurs de la matrice (nVersion passé à 2)
  for (let i = 0; i < this.n; i++) {
    for (let j = 0; j < this.p; j++) {
      // Version 6.7.3 : On enregistre la valeur à laquelle on additionne SHORT_MAX_VALUE = 2^16 - 1
      oups.writeInt(this.mat.get([i, j]) + SHORT_MAX_VALUE)
    }
  }
}

/**
 * Pour l'interprétation syntaxique, les matrices sont considérées comme des fonctions à deu variables
 * @returns {number}
 */
CMatriceAleat.prototype.nombreVariables = function () {
  return 2
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction (matrices ne résultant pas d'un calcul)
 * @returns {boolean}
 */
CMatriceAleat.prototype.estMatriceBase = function () {
  return true
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat, CMatriceParForm et CCalcMat CCalcMat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction
 * @returns {boolean}
 */
CMatriceAleat.prototype.estMatrice = function () {
  return true
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec n décimales
 * @param {number} nbdec Le nombre de décimales
 * @returns {string}
 */
CMatriceAleat.prototype.latexMat = function (nbdec) {
  return latexMat(this.mat, nbdec)
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec appriximation
 * des valeurs par des fractions rationnelles à 10^(-12) près
 * @returns {string}
 */
CMatriceAleat.prototype.latexMatFrac = function () {
  return latexMatFrac(this.mat)
}
