/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { ConvDegRad, mesurePrincipale, uniteAngleDegre } from '../kernel/kernel'
import CValeur from './CValeur'

export default CValeurAngle
// Modifié par rapport à la verion Java : hérite de CValeur

/**
 * Classe représentant une valeur dynamique d'angle définie par un calcul sur des objets
 * numériques de la figure.
 * @constructor
 * @extends CValeur
 * @param {CListeObjets} listeProprietaire
 * @param {CCb|number} calcul  pointe sur le calcul donnant le résultat
 * @returns {CValeurAngle}
 */
function CValeurAngle (listeProprietaire, calcul) {
  CValeur.call(this, listeProprietaire, calcul)
}
CValeurAngle.prototype = new CValeur()
CValeurAngle.prototype.constructor = CValeurAngle
CValeurAngle.prototype.superClass = 'CValeur'
CValeurAngle.prototype.className = 'CValeurAngle'

CValeurAngle.prototype.getClone = function (listeSource, listeCible) {
  const calculClone = this.calcul.getClone(listeSource, listeCible)
  return new CValeurAngle(listeCible, calculClone, this.valeur)
}
CValeurAngle.prototype.rendValeurRadian = function () {
  let val = this.valeur
  if (this.listeProprietaire.uniteAngle === uniteAngleDegre) val = val * ConvDegRad
  val = mesurePrincipale(val)
  return val
}
