/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDroiteDirectionFixe from '../objets/CDroiteDirectionFixe'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'

export default CDroiteDirectionFixe

CDroiteDirectionFixe.prototype.infoHist = function () {
  let ch = this.getName() + ' : '
  if (this.droiteHorizontale) ch += getStr('chinfo50')
  else ch += getStr('chinfo51')
  ch += ' ' + getStr('chinfo196') + ' ' + this.a.getName()
  return ch
}

CDroiteDirectionFixe.prototype.contientParDefinition = function (po) {
  return ((this.a === po) || CDroite.prototype.contientParDefinition.call(this, po))
}

CDroiteDirectionFixe.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) || this.a.depDe4Rec(p))
}

CDroiteDirectionFixe.prototype.adaptRes = function (coef) {
  CDroite.prototype.adaptRes.call(this, coef)
  this.longueurVecteur *= coef
  this.vect.x *= coef
  this.vect.y *= coef
}

CDroiteDirectionFixe.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb)
}
