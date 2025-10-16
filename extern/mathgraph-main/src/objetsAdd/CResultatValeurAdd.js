/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CResultatValeur from '../objets/CResultatValeur'
import CCb from '../objets/CCb'
export default CResultatValeur

CResultatValeur.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CCb.prototype.depDe4Rec.call(this, p) ||
    this.valeurAssociee.depDe4Rec(p))
}

CResultatValeur.prototype.estDefiniParObjDs = function (listeOb) {
  // Modification version 6.3.0
  // return this.valeurAssociee.estDefPar(listeOb);
  const val = this.valeurAssociee
  return listeOb.contains(val) || val.estDefPar(listeOb)
}

/**
 * Rajout version 6.3.0. Utilisé par les outils OutilChoixFinGraphConst et OutilFinirConst
 * @returns {boolean}
 */
CResultatValeur.prototype.estConstantPourConst = function () {
  // Ligne suivante ajouté version 6.7.0
  if (this.valeurAssociee.estMatrice()) return false
  return this.valeurAssociee.estConstantPourConst()
}
