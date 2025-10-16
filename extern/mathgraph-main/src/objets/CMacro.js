/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObj'
import StyleEncadrement from '../types/StyleEncadrement'
import CAffLiePt from './CAffLiePt'
import { traiteAccents } from '../kernel/kernel'

export default CMacro

/**
 * Classe ancêtre de toutes les macros.
 * @constructor
 * @extends CAffLiePt
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
 * @param {boolean} fixed true si l'affichage est punaisé et ne peut pas être capturé à la souris
 * @returns {CMacro}
 */
function CMacro (listeProprietaire, impProto, estElementFinal, couleur, xNom, yNom,
  decX, decY, masque, pointLie, taillePolice, effacementFond, couleurFond, alignementHorizontal,
  alignementVertical, intitule, commentaireMacro, fixed) {
  if (arguments.length !== 0) {
    if (arguments.length === 1) CAffLiePt.call(this, listeProprietaire)
    else {
      CAffLiePt.call(this, listeProprietaire, impProto, estElementFinal, couleur,
        xNom, yNom, decX, decY, masque, pointLie, taillePolice, StyleEncadrement.Effet3D,
        effacementFond, couleurFond, alignementHorizontal, alignementVertical,
        null, fixed)
      this.intitule = intitule
      this.commentaireMacro = commentaireMacro
      this.macroLanceuse = null // Ajout version 5.1
    }
    this.executionEnCours = false
  }
}
CMacro.prototype = new CAffLiePt()
CMacro.prototype.constructor = CMacro
CMacro.prototype.superClass = 'CAffLiePt'
CMacro.prototype.className = 'CMacro'

CMacro.sansAnimation = 0
CMacro.animationParTimer = 1
CMacro.animationParThread = 2

CMacro.prototype.getNature = function () {
  return NatObj.NMacro
}
CMacro.prototype.execute = function () {
  this.executionEnCours = true
}
// Ajout version 5.1
/**
 * Fonction servant à informer une macro qu'elle est lancée par une macro
 * mac qui est nécessairement une CMacroSuiteMacro
 * Sert lors de l'éxécution d'une macro enchaînant d'autres macros qui peuvent elles
 * mêmes être des macros enchaînant d'autres macros.
 * @param {CMacro} mac
 * @returns {void}
 */
CMacro.prototype.setMacroLanceuse = function (mac) {
  this.macroLanceuse = mac
}
CMacro.prototype.termineAction = function (svg, dimf, couleurFond) {
  this.executionEnCours = false
  /* Modifié version 5.1
  var mac = this.listeProprietaire.macroEnCours;
  if ((mac !== null) && (mac.className === "CMacroSuiteMacros")) {
    this.listeProprietaire .macroEnCours.passageMacroSuiv(svg, dimf, couleurFond, transparence);
  }
  else this.listeProprietaire.macroEnCours = null;
  */
  if (this.macroLanceuse !== null) {
    this.macroLanceuse.passageMacroSuiv(svg, dimf, couleurFond)
  } else this.listeProprietaire.macroEnCours = null
}
CMacro.prototype.passageMacroSuiv = function (svg, dimf, couleurFond) {
  /* Modification version 5.1
  if (this.listeProprietaire.macroEnCours.className === "CMacroSuiteMacros") {
    this.listeProprietaire.macroEnCours.passageMacroSuiv(svg, dimf, couleurFond, transparence);
  }
  else this.listeProprietaire.macroEnCours = null;
  */
  if (this.macroLanceuse === null) {
    this.listeProprietaire.macroEnCours = null
  } else {
    // Test rajouté version 6.4 pour pouvoir désactiver une animation en cours quand on active un outil.
    if (!this.listeProprietaire.terminerMacros) { this.macroLanceuse.passageMacroSuiv(svg, dimf, couleurFond) }
  }
}
/**
 * Fonctions à définir pour les descendants remettant à jour les listes
 * utilisées par la macro.
 * @returns {void}
 */
CMacro.prototype.etablitListesInternes = function () {
}
/* Pas utlisé pour le moment
CMacro.prototype.trace = function(svg, couleurFond, transparence) {
  // Les macros qui sont masquées ne doivent pas êre affichées quand on active l'iutil rideau
  // de démasquage d'objet
  if (this.masque) return;
  CAffLiePt.prototype.trace.call(this, svg, couleurFond, transparence);
}
*/
CMacro.prototype.rendChaineAffichage = function () {
  const len = this.intitule.length
  if (this.intitule.charAt(0) === '$') {
    if (this.intitule.charAt(this.len - 1) === '$') {
      return '$\\Rightarrow ' + this.intitule.substring(1, len - 1) + '$'
    }
  }
  return '⇒' + this.intitule
}
/**
 * MacroEnCours renvoie this excepté pour les macros de type CMacroSuiteMacro
 * @returns {CMacro}
 */
CMacro.prototype.macroEnCours = function () {
  return this
}
/**
 * envoie le type d'animation utilisé par la macro quand elle est exécutée.
 * Voir les types définis dans les premières lignes.
 * @returns {number}
 */
CMacro.prototype.typeAnimation = function () {
  return CMacro.sansAnimation
}
/**
 * Renvoie la fréquence d'animation pour les macros d'animation.
 * Doit être redéfini pour les macros utilisant une animation
 * @returns {number}
 */
CMacro.prototype.frequenceAnimation = function () {
  return 0
}
/**
 * Renvoie true si l'exécution de la macro est possible.
 * @returns {boolean}
 */
CMacro.prototype.executionPossible = function () {
  return true
}
/**
 * Fonction renvoyant true si la macro est prévue pour être arrêtée par un clic de souris.
 * Si la réponse est true et si la macro est contneue dans une macro exécutant une suite de macros
 * un clic de souris fera passer à la macro suivante.
 * @returns {boolean}
 */
CMacro.prototype.arretParClic = function () {
  return false
}
/**
 * Renvoie faux par défaut. A redéfinir pour les descendants agissant sur une variable.
 * @param {CVariableBornee} va
 * @returns {boolean}
 */
CMacro.prototype.agitSurVariable = function (va) {
  return false
}
/**
 * Initialise la macro.
 * @returns {void}
 */
CMacro.prototype.initialise = function () {
  // Ajout version 5.1
  this.listeProprietaire.macroEnCours = this
  //
}
/**
 * Renvoie true si la macro affecte val ou un calcul dépendant de val à une variable.
 * A redéfinir pour les macros d'affectation de valeur à variable, de modification de variable
 * et d'exécution d'une suite de macros
 * @param {number} val
 * @returns {boolean}
 */
CMacro.prototype.affecteValeurAVariable = function (val) {
  return false
}
/**
 * Fonction à redéfinir pour les macros pouvant être exécutées en début ou fin de boucle
 * pour les macros de boucle. Doit exécuter la macro mais sans action graphique sur la figure.
 * @param {Dimf} dimf
 * @returns {void}
 */
CMacro.prototype.executeSimple = function (dimf) {
}
CMacro.prototype.chaineDesignation = function () {
  return 'desMacro'
}

CMacro.prototype.read = function (inps, list) {
  CAffLiePt.prototype.read.call(this, inps, list)
  this.intitule = traiteAccents(inps.readUTF()) // Traitement des acents inutile avec MathJax 3
  this.commentaireMacro = inps.readUTF()
  this.macroLanceuse = null // Ajout version 5.1
  if (/^\$.*\$$/.test(this.intitule)) { // $ est le symbole pour "fin de chaîne" en regexp
    this.listeProprietaire.useLatex = true
  }
}

CMacro.prototype.write = function (oups, list) {
  CAffLiePt.prototype.write.call(this, oups, list)
  oups.writeUTF(this.intitule)
  oups.writeUTF(this.commentaireMacro)
}
