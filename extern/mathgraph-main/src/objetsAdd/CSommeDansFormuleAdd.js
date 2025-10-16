/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CSommeDansFormule from '../objets/CSommeDansFormule'
import CCb from '../objets/CCb'
export default CSommeDansFormule

CSommeDansFormule.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep(CCb.prototype.depDe4Rec.call(this, p) ||
    this.calculASommer.depDe4Rec(p) || this.indiceDebut.depDe4Rec(p) || this.indiceFin.depDe4Rec(p) ||
    this.pas.depDe4Rec(p))
}

CSommeDansFormule.prototype.estDefiniParObjDs = function (listeOb) {
  return this.calculASommer.estDefiniParObjDs(listeOb) &&
  this.indiceDebut.estDefiniParObjDs(listeOb) &&
  this.indiceFin.estDefiniParObjDs(listeOb) &&
  this.pas.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CSommeDansFormule.prototype.estConstantPourConst = function () {
  // Modifié version 7.0
  // Renvoie false
  /*
  return this.calculASommer.estConstantPourConst() && this.indiceDebut.estConstantPourConst() &&
    this.indiceFin.estConstantPourConst() && this.pas.estConstantPourConst()
   */
  return false
}
