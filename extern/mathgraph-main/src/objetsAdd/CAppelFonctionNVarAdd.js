/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CAppelFonctionNVar from '../objets/CAppelFonctionNVar'
import CCb from '../objets/CCb'
export default CAppelFonctionNVar

CAppelFonctionNVar.prototype.depDe4Rec = function (p) {
  let res = CCb.prototype.depDe4Rec.call(this, p)
  for (let i = 0; i < this.nbVar; i++) res = res || this.operandes[i].depDe4Rec(p)
  return this.memDep4Rec(this.fonctionAssociee.depDe4Rec(p) || res)
}

CAppelFonctionNVar.prototype.estDefiniParObjDs = function (listeOb) {
  let res = this.fonctionAssociee.estDefPar(listeOb)
  for (let i = 0; i < this.nbVar; i++) res = res && this.operandes[i].estDefiniParObjDs(listeOb)
  return res
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CAppelFonctionNVar.prototype.estConstantPourConst = function () {
  let res = this.fonctionAssociee.estConstant()
  for (let i = 0; i < this.nbVar; i++) res = res && this.operandes[i].estConstant()
  return res
}
