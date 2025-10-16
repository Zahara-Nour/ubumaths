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
import CMesureAffixe from '../objets/CMesureAffixe'

export default OutilMesAffRep

/**
 * Outil servant à mesurer l'abscisse d'un pointn dans un repère
 * Les outils de mesure d'ordonnée et d'affixe descendent de cet outil et ont seulement à reédfinir getMesure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesAffRep (app) {
  OutilParPointRepere.call(this, app, 'MesAffRep', 33141)
}

OutilMesAffRep.prototype = new OutilParPointRepere()

OutilMesAffRep.prototype.indication = function () {
  return 'indPoint'
}

OutilMesAffRep.prototype.preIndication = function () {
  return 'MesAffRep'
}

/**
 * Fonction a redéfinir pour les outils descendants de OutilParPointRepere
 * Renvoie l'objet créé : mesure d'affixe de this.point de nom st dans le repère rep
 * @param st
 * @param rep
 * @returns {CMesureAffixe}
 */
OutilMesAffRep.prototype.getMesure = function (st, rep) {
  return new CMesureAffixe(this.app.listePr, null, false, rep, this.point, st)
}
