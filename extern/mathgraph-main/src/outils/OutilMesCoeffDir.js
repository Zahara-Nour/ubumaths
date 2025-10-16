/*
 * Created by yvesb on 24/01/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import OutilParDroiteRepere from './OutilParDroiteRepere'
import CMesureCoefDir from '../objets/CMesureCoefDir'

export default OutilMesCoefDir

/**
 * Outil servant à mesurer l'abscisse d'un pointn dans un repère
 * Les outils de mesure d'ordonnée et d'affixe descendent de cet outil et ont seulement à reédfinir getMesure
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilMesCoefDir (app) {
  OutilParDroiteRepere.call(this, app, 'MesCoefDir', 33010)
}

OutilMesCoefDir.prototype = new OutilParDroiteRepere()

OutilMesCoefDir.prototype.indication = function () {
  return 'indDte'
}

OutilMesCoefDir.prototype.preIndication = function () {
  return 'MesCoefDir'
}

/**
 * Fonction a redéfinir pour les outils descendants de OutilParPointRepere
 * Renvoie l'objet créé : mesure d'abscisse de this.point de nom st dans le repère rep
 * @param st
 * @param rep
 * @returns {CMesureY}
 */
OutilMesCoefDir.prototype.getMesure = function (st, rep) {
  return new CMesureCoefDir(this.app.listePr, null, false, st, rep, this.dte)
}
