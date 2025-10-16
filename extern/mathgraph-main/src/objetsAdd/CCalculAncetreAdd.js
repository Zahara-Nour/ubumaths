/*
 * Created by yvesb on 30/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CCalculAncetre from '../objets/CCalculAncetre'
export default CCalculAncetre

CCalculAncetre.prototype.info = function () {
  return this.getNom()
}
