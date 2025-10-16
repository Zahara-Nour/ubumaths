/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFonction3Var from '../objets/CFonction3Var'
import CCb from '../objets/CCb'
export default CFonction3Var

CFonction3Var.prototype.depDe4Rec = function (p) {
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) || this.operande1.depDe4Rec(p) ||
    this.operande2.depDe4Rec(p) || this.operande3.depDe4Rec(p))
}

CFonction3Var.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande1.estDefiniParObjDs(listeOb) && this.operande2.estDefiniParObjDs(listeOb) &&
    this.operande3.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CFonction3Var.prototype.estConstantPourConst = function () {
  return (this.operande1.estConstantPourConst() && this.operande2.estConstantPourConst() && this.operande3.estConstantPourConst())
}
