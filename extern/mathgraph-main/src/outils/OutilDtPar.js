/*
 * Created by yvesb on 24/09/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteParallele from '../objets/CDroiteParallele'
import OutilParDtPt from './OutilParDtPt'
export default OutilDtPar
/**
 * Outil servant à créer une droite parallèle
 * @param {MtgApp} app L'application propriétaire
 * @constructor
 */
function OutilDtPar (app) {
  OutilParDtPt.call(this, app, 'DtPar', 32787, true)
}

OutilDtPar.prototype = new OutilParDtPt()

/**
 * Spécial version mtgApp. Renvoie l'objet à créer
 * Sera redéfini pour les descendants
 * @param pt
 * @param dt
 */
OutilDtPar.prototype.objet = function (pt, dt) {
  const app = this.app
  return new CDroiteParallele(app.listePr, null, false, app.getCouleur(), false, 0, 0, false, '', app.getTaillePoliceNom(),
    app.getStyleTrait(), 0.1, pt, dt)
}

/**
 * Fonction renvoyant true si l'outil accepte qu'on crée un point par défaut lors d'un clic sur un endroit vide
 */
OutilDtPar.prototype.creationPointPossible = function () {
  return true
}

OutilDtPar.prototype.preIndication = function () {
  return 'DtPar'
}

OutilDtPar.prototype.isLineTool = function () {
  return true
}
