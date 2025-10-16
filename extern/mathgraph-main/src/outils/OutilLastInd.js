/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Outil from './Outil'
export default OutilLastInd
/**
 * Outil servant à réafficher la dernière indication fugitive en haut et à droite
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 * @extends Outil
 */
function OutilLastInd (app) {
  // Avant-dernier false car l'outil n'est pas sélectionnable et dernier true car l'outil doit toujours être présent
  // Cet outil a une icône associée
  Outil.call(this, app, '', 'LastInd', -1, false, false, true)
}

OutilLastInd.prototype = new Outil()

OutilLastInd.prototype.select = function () {
  this.app.lastIndication()
}
