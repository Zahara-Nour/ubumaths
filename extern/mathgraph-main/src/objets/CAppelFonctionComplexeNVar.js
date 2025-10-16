/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CAppelFonctionNVar from './CAppelFonctionNVar'
export default CAppelFonctionComplexeNVar
/**
 * Objet d'un arbre binaire de calcul représentant un appel de fonction complexe utilisateur
 * à n variables.
 * @constructor
 * @extends CAppelFonctionNVar
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {number} nbVar  Le nombre de variables de la fonction
 * @param {CFoncNVar} fonctionAssociee  La fonction appliquée à l'opérande.
 * @param {CCb[]} operandes  Tableau de CCb représentant les opérandes.
 * @returns {CAppelFonctionComplexeNVar}
 */
function CAppelFonctionComplexeNVar (listeProprietaire, nbVar, fonctionAssociee, operandes) {
  CAppelFonctionNVar.call(this, listeProprietaire, nbVar, fonctionAssociee, operandes)
}
CAppelFonctionComplexeNVar.prototype = new CAppelFonctionNVar()
CAppelFonctionComplexeNVar.prototype.constructor = CAppelFonctionComplexeNVar
CAppelFonctionComplexeNVar.prototype.superClass = 'CAppelFonctionNVar'
CAppelFonctionComplexeNVar.prototype.className = 'CAppelFonctionComplexeNVar'

CAppelFonctionComplexeNVar.prototype.getClone = function (listeSource, listeCible) {
  const operandeClone = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) { operandeClone[i] = this.operandes[i].getClone(listeSource, listeCible) }
  const ind1 = listeSource.indexOf(this.fonctionAssociee)
  return new CAppelFonctionComplexeNVar(listeCible, this.nbVar, listeCible.get(ind1, 'CAppelFonctionComplexeNVar'),
    operandeClone)
}

CAppelFonctionComplexeNVar.prototype.getCopie = function () {
  const operandeCopie = new Array(this.nbVar)
  for (let i = 0; i < this.nbVar; i++) operandeCopie[i] = this.operandes[i].getCopie()
  return new CAppelFonctionComplexeNVar(this.listeProprietaire, this.nbVar, this.fonctionAssociee, operandeCopie)
}

CAppelFonctionComplexeNVar.prototype.calculAvecValeursRemplacees = function (bfrac) {
  const nbvar = this.fonctionAssociee.nombreVariables()
  const tabcal = new Array(this.fonctionAssociee.nombreVariables())
  for (let i = 0; i < nbvar; i++) {
    tabcal[i] = this.operandes[i].calculAvecValeursRemplacees(bfrac)
  }
  return new CAppelFonctionComplexeNVar(this.listeProprietaire, nbvar, this.fonctionAssociee, tabcal)
}
