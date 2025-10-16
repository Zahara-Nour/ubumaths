/*
 * Created by yvesb on 22/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CBissectrice from '../objets/CBissectrice'
import CDroite from '../objets/CDroite'
import { getStr } from '../kernel/kernel'

export default CBissectrice

CBissectrice.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('DtBis') + ' ' + getStr('of') +
    ' ' + this.b.getName() + this.a.getName() + this.c.getName()
}

CBissectrice.prototype.contientParDefinition = function (po) {
  return (this.a === po)
}

CBissectrice.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CDroite.prototype.depDe4Rec.call(this, p) ||
    this.b.depDe4Rec(p) || this.a.depDe4Rec(p) || this.c.depDe4Rec(p))
}

CBissectrice.prototype.adaptRes = function (coef) {
  CDroite.prototype.adaptRes.call(this, coef)
  this.longueurVecteurDirecteur *= coef
}

CBissectrice.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.b.estDefPar(listeOb) &&
  this.c.estDefPar(listeOb)
}
