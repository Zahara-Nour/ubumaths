/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMesureLongueurLigne from '../objets/CMesureLongueurLigne'
import { chaineNombre, getStr } from '../kernel/kernel'
import CCalculAncetre from '../objets/CCalculAncetre'
export default CMesureLongueurLigne

CMesureLongueurLigne.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCalculAncetre.prototype.depDe4Rec.call(this, p) ||
    this.ligneAssociee.depDe4Rec(p) || this.listeProprietaire.pointeurLongueurUnite.depDe4Rec(p))
}

CMesureLongueurLigne.prototype.utiliseLongueurUnite = function () {
  return true
}

CMesureLongueurLigne.prototype.infoHist = function () {
  let ch = this.getNom() + ' : ' + getStr('chinfo73') + ' ' + getStr('chinfo74') + ' ' + this.ligneAssociee.nomSommets()
  if (this.existe) ch = ch + '\n' + getStr('chinfo97') + ' ' + chaineNombre(this.longueur, 12)
  else ch = ch + '\n' + getStr('ch18')
  return ch
}

CMesureLongueurLigne.prototype.estDefiniParObjDs = function (listeOb) {
  return this.ligneAssociee.estDefPar(listeOb)
}
