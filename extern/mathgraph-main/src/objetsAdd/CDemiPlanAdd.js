/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CDemiPlan from '../objets/CDemiPlan'
import CSurface from '../objets/CSurface'
import { chaineNombre, getStr } from '../kernel/kernel'
export default CDemiPlan

CDemiPlan.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('DemiPlan') + ' ' + getStr('bord') + ' ' +
    this.bord.getNom() + ' ' + getStr('chinfo196') + ' ' + this.pointDemiPlan.getName()
}

CDemiPlan.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else return this.bord.distancePointPourDemiPlan(xp, yp)
}

CDemiPlan.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CSurface.prototype.depDe4Rec.call(this, p) || this.pointDemiPlan.depDe4Rec(p))
}

/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CDemiPlan.prototype.genereNom = function () {
  CDemiPlan.ind++
  return getStr('rdplan') + CDemiPlan.ind
}

CDemiPlan.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  let ch = '\\fill' + this.tikzFillStyle()
  const nbPtsBord = this.nbPtsBord
  for (let i = 0; i < nbPtsBord; i++) {
    ch += '(' + chaineNombre(list.tikzXcoord(this.absPtsBord[i], dimf, bu), 3) + ',' +
      chaineNombre(list.tikzYcoord(this.ordPtsBord[i], dimf, bu), 3)
    if (i < nbPtsBord - 1) ch += ')--'
    else ch += ')--cycle;'
  }
  return ch
}

CDemiPlan.prototype.estDefiniParObjDs = function (listeOb) {
  return CSurface.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.pointDemiPlan.estDefPar(listeOb)
}
