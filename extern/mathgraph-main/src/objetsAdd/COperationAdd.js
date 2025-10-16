/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import COperation from '../objets/COperation'

export default COperation

COperation.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(this.operande1.depDe4Rec(p) || this.operande2.depDe4Rec(p))
}

COperation.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande1.estDefiniParObjDs(listeOb) &&
  this.operande2.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
COperation.prototype.estConstantPourConst = function () {
  return this.operande1.estConstantPourConst() && this.operande2.estConstantPourConst()
}
