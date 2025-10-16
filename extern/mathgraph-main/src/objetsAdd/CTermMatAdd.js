/*
 * Created by yvesb on 01/06/2021.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CTermMat from '../objets/CTermMat'
import CCb from '../objets/CCb'
export default CTermMat

CTermMat.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) || this.operande1.depDe4Rec(p)) ||
    this.operande2.depDe4Rec(p) || this.mat.depDe4Rec(p)
}

CTermMat.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande1.estDefiniParObjDs(listeOb) && this.operande2.estDefiniParObjDs(listeOb) &&
    this.mat.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CTermMat.prototype.estConstantPourConst = function () {
  // Ligne suivante corrigée version 7.0
  // return this.operande1.estConstantPourConst() && this.operande2.estConstantPourConst() && this.mat.estConstantPourConst()
  return false
}
