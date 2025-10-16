/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CInversion from '../objets/CInversion'
import CHomothetie from '../objets/CHomothetie'
import { getStr } from '../kernel/kernel'
export default CInversion

CInversion.prototype.complementInfo = function () {
  return ' ' + getStr('Inv') + ' ' + getStr('chinfo202') + ' ' + this.centre.getName() + ' ' +
    getStr('chinfo28') + ' ' + this.rapport.chaineInfo()
}

CInversion.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  const resultat = CHomothetie.prototype.depDe4Rec.call(this, p)
  if (this.listeProprietaire.pointeurLongueurUnite === null) { return this.memDep4Rec(resultat) } else return this.memDep4Rec(resultat || (this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p)))
}

CInversion.prototype.ajouteAntecedents = function (list) {
  list.add(this.centre)
}
