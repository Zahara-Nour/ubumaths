/*
 * Created by yvesb on 23/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CIntDroiteDroite from '../objets/CIntDroiteDroite'
import CPt from '../objets/CPt'
import { getStr } from '../kernel/kernel'
export default CIntDroiteDroite

CIntDroiteDroite.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo193') + ' ' + this.droite1.getTypeName() + ' ' +
    this.droite1.getNom() + ' ' + getStr('chinfo194') + ' ' +
    this.droite2.getTypeName() + ' ' + this.droite2.getNom()
}

CIntDroiteDroite.prototype.appartientDroiteParDefinition = function (droite) {
  // Modifié version 6.9.1
  // return CPt.prototype.appartientDroiteParDefinition.call(this, droite) || (droite === this.droite1) || (droite === this.droite2)
  // CPt.prototype.appartientDroiteParDefinition.call renvoie true si la droite contient this par définition
  return (droite === this.droite1) || (droite === this.droite2) || CPt.prototype.appartientDroiteParDefinition.call(this, droite)
}

CIntDroiteDroite.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPt.prototype.depDe4Rec.call(this, p) ||
    this.droite1.depDe4Rec(p) || this.droite2.depDe4Rec(p))
}

CIntDroiteDroite.prototype.estDefiniParObjDs = function (listeOb) {
  return this.droite1.estDefPar(listeOb) &&
  this.droite2.estDefPar(listeOb)
}
