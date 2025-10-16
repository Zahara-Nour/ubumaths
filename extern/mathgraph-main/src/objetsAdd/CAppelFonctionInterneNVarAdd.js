/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAppelFonctionInterneNVar from '../objets/CAppelFonctionInterneNVar'
export default CAppelFonctionInterneNVar

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CAppelFonctionInterneNVar.prototype.estConstantPourConst = function () {
  let res = false
  const nvar = this.operandes.length
  for (let i = 0; i < nvar; i++) {
    res = res || this.operandes[i].estConstantPourConst()
  }
  return res
}
