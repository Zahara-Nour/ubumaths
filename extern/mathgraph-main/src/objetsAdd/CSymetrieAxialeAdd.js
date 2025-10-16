/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSymetrieAxiale from '../objets/CSymetrieAxiale'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CSymetrieAxiale

CSymetrieAxiale.prototype.complementInfo = function () {
  return getStr('SymAxiale') + ' ' + getStr('chinfo225') + ' ' + this.axe.getNom()
}

CSymetrieAxiale.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.axe.depDe4Rec(p))
}

CSymetrieAxiale.prototype.ajouteAntecedents = function (list) {
  list.add(this.axe)
}

CSymetrieAxiale.prototype.estDefiniParObjDs = function (listeOb) {
  return this.axe.estDefPar(listeOb)
}
