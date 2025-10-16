/*
 * Created by yvesb on 30/05/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CCalculAncetre from './CCalculAncetre'
import CalcMatR from '../kernel/CalcMatR'
import CCalcul from './CCalcul'
import { erreurCalculException, latexMat, latexMatFrac } from '../kernel/kernel'

export default CCalcMat

/**
 * Classe représentant un calcul matriciel réel
 * @constructor
 * @extends CCalcul
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un objet intermédiaire de construction.
 * @param {string} nomCalcul  Le nom du calcul
 * @param {string} chaineCalcul  La chaîne repréentant le calcul
 * @param {CCb} calcul  L'arbre binaire contenant le calcul proprement dit
 * @returns {void}
 */
function CCalcMat (listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul) {
  if (arguments.length === 1) CCalcul.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalcul.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.chaineCalcul = chaineCalcul
      if (arguments.length === 5) this.calcul = CalcMatR.ccbmat(chaineCalcul, this.listeProprietaire, 0, chaineCalcul.length - 1, null)
      else this.calcul = calcul
    }
  }
}

CCalcMat.prototype = new CCalcul()
CCalcMat.prototype.constructor = CCalcMat
CCalcMat.prototype.superClass = 'CCalcul'
CCalcMat.prototype.className = 'CCalcMat'

CCalcMat.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CCalcMat(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, calculClone)
}

CCalcMat.prototype.getNatureCalcul = function () {
  return NatCal.NCalculMat
}

CCalcMat.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.calcul.existe()
  if (!this.existe) return
  try {
    this.listeProprietaire.initialiseNombreIterations()
    // Attention : this.resultat est un matrix ou un nombre pas un Array
    this.resultat = this.calcul.resultatMat(infoRandom) // Un array ou un nombre
    const res = this.resultat
    // On regarde si on n'est pas en dépassement de capacité
    if (typeof res === 'number') {
      this.n = 1
      this.p = 1
      if (!isFinite(res)) throw new Error(erreurCalculException)
    } else {
      const size = res.size()
      // Modifications version 7.0 pour pouvoir avoir n et p pour toutes les matrices
      this.n = size[0]
      this.p = size[1]
      for (let i = 0; i < this.n; i++) {
        for (let j = 0; j < this.p; j++) {
          if (!isFinite(res.get([i, j]))) throw new Error(erreurCalculException)
        }
      }
    }
  } catch (e) {
    this.existe = false
    // Ajout version 6.0
    this.resultat = 0
  }
}

/* Inutile de redéfinir car déjà défini dans CCalculBase
CCalcMat.prototype.rendValeur = function () {
  return this.resultat
}
 */

/* INutile de le redéfinir car déjà défini dans CCalculBase
CCalcMat.prototype.chaineLatex = function () {
  return this.calcul.chaineLatexSansPar(null)
}

 */

/**
 * Fonction utilisée dans CalcR. CMatrice est le seul objet avec CCalcMat descendant de CValDyn renvpyant true pour cette fonction
 * @returns {boolean}
 */
CCalcMat.prototype.estMatrice = function () {
  return true
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec n décimales
 * @param {number} nbdec Le nombre de décimales
 * @returns {string}
 */
CCalcMat.prototype.latexMat = function (nbdec) {
  return latexMat(this.resultat, nbdec)
}

/**
 * Fonction renvoyant la représentation LaTeX du résultat de la matrice avec appriximation
 * des valeurs par des fractions rationnelles à 10^(-12) près
 * @returns {string}
 */
CCalcMat.prototype.latexMatFrac = function () {
  return latexMatFrac(this.resultat)
}
