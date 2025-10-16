/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import Complexe from '../types/Complexe'
import CCalculAncetre from './CCalculAncetre'
import CalcC from '../kernel/CalcC'
import CCalcul from './CCalcul'

export default CCalculComplexe

/**
 * Classe représentant un calcul complexe
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
function CCalculComplexe (listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul) {
  if (arguments.length === 1) CCalcul.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalcul.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      CCalculAncetre.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul)
      this.chaineCalcul = chaineCalcul
      if (arguments.length === 5) this.calcul = CalcC.ccbComp(chaineCalcul, this.listeProprietaire, 0, chaineCalcul.length - 1, null)
      else this.calcul = calcul
    }
  }
  this.resultatComplexe = new Complexe()
}

CCalculComplexe.prototype = new CCalcul()
CCalculComplexe.prototype.constructor = CCalculComplexe
CCalculComplexe.prototype.superClass = 'CCalcul'
CCalculComplexe.prototype.className = 'CCalculComplexe'

CCalculComplexe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CCalculComplexe(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, calculClone)
}

CCalculComplexe.prototype.getNatureCalcul = function () {
  return NatCal.NCalculComplexe
}

CCalculComplexe.prototype.positionne = function (infoRandom, dimfen) {
  this.existe = this.calcul.existe()
  if (!this.existe) return
  try {
    this.listeProprietaire.initialiseNombreIterations()
    this.calcul.resultatComplexe(infoRandom, this.resultatComplexe)
  } catch (e) {
    this.existe = false
    // Ajout version 6.0
    this.resultatComplexe = new Complexe(-1, 0)
  }
  if (!isFinite(this.resultatComplexe.x) || !isFinite(this.resultatComplexe.y)) this.existe = false
}

CCalculComplexe.prototype.rendValeurComplexe = function (zRes) {
  zRes.set(this.resultatComplexe)
}

CCalculComplexe.prototype.rendChaineValeurPourCommentaire = function (nbDecimales) {
  return this.rendChaineValeurComplexe(nbDecimales)
}
/**
 * Spécial JavaScript : Renvoie la chaîne LaTeX de la formule du calcul
 * @returns {string}
 */
CCalculComplexe.prototype.chaineLatex = function () {
  return this.calcul.chaineLatexSansPar(null)
}
