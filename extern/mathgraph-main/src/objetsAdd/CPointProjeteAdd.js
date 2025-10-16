/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointProjete from '../objets/CPointProjete'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CPointProjete

CPointProjete.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('proj') + ' ' + getStr('of') + ' ' + this.a.getName() +
    ' ' + getStr('sur') + ' ' + this.d.getNom()
}

CPointProjete.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.a.depDe4Rec(p) || this.d.depDe4Rec(p))
}

CPointProjete.prototype.appartientDroiteParDefinition = function (droite) {
  // CPt.prototype.appartientDroiteParDefinition.call renvoie true si la droite contient this par définition
  return (droite === this.d) || CPt.prototype.appartientDroiteParDefinition.call(this, droite)
}

CPointProjete.prototype.estDefiniParObjDs = function (listeOb) {
  return this.a.estDefPar(listeOb) &&
  this.d.estDefPar(listeOb)
}
