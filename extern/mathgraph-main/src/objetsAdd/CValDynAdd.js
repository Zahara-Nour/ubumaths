/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// Modifié version 6.3.0
import CValDyn from '../objets/CValDyn'
export default CValDyn

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CValDyn.prototype.estConstantPourConst = function () {
  return false
}
