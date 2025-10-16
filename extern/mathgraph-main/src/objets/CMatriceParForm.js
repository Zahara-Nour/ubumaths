// Ajout le 3/5/2021 par Yves Biton
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import mathjs from '../kernel/mathjs'
import CCalculAncetre from './CCalculAncetre'
import CCalcul from './CCalculBase'
import { latexMat, latexMatFrac } from '../kernel/kernel'
import NatCal from '../types/NatCal'
import CValeur from 'src/objets/CValeur'

const { matrix } = mathjs

export default CMatriceParForm

// Attention : cet objet n'utilise qu'un calcul pour s'enregistrer dans le flux mais pour se positionner
// il a besoin que chaque cellule ait pour se calculer un clone de cette formule car sinon quand on appelle
// positionne avec un paramètre false tous les calculs vont renvoyer la même valeur puisque qu'une fois positionné
// avec un paramètre infoRandom à false un calcul renvoie le mêm résultat.
/**
 * Classe représentant une matrice de n lignes et p colonnes dont les valerus sont données
 * par une fonction de deux variables (i, j) où i est le n° de ligne et j celui de colonne
 * @param {CListeObjets} listeProprietaire La liste propriétaire
 * @param {CImplementationProto} impProto  null ou a construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction
 * @param {string} nomCalcul  Le nom donné au calcul.
 * @param {CValeur} nbrow Le nombre de lignes de la matrice
 * @param {CValeur} nbcol Le nombre de colonnes de la matrice
 * @param {CCb} calcul formule de la  fonction de deux variables (i, j)
 * @constructor
 */
function CMatriceParForm (listeProprietaire, impProto, estElementFinal, nomCalcul, nbrow, nbcol, calcul) {
  if (arguments.length === 0) CCalculAncetre.call(this)
  else {
    if (arguments.length === 1) CCalculAncetre.call(this, listeProprietaire)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.nbrow = nbrow // Le nombre de lignes
      this.nbcol = nbcol // Le nombre de colonnes
      this.calcul = calcul // Formule de la fonction de deux variables (i, j)
    }
    // On met les deux valeurs suivantes à 0 pour que creeCalculs soit appelé au premier
    // appel de positionne
    this.n = 0
    this.p = 0
  }
}

CMatriceParForm.prototype = new CCalcul()
CMatriceParForm.prototype.constructor = CMatriceParForm
CMatriceParForm.prototype.superClass = 'CCalcul'
CMatriceParForm.prototype.className = 'CMatriceParForm'

// Pour la version 7.0, le nombre de lignes et de colonnes de la matrice deviennent
// des CValeur et deviennent donc dynamiques
CMatriceParForm.prototype.numeroVersion = function () {
  return 2
}

CMatriceParForm.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const nbrowclone = this.nbrow.getClone(listeSource, listeCible)
  const nbcolclone = this.nbcol.getClone(listeSource, listeCible)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CMatriceParForm(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, nbrowclone, nbcolclone, calculClone)
}

CMatriceParForm.prototype.getNatureCalcul = function () {
  return NatCal.NMatriceParForm
}

/**
 * Fonction créant chaque clone du calcul principal associé à chaque terme de la matrice
 * A appeler si on modifie la matrice
 */
CMatriceParForm.prototype.creeCalculs = function (n, p) {
  this.calculs = []
  const list = this.listeProprietaire
  for (let i = 0; i < n; i++) {
    const lig = []
    this.calculs.push(lig)
    for (let j = 0; j < p; j++) {
      lig.push(this.calcul.getClone(list, list))
    }
  }
}

CMatriceParForm.prototype.positionne = function (infoRandom) {
  this.nbrow.positionne(infoRandom)
  this.nbcol.positionne(infoRandom)
  if (!this.nbrow.existe || !this.nbcol.existe) {
    this.existe = false
    return
  }
  const n = this.nbrow.rendValeur()
  const p = this.nbcol.rendValeur()
  if (n !== Math.round(n) || p !== Math.round(p)) {
    this.existe = false
    return
  }
  // Si le nombre de lignes ou de colonnes a changé il faut recréer les calculs
  if (n !== this.n || p !== this.p) {
    this.creeCalculs(n, p)
  }
  this.n = n
  this.p = p
  const mat = []
  for (let i = 0; i < this.n; i++) {
    const lig = []
    mat.push(lig)
    for (let j = 0; j < this.p; j++) {
      // On applique la formule de fonction à chaque coupe (i, j)
      try {
        if (!this.calculs[i][j].existe()) {
          this.existe = false
          return
        }
        this.listeProprietaire.initialiseNombreIterations()
        const res = this.calculs[i][j].resultatFonction(infoRandom, [i + 1, j + 1])
        lig.push(res)
      } catch (e) {
        this.existe = false
        return
      }
    }
  }
  this.existe = true
  this.mat = matrix(mat) // Matrice contenant les valeurs calculées
}

CMatriceParForm.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CCalculAncetre.prototype.depDe.call(this, p) ||
    this.calcul.depDe(p) || this.nbrow.depDe(p) || this.nbcol.depDe(p))
}

CMatriceParForm.prototype.dependDePourBoucle = function (p) {
  return (p === this) || this.calcul.dependDePourBoucle(p) ||
    this.nbrow.dependDePourBoucle(p) || this.nbcol.dependDePourBoucle(p)
}

// Inutiile de redéfinir depDe et depDePourBoucle qui sont définies dans CCalcul dont le prototype descend

CMatriceParForm.prototype.read = function (inps, list) {
  CCalculAncetre.prototype.read.call(this, inps, list)
  if (this.nVersion === 1) {
    this.nbrow = new CValeur(list, inps.readInt())
    this.nbcol = new CValeur(list, inps.readInt())
  } else {
    this.nbrow = new CValeur()
    this.nbrow.read(inps, list)
    this.nbcol = new CValeur()
    this.nbcol.read(inps, list)
  }
  this.calcul = inps.readObject(list)
}

CMatriceParForm.prototype.write = function (oups, list) {
  CCalculAncetre.prototype.write.call(this, oups, list)
  this.nbrow.write(oups, list)
  this.nbcol.write(oups, list)
  oups.writeObject(this.calcul)
}

/**
 * Pour l'interprétation syntaxique, les matrices sont considérées comme des fonctions à deu variables
 * @returns {number}
 */
CMatriceParForm.prototype.nombreVariables = function () {
  return 2
}

/**
 * Fonction utilisée dans CalcR. CMatrice, CMatriceParForm sont les seuls objets
 * descendant de CValDyn renvoyant true pour cette fonction (matrices ne résultant pas d'un calcul)
 * @returns {boolean}
 */
CMatriceParForm.prototype.estMatriceBase = function () {
  return true
}

/**
 * Fonction utilisée dans CalcR. CMatrice est le seul objet avec CCalcMat descendant de CValDyn renvpyant true pour cette fonction
 * @returns {boolean}
 */
CMatriceParForm.prototype.estMatrice = function () {
  return true
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec n décimales
 * @param {number} nbdec Le nombre de décimales
 * @returns {string}
 */
CMatriceParForm.prototype.latexMat = function (nbdec) {
  return latexMat(this.mat, nbdec)
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec appriximation
 * des valeurs par des fractions rationnelles à 10^(-12) près
 * @returns {string}
 */
CMatriceParForm.prototype.latexMatFrac = function () {
  return latexMatFrac(this.mat)
}
