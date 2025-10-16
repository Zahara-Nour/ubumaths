/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
export default CMacroIncrementationVariable

/**
 *
 * Macro incrémentant une variable de la valeur de son pas.
 * @constructor
 * @extends CMacro
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
 * @param {CVariableBornee} variableAssociee  La variable que la macro incrémente.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroIncrementationVariable}
 */
function CMacroIncrementationVariable (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro,
  variableAssociee, fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.variableAssociee = variableAssociee
    }
  }
  this.listeDep = new CListeObjets()
}
CMacroIncrementationVariable.prototype = new CMacro()
CMacroIncrementationVariable.prototype.constructor = CMacroIncrementationVariable
CMacroIncrementationVariable.prototype.superClass = 'CMacro'
CMacroIncrementationVariable.prototype.className = 'CMacroIncrementationVariable'

CMacroIncrementationVariable.prototype.getClone = function (listeSource, listeCible) {
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  this.listeDep.initialise(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return new CMacroIncrementationVariable(listeCible, listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice, this.effacementFond,
    this.couleurFond, this.alignementHorizontal, this.alignementVertical, this.intitule, this.commentaireMacro,
    listeCible.get(ind1, 'CVariableBornee'), this.fixed)
}
CMacroIncrementationVariable.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) || this.variableAssociee.depDe(p))
}
CMacroIncrementationVariable.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.variableAssociee.dependDePourBoucle(p)
}
CMacroIncrementationVariable.prototype.agitSurVariable = function (va) {
  return (va === this.variableAssociee)
}
CMacroIncrementationVariable.prototype.executionPossible = function () {
  const nouvelleValeur = this.variableAssociee.rendValeur() + this.variableAssociee.valeurPas
  return (nouvelleValeur >= this.variableAssociee.valeurMini) &&
      (nouvelleValeur <= this.variableAssociee.valeurMaxi)
}
CMacroIncrementationVariable.prototype.executionPossible = function () {
  const nouvelleValeur = this.variableAssociee.rendValeur() + this.variableAssociee.valeurPas
  return (nouvelleValeur >= this.variableAssociee.valeurMini) &&
      (nouvelleValeur <= this.variableAssociee.valeurMaxi)
}
CMacroIncrementationVariable.prototype.execute = function (svg, dimf, couleurFond) {
  this.variableAssociee.incremente()
  this.listeDep.positionne(true, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.variableAssociee.updateDisplay() // Pour les variables auxquelles sont associées un dialogue
  this.termineAction(svg, dimf, couleurFond)
}
CMacroIncrementationVariable.prototype.executeSimple = function (dimf) {
  this.variableAssociee.incremente()
}
CMacroIncrementationVariable.prototype.etablitListesInternes = function () {
  this.listeDep = new CListeObjets(this.listeProprietaire.uniteAngle, this.listeProprietaire.pointeurLongueurUnite)
  this.listeDep.ajouteObjetsDependantsSauf(this.variableAssociee, this.listeProprietaire, this)
}
CMacroIncrementationVariable.prototype.metAJour = function () {
  this.etablitListesInternes()
}
CMacroIncrementationVariable.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariableBornee')
  this.listeDep = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
}
CMacroIncrementationVariable.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
}
