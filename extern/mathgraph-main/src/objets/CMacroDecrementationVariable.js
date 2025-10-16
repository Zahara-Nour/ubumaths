/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CMacroIncrementationVariable from './CMacroIncrementationVariable'
export default CMacroDecrementationVariable

/**
 * Macro décrémentant une variable de la valeur de son pas.
 * @constructor
 * @extends CMacroIncrementationVariable
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si l'objet est un élément final de construction.
 * @param {Color} couleur  La couleur d'éciture de l'éditeur (et du cadre éventuel).
 * @param {number} xNom  L'abscisse d'affichage de la macro
 * @param {number} yNom  L'ordonnée d'affichage de la macro
 * @param {number} decX  Décalage horizontal du nom
 * @param {number} decY  Décalage vertical du nom
 * @param {boolean} masque  true si l'éditeur est masqué
 * @param {CPt} pointLie  null ou pointe sur un point auquel l'affichage est lié.
 * @param {number} taillePolice  Indice de la taiile de police utilisée
 * @param {boolean} effacementFond  true si on efface le fond de l'en-tête.
 * @param {Color} couleurFond  La couleur de fond de l'en-tête.
 * @param {number} alignementHorizontal  0 pour alignement gauche, 1 pour centre, 2 pour droite.
 * @param {number} alignementVertical  0 pour alignement vers le haut, 1 pour centré, 2 pour bas.
 * @param {string} intitule  Le titre de la macro
 * @param {string} commentaireMacro  Eventuel commentaire explicatif.
 * @param {CVariableBornee} variableAssociee  La variable que la macro décrémente.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroDecrementationVariable}
 */
function CMacroDecrementationVariable (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, variableAssociee,
  fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) {
      CMacro.call(this, listeProprietaire)
      this.listeDep = new CListeObjets()
    } else {
      CMacroIncrementationVariable.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, variableAssociee, fixed)
    }
  }
}
CMacroDecrementationVariable.prototype = new CMacroIncrementationVariable()
CMacroDecrementationVariable.prototype.constructor = CMacroDecrementationVariable
CMacroDecrementationVariable.prototype.superClass = 'CMacroIncrementationVariable'
CMacroDecrementationVariable.prototype.className = 'CMacroDecrementationVariable'

CMacroDecrementationVariable.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  this.listeDep.initialise(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return new CMacroDecrementationVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond,
    this.couleurFond, this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    listeCible.get(ind1, 'CVariableBornee'), this.fixed)
}
CMacroDecrementationVariable.prototype.executionPossible = function () {
  const nouvelleValeur = this.variableAssociee.rendValeur() - this.variableAssociee.valeurPas
  return (nouvelleValeur >= this.variableAssociee.valeurMini) &&
      (nouvelleValeur <= this.variableAssociee.valeurMaxi)
}
CMacroDecrementationVariable.prototype.execute = function (svg, dimf, couleurFond) {
  this.variableAssociee.decremente()
  this.listeDep.positionne(true, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.variableAssociee.updateDisplay() // Pour les variables auxquelles sont associées un dialogue
  this.termineAction(svg, dimf, couleurFond)
}
CMacroDecrementationVariable.prototype.executeSimple = function () {
  this.variableAssociee.decremente()
}
