/*
 * Created by yvesb on 21/03/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CSurface from '../objets/CSurface'
import CSurfaceAncetre from '../objets/CSurfaceAncetre'
import { getStr } from '../kernel/kernel'
export default CSurface

CSurface.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo60') + ' ' +
    this.bord.getTypeName() + ' ' + this.bord.getName()
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CSurface.prototype.genereNom = function () {
  CSurface.ind++
  return getStr('Surf') + CSurface.ind
}

CSurface.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSurfaceAncetre.prototype.depDe4Rec.call(this, p) ||
    this.bord.depDe4Rec(p))
}

CSurface.prototype.estDefiniParObjDs = function (listeOb) {
  return this.bord.estDefPar(listeOb)
}
