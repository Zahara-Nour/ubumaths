/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLieCercle from '../objets/CPointLieCercle'
import CPointLie from '../objets/CPointLie'
import { getStr } from '../kernel/kernel'
import CPt from 'src/objets/CPt'
export default CPointLieCercle

CPointLieCercle.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo2') + ' ' +
    this.cercleLie.getTypeName() + ' ' + this.cercleLie.getName()
}

CPointLieCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPointLie.prototype.depDe4Rec.call(this, p) ||
    this.cercleLie.depDe4Rec(p))
}

CPointLieCercle.prototype.lieA = function () {
  return this.cercleLie
}

/* Modifié version 6.9.1 car incohérent
CPointLieCercle.prototype.appartientDroiteParDefinition = function (droite) {
  return CPointLie.prototype.appartientDroiteParDefinition.call(this, droite) || (this.cercleLie === droite)
}
 */

CPointLieCercle.prototype.appartientCercleParDefinition = function (cercle) {
  // Necessité d'appler CPt.prototype.appartientCercleParDefinition contrairement aux CPointLieDroite
  // CPt.prototype.appartientCercleParDefinition.call renvoie true si le cercle contient this par définition
  // Et vérifie aussi une propriété des intersections de cercles
  return CPt.prototype.appartientCercleParDefinition.call(this, cercle) || (this.cercleLie === cercle)
}

CPointLieCercle.prototype.estDefiniParObjDs = function (listeOb) {
  return this.cercleLie.estDefPar(listeOb)
}
