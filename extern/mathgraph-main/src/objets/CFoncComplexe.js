/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CFonc from './CFonc'
import CalcC from '../kernel/CalcC'
import CCalcul from './CCalculBase'

export default CFoncComplexe

/**
 * Classe représentant une fonction complexe utilisateur à une variable.
 * @constructor
 * @extends CFonc
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet;
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet;
 * @param {boolean} estElementFinal  true si l'objet est un objet inal de construction;
 * @param {string} nomCalcul  Le nom de la fonction.
 * @param {string} chaineCalcul  La formule définissnt la focntion;
 * @param {string} nomsVariables  La varaible formelle utilisée pour la formule.
 * @param {CCb} calcul  Arbre binaire repsentant le calcul.
 * @returns {CFoncComplexe}
 */
function CFoncComplexe (listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, nomsVariables, calcul) {
  if (arguments.length === 1) CFonc.call(this, listeProprietaire)
  else {
    if (arguments.length === 3) CCalcul.call(this, listeProprietaire, impProto, estElementFinal)
    else {
      this.nomsVariables = nomsVariables
      if (arguments.length <= 6) calcul = null
      if (calcul === null) {
        CFonc.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul,
          nomsVariables, CalcC.ccbComp(chaineCalcul, listeProprietaire, 0, chaineCalcul.length - 1,
            [nomsVariables]))
      } else CCalcul.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul, calcul)
    }
  }
}
CFoncComplexe.prototype = new CFonc()
CFoncComplexe.prototype.constructor = CFoncComplexe
CFoncComplexe.prototype.superClass = 'CFonc'
CFoncComplexe.prototype.className = 'CFoncComplexe'

CFoncComplexe.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CFoncComplexe(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, this.nomsVariables, calculClone)
}
CFoncComplexe.prototype.getNatureCalcul = function () {
  return NatCal.NFonctionComplexe
}
