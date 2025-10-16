/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureAbscisse from '../objets/CMesureAbscisse'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CMesureAbscisse

CMesureAbscisse.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.origine.depDe4Rec(p) || this.extremite.depDe4Rec(p) || this.pointMesure.depDe4Rec(p))
}

CMesureAbscisse.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo31') + ' ' + this.pointMesure.getName() + '\n' + getStr('chinfo32') +
    ' (' + this.origine.getName() + ',' + this.extremite.getName() + ')'
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + chaineNombre(this.abscisse, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureAbscisse.prototype.estDefiniParObjDs = function (listeOb) {
  return this.origine.estDefPar(listeOb) &&
  this.extremite.estDefPar(listeOb) &&
  this.pointMesure.estDefPar(listeOb)
}
