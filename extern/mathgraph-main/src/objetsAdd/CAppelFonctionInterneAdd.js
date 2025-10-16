/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAppelFonctionInterne from '../objets/CAppelFonctionInterne'
export default CAppelFonctionInterne

// Ajout version 6.3.0. Utilis pour les créations de contructions
CAppelFonctionInterne.prototype.estConstantPourConst = function () {
  return this.fonctionInterne.estConstantPourConst() && this.operande.estConstantPourConst()
}
