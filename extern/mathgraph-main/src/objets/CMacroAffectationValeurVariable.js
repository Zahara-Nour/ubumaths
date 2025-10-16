/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CListeObjets from './CListeObjets'
import CMacro from './CMacro'
import CValeur from './CValeur'
export default CMacroAffectationValeurVariable

/**
 * Macro affectant une valeur à une variable.
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
 * @param {CValeur} valeurAssociee  La valeur à affecter à la variable.
 * @param {CVariableBornee} variableAssociee  La variable à laquelle on affecte la valeur.
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacroAffectationValeurVariable}
 */
function CMacroAffectationValeurVariable (listeProprietaire, impProto, estElementFinal, couleur,
  xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, valeurAssociee, variableAssociee,
  fixed = false) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CMacro.call(this, listeProprietaire)
    else {
      CMacro.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond,
        alignementHorizontal, alignementVertical, intitule, commentaireMacro, fixed)
      this.valeurAssociee = valeurAssociee
      this.variableAssociee = variableAssociee
    }
  }
  this.listeDep = new CListeObjets()
}
CMacroAffectationValeurVariable.prototype = new CMacro()
CMacroAffectationValeurVariable.prototype.constructor = CMacroAffectationValeurVariable
CMacroAffectationValeurVariable.prototype.superClass = 'CMacro'
CMacroAffectationValeurVariable.prototype.className = 'CMacroAffectationValeurVariable'

CMacroAffectationValeurVariable.prototype.getClone = function (listeSource, listeCible) {
  const valeurClone = this.valeurAssociee.getClone(listeSource, listeCible)
  const ind1 = listeSource.indexOf(this.variableAssociee)
  const ind2 = listeSource.indexOf(this.pointLie)
  const ind3 = listeSource.indexOf(this.impProto)
  this.listeDep.initialise(listeCible.uniteAngle, listeCible.pointeurLongueurUnite)
  return new CMacroAffectationValeurVariable(listeCible,
    listeCible.get(ind3, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.xNom, this.yNom, this.decX, this.decY, this.masque,
    listeCible.get(ind2, 'CPt'), this.taillePolice,
    this.effacementFond, this.couleurFond, this.alignementHorizontal, this.alignementVertical,
    this.intitule, this.commentaireMacro, valeurClone, listeCible.get(ind1, 'CVariableBornee'))
}
CMacroAffectationValeurVariable.prototype.initialisePourDependance = function () {
  CMacro.prototype.initialisePourDependance.call(this)
  this.valeurAssociee.initialisePourDependance()
}
CMacroAffectationValeurVariable.prototype.depDe = function (p) {
  if (this.elementTestePourDependDe === p) return this.dependDeElementTeste
  return this.memDep(CMacro.prototype.depDe.call(this, p) ||
    this.variableAssociee.depDe(p) || this.valeurAssociee.depDe(p))
}
CMacroAffectationValeurVariable.prototype.dependDePourBoucle = function (p) {
  return CMacro.prototype.dependDePourBoucle.call(this, p) || this.variableAssociee.dependDePourBoucle(p) ||
    this.valeurAssociee.dependDePourBoucle(p)
}
CMacroAffectationValeurVariable.prototype.positionne = function (infoRandom, dimfen) {
  CMacro.prototype.positionne.call(this, infoRandom, dimfen)
  this.valeurAssociee.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.valeurAssociee.existe
}
// Ajout version 6.3.0
// Modifié version 7.2.4 car si l'inttitulé était en LaTeX, il n'était pas bien mis à jour
// quand on le modifiait
/*
CMacroAffectationValeurVariable.prototype.positionneFull = function (infoRandom, dimfen) {
  this.valeurAssociee.dejaPositionne = false
  this.positionne(infoRandom, dimfen)
}
 */
CMacroAffectationValeurVariable.prototype.positionneFull = function (infoRandom, dimfen) {
  CMacro.prototype.positionneFull.call(this, infoRandom, dimfen)
  this.valeurAssociee.dejaPositionne = false
  this.valeurAssociee.positionne(infoRandom, dimfen)
  this.existe = this.existe && this.valeurAssociee.existe
}

CMacroAffectationValeurVariable.prototype.agitSurVariable = function (va) {
  return (va === this.variableAssociee)
}
CMacroAffectationValeurVariable.prototype.affecteValeurAVariable = function (val) {
  return this.valeurAssociee.calcul.depDe(val)
}
CMacroAffectationValeurVariable.prototype.execute = function (svg, dimf, couleurFond) {
  this.valeurAssociee.positionne(false, dimf)
  const resultatValeur = this.valeurAssociee.rendValeur()
  this.variableAssociee.donneValeur(resultatValeur)
  this.executionEnCours = false
  // Modification, version 6.4.8. IL faut appeler positionneFull car des affichages LaTeX peuvent avoir besoin d'être préparés.
  // this.listeDep.positionne(false, dimf)
  this.listeDep.positionneLatexFull(false, dimf)
  this.listeDep.update(svg, couleurFond, true)
  this.variableAssociee.updateDisplay() // Pour les variables auxquelles sont associées un dialogue
  this.termineAction(svg, dimf, couleurFond)
}
CMacroAffectationValeurVariable.prototype.executeSimple = function (dimf) {
  this.valeurAssociee.positionne(true, dimf)
  const resultatValeur = this.valeurAssociee.rendValeur()
  this.variableAssociee.donneValeur(resultatValeur)
}
CMacroAffectationValeurVariable.prototype.executionPossible = function () {
  let resultat = this.valeurAssociee?.existe && this.variableAssociee?.existe
  if (resultat) {
    const nouvelleValeur = this.valeurAssociee.rendValeur()
    resultat = (nouvelleValeur >= this.variableAssociee.valeurMini) &&
      (nouvelleValeur <= this.variableAssociee.valeurMaxi)
  }
  return resultat
}
CMacroAffectationValeurVariable.prototype.etablitListesInternes = function () {
  this.listeDep = new CListeObjets(this.listeProprietaire.uniteAngle, this.listeProprietaire.pointeurLongueurUnite)
  this.listeDep.ajouteObjetsDependantsSauf(this.variableAssociee, this.listeProprietaire, this)
}
CMacroAffectationValeurVariable.prototype.metAJour = function () {
  this.etablitListesInternes()
}
CMacroAffectationValeurVariable.prototype.read = function (inps, list) {
  CMacro.prototype.read.call(this, inps, list)
  this.valeurAssociee = new CValeur()
  this.valeurAssociee.read(inps, list)
  const ind1 = inps.readInt()
  this.variableAssociee = list.get(ind1, 'CVariableBornee')
  this.listeDep = new CListeObjets(list.uniteAngle, list.pointeurLongueurUnite)
}
CMacroAffectationValeurVariable.prototype.write = function (oups, list) {
  CMacro.prototype.write.call(this, oups, list)
  this.valeurAssociee.write(oups, list)
  const ind1 = list.indexOf(this.variableAssociee)
  oups.writeInt(ind1)
}
