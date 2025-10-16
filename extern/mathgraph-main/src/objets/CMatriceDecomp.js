// Ajout le 14/5/2022 par Yves Biton
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalculAncetre from './CCalculAncetre'
import CCalcul from 'src/objets/CCalculBase'
import NatCal from 'src/types/NatCal'
import { decompPrim, latexMat, latexMatFrac, zero } from 'src/kernel/kernel'
import mathjs from '../kernel/mathjs'

export default CMatriceDecomp
const { matrix } = mathjs

/**
 *
 * @param listeProprietaire
 * @param impProto
 * @param estElementFinal
 * @param nomCalcul
 * @param nb
 * @constructor
 * @extends CCalcul
 */
function CMatriceDecomp (listeProprietaire, impProto, estElementFinal, nomCalcul, nb) {
  if (arguments.length === 0) CCalculAncetre.call(this)
  else {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.nb = nb
    }
  }
  this.p = 2 // Le nombre de colonnes
  // this.n sera dynamique suivant le nombre de facteurs de la décomposition
}

CMatriceDecomp.prototype = new CCalcul()
CMatriceDecomp.prototype.constructor = new CMatriceDecomp()
CMatriceDecomp.prototype.superClass = 'CCalcul'
CMatriceDecomp.prototype.className = 'CMatriceDecomp'

CMatriceDecomp.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const ind2 = listeSource.indexOf(this.nb)
  return new CMatriceDecomp(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, listeCible.get(ind2, 'CCalcul'))
}

CMatriceDecomp.prototype.getNatureCalcul = function () {
  return NatCal.NMatriceDecomp
}

CMatriceDecomp.prototype.positionne = function () {
  // Le nombre a décomposer doit être entier, strictement positif et pas trop grand
  if (!this.nb.existe) {
    this.existe = false
    return
  }
  const nb = this.nb.rendValeur()
  if ((nb <= 1) || !zero(nb - Math.round(nb)) || (nb > 10000000)) {
    this.existe = false
    return
  }
  const decomp = decompPrim(Math.round(nb)) // Tableau dont le premier élélent est un tableau contenant les facteurs premiers
  // et le second un tableau contenant les exposants
  const facteurs = decomp[0]
  const exposants = decomp[1]
  const nbfact = facteurs.length
  this.n = nbfact
  const mat = []
  for (let i = 0; i < nbfact; i++) {
    const lig = []
    mat.push(lig)
    lig.push(facteurs[i])
    lig.push(exposants[i])
  }
  this.existe = true
  this.mat = matrix(mat) // Matrice contenant les valeurs calculées
}

CMatriceDecomp.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) || this.nb.depDe(p))
}

CMatriceDecomp.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.nb.dependDePourBoucle(p)
}

/**
 * Pour l'interprétation syntaxique, les matrices sont considérées comme des fonctions à deux variables
 * @returns {number}
 */
CMatriceDecomp.prototype.nombreVariables = function () {
  return 2
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction (matrices ne résultant pas d'un calcul)
 * @returns {boolean}
 */
CMatriceDecomp.prototype.estMatriceBase = function () {
  return true
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceAleat, CMatriceParForm et CCalcMat CCalcMat sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction
 * @returns {boolean}
 */
CMatriceDecomp.prototype.estMatrice = function () {
  return true
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec n décimales
 * @param {number} nbdec Le nombre de décimales
 * @returns {string}
 */
CMatriceDecomp.prototype.latexMat = function (nbdec) {
  return latexMat(this.mat, nbdec)
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec appriximation
 * des valeurs par des fractions rationnelles à 10^(-12) près
 * @returns {string}
 */
CMatriceDecomp.prototype.latexMatFrac = function () {
  return latexMatFrac(this.mat)
}

CMatriceDecomp.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.nb = list.get(ind1, 'CCalcul')
}

CMatriceDecomp.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.nb)
  oups.writeInt(ind1)
}
