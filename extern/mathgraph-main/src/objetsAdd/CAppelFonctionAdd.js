/*
 * Created by yvesb on 20/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

// import CAppelFonction from '../objets/CAppelFonction'
import CAppelFonction from '../objets/CAppelFonction'
import CCb from '../objets/CCb'
// export default CAppelFonction
export default CAppelFonction

CAppelFonction.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) ||
    this.fonctionAssociee.depDe4Rec(p) || this.operande.depDe4Rec(p))
}

CAppelFonction.prototype.estDefiniParObjDs = function (listeOb) {
  return this.fonctionAssociee.estDefPar(listeOb) && this.operande.estDefiniParObjDs(listeOb)
}

// Ajout version 6.3.0. Utilisé pour les créations de contructions
CAppelFonction.prototype.estConstantPourConst = function () {
  return this.fonctionAssociee.estConstantPourConst() && this.operande.estConstantPourConst()
}
