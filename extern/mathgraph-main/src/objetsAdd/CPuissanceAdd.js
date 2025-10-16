/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPuissance from '../objets/CPuissance'
import CCb from '../objets/CCb'

export default CPuissance

CPuissance.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) ||
    this.operande.depDe4Rec(p) || this.exposant.depDe4Rec(p))
}

CPuissance.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande.estDefiniParObjDs(listeOb) &&
  this.exposant.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CPuissance.prototype.estConstantPourConst = function () {
  return this.operande.estConstantPourConst() && this.exposant.estConstantPourConst()
}
