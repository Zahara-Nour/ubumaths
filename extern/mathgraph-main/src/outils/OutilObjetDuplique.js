/*
 * Created by yvesb on 25/06/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from '../types/NatObjAdd'
import CObjetDuplique from '../objets/CObjetDuplique'
import OutilObjetPar1Objet from './OutilObjetPar1Objet'
export default OutilObjetDuplique

/**
 * Outil servant à créer le dupliqué d'un objet
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilObjetDuplique (app) {
  OutilObjetPar1Objet.call(this, app, 'ObjetDuplique', 32943, true, NatObj.NTtObjPourDup)
}

OutilObjetDuplique.prototype = new OutilObjetPar1Objet()

OutilObjetDuplique.prototype.indication = function () {
  return 'indDup'
}

OutilObjetDuplique.prototype.objet = function (ob) {
  const app = this.app
  return new CObjetDuplique(app.listePr, null, false, false, ob)
}

// Pas d'objets visuels pour cet outil
OutilObjetDuplique.prototype.ajouteObjetsVisuels = function () {
}

OutilObjetDuplique.prototype.isReadyForTouchEnd = function () {
  return false
}
