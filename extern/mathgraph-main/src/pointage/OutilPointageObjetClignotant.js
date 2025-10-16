/*
 * Created by yvesb on 05/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import OutilPointageCre from './OutilPointageCre'

export default OutilPointageObjetClignotant

/**
 * Outil servant à créer des objets en cliqnant sur des objets clignotant de la figure
 * Hérite de OutilPointageCre
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilPointageObjetClignotant (app) {
  OutilPointageCre.call(this, app)
}
OutilPointageObjetClignotant.prototype = new OutilPointageCre()

/**
 * Renvoie la liste d'objets utilisée par l'outil
 * @returns {CListeObjets}
 */
OutilPointageObjetClignotant.prototype.listeUtilisee = function () {
  return this.app.listeClignotante
}
