/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMacro from '../objets/CMacro'
import { getStr } from '../kernel/kernel'
export default CMacro

CMacro.prototype.info = function () {
  return this.getName() + ' : ' + this.intitule
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CMacro.prototype.genereNom = function () {
  CMacro.ind++
  return getStr('rmac') + CMacro.ind
}

CMacro.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CMacro.prototype.peutEtreMacroFinBoucle = function () {
  return false
}

/**
 * Fonction qui renverra true si la macro est une macro avec liste à laquelle on peut ajouter ou retirer des objets
 * @returns {boolean}
 */
CMacro.prototype.ajoutOuRetraitObjetsPossible = function () {
  return false
}

/**
 * Fonctin qui renerra true si la macro peut être une macro lancée quand on ouvre la figure c'est à dire
 * une macro d'implémentation récursive ou itérative ou une macro d'exécution d'une suite de telles macros
 * @returns {boolean}
 */
CMacro.prototype.utilisablePourDemarrage = function () {
  return false
}

/**
 * Fonction renvoyant une chaîne de acractères à rajoutet à this.infoHist()
 * Utilisé dans l'historique
 * @returns {string}
 */
CMacro.prototype.infoHist = function () {
  let ch = this.info()
  if (this.pointLie !== null) ch += '\n' + getStr('liea') + ' ' + this.pointLie.getName()
  return ch
}
