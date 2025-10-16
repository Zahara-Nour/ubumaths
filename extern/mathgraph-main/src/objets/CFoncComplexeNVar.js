/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatCal from '../types/NatCal'
import CalcC from '../kernel/CalcC'
import CFoncNVar from './CFoncNVar'
export default CFoncComplexeNVar

// Attention : Ordre des deux derniers paramètres changé par rapport à Java
/**
 * Fonction complexe de n variables.
 * @constructor
 * @extends CFoncNVar
 * @param {CListeObjets} listeProprietaire  La liste propriétaire de l'objet;
 * @param {CImplementationProto} impProto  null ou pointe sur la construction propriétaire de l'objet;
 * @param {boolean} estElementFinal  true si l'objet est un objet inal de construction;
 * @param {string} nomCalcul  Le nom de la fonction.
 * @param {string} chaineCalcul  La formule définissnt la fonction;
 * @param {string[]} nomsVariables  Un array de String donnant les variables formelles.
 * @param {CCb} calcul  Un arbre binaire de calcul représentant la fonction.
 * @returns {CFoncComplexeNVar}
 */
function CFoncComplexeNVar (listeProprietaire, impProto, estElementFinal, nomCalcul,
  chaineCalcul, nomsVariables, calcul = null) {
  if (arguments.length === 1) CFoncNVar.call(this, listeProprietaire)
  else {
    if (calcul === null) {
      CFoncNVar.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul,
        nomsVariables, CalcC.ccbComp(chaineCalcul, listeProprietaire, 0,
          chaineCalcul.length - 1, nomsVariables))
    } else {
      CFoncNVar.call(this, listeProprietaire, impProto, estElementFinal, nomCalcul, chaineCalcul,
        nomsVariables, calcul)
    }
  }
}
CFoncComplexeNVar.prototype = new CFoncNVar()
CFoncComplexeNVar.prototype.constructor = CFoncComplexeNVar
CFoncComplexeNVar.prototype.superClass = 'CFoncNVar'
CFoncComplexeNVar.prototype.className = 'CFoncComplexeNVar'

CFoncComplexeNVar.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.impProto)
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CFoncComplexeNVar(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.nomCalcul, this.chaineCalcul, this.nomsVariables, calculClone)
}
CFoncComplexeNVar.prototype.getNatureCalcul = function () {
  switch (this.nbVar) {
    case 2 :
      return NatCal.NFonctionComplexe2Var
    case 3 :
      return NatCal.NFonctionComplexe3Var
    case 4 :
      return NatCal.NFonctionComplexe4Var
    case 5 :
      return NatCal.NFonctionComplexe5Var
    case 6 :
      return NatCal.NFonctionComplexe6Var
  }
}
/* Version 4.9.7 : Transféré dans CFoncComplexe
CFoncComplexeNVar.prototype.rendValeurFonctionComplexe = function(infoRandom, parametre, zRes) {
  this.calcul.resultatFonctionComplexe(infoRandom, parametre, zRes);
}
*/
