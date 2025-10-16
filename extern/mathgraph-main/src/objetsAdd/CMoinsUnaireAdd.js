/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CMoinsUnaire from '../objets/CMoinsUnaire'
import CCb from '../objets/CCb'
export default CMoinsUnaire

CMoinsUnaire.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) ||
    this.operande.depDe4Rec(p))
}

CMoinsUnaire.prototype.estDefiniParObjDs = function (listeOb) {
  return this.operande.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CMoinsUnaire.prototype.estConstantPourConst = function () {
  return this.operande.estConstantPourConst()
}
