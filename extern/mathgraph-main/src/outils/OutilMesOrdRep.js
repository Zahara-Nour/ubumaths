/*
 * Created by yvesb on 21/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilParPointRepere from './OutilParPointRepere'
import CMesureY from '../objets/CMesureY'

export default OutilMesOrdRep

/**
 * Outil servant à mesurer l'abscisse d'un pointn dans un repère
 * Les outils de mesure d'ordonnée et d'affixe descendent de cet outil et ont seulement à reédfinir getMesure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesOrdRep (app) {
  OutilParPointRepere.call(this, app, 'MesOrdRep', 33067)
}

OutilMesOrdRep.prototype = new OutilParPointRepere()

OutilMesOrdRep.prototype.preIndication = function () {
  return 'MesOrdRep'
}

/**
 * Fonction a redéfinir pour les outils descendants de OutilParPointRepere
 * Renvoie l'objet créé : mesure d'ordonnée de this.point de nom st dans le repère rep
 * @param st
 * @param rep
 * @returns {CMesureY}
 */
OutilMesOrdRep.prototype.getMesure = function (st, rep) {
  return new CMesureY(this.app.listePr, null, false, st, rep, this.point)
}
