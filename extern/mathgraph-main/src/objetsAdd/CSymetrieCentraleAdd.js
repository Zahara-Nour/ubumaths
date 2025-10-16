/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSymetrieCentrale from '../objets/CSymetrieCentrale'
import CTransformation from '../objets/CTransformation'
import { getStr } from '../kernel/kernel'
export default CSymetrieCentrale

CSymetrieCentrale.prototype.complementInfo = function () {
  return getStr('SymCentrale') + ' ' + getStr('chinfo202') + ' ' + this.centre.getName()
}

CSymetrieCentrale.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CTransformation.prototype.depDe4Rec.call(this, p) ||
    this.centre.depDe4Rec(p))
}

CSymetrieCentrale.prototype.ajouteAntecedents = function (list) {
  list.add(this.centre)
}

CSymetrieCentrale.prototype.estDefiniParObjDs = function (listeOb) {
  return this.centre.estDefPar(listeOb)
}
