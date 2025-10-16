/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPointLieDroite from '../objets/CPointLieDroite'
import CPointLie from '../objets/CPointLie'
import { getStr } from '../kernel/kernel'
import CPt from 'src/objets/CPt'
export default CPointLieDroite

CPointLieDroite.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo2') + ' ' +
    this.droiteLiee.getTypeName() + ' ' + this.droiteLiee.getNom()
}

CPointLieDroite.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CPointLie.prototype.depDe4Rec.call(this, p) ||
    this.droiteLiee.depDe4Rec(p))
}

/**
 * Renvoie l'objet auquel le point est lié
 * @returns {CDroiteAncetre}
 */
CPointLieDroite.prototype.lieA = function () {
  return this.droiteLiee
}

CPointLieDroite.prototype.appartientDroiteParDefinition = function (droite) {
  // Modifié version 6.9.1
  // CPt.prototype.appartientDroiteParDefinition.call renvoie true si la droite contient this par définition
  return (droite === this.droiteLiee) || CPt.prototype.appartientDroiteParDefinition.call(this, droite)
}

CPointLieDroite.prototype.estDefiniParObjDs = function (listeOb) {
  return this.droiteLiee.estDefPar(listeOb)
}
