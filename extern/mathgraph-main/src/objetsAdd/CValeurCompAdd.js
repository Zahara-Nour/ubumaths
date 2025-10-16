/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CValeurComp from '../objets/CValeurComp'

export default CValeurComp

CValeurComp.prototype.depDe4Rec = function (p) {
  return this.calcul.depDe4Rec(p)
}

/**
 * Fonction donnant au calcul de l'objet le calcul calc.
 * @param {CCb} calc
 * @returns {void}
 */
CValeurComp.prototype.donneCalcul = function (calc) {
  this.calcul = calc
  this.dejaPositionne = false
}

CValeurComp.prototype.estDefiniParObjDs = function (listeOb) {
  return this.calcul.estDefiniParObjDs(listeOb)
}
