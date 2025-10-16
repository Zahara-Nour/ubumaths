/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CFonction from '../objets/CFonction'
import CCb from '../objets/CCb'
import Opef from '../types/Opef'

export default CFonction

CFonction.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) || this.operande.depDe4Rec(p))
}

CFonction.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CFonction.prototype.estConstantPourConst = function () {
  return (this.opef !== Opef.Rand) && this.operande.estConstantPourConst()
}
