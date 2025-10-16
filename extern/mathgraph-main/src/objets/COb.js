/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default COb
/**
 * Objet de base de MathGraph32. Contient un numéro de version
 * Les classes hériteront toutes de COb et devront redéfinir numeroVersion
 * dans leur prototype si elles utilisent un numéro de version différent
 * @constructor
 * @param {CListeObjets} listeProprietaire
 * @returns {void}
 */
function COb (listeProprietaire) {
  // on est appelé sans argument pour être mis en prototype des classes filles
  if (arguments.length === 0) return
  this.nVersion = this.numeroVersion()
  this.listeProprietaire = listeProprietaire
}
/**
 * Retourne le numéro de version de l'objet
 * @returns {number}
 */
COb.prototype.numeroVersion = function () { return 1 }
/**
 * Fonction lisant l'objet dans le flux binaire inps
 * A redéfinir pour les descendants
 * @param {DataInputStream} inps
 * @param {CListeObjets} list
 * @returns {void}
 */
COb.prototype.read = function (inps, list) {
  this.listeProprietaire = list
}
// Ne fait rien mais gardé quand même pour compatibilité java (???)
/**
 * Fonction enregistrant l'objet dans le flux binaire oups
 * A redéfinir pour les descendants
 * @param {DataOutputStream} oups
 * @param {CListeObjets} list
 * @returns {void}
 */
COb.prototype.write = function (oups, list) {
}
