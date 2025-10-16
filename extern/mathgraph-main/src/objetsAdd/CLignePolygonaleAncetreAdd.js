/*
 * Created by yvesb on 17/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { getStr, MAX_VALUE } from '../kernel/kernel'
import CLignePolygonaleAncetre from '../objets/CLignePolygonaleAncetre'
import CElementLigne from '../objets/CElementLigne'

export default CLignePolygonaleAncetre
/**
 * Renvoie une chaînede caractères formée des noms des sommets
 * @returns {string}
 */
CLignePolygonaleAncetre.prototype.nomSommets = function () {
  let stb = ''
  for (let i = 0; i < this.colPoints.length; i++) stb += this.colPoints[i].pointeurSurPoint.getName()
  return stb
}
/**
 *
 * @returns {string}
 */
CLignePolygonaleAncetre.prototype.getNom = function () {
  return getStr('LigneBrisee') + ' ' + this.nomSommets()
}

CLignePolygonaleAncetre.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  let resultat = CElementLigne.prototype.depDe4Rec.call(this, p)
  for (let i = 0; (i < this.colPoints.length) && !resultat; i++) {
    const ptp = this.colPoints[i].pointeurSurPoint
    resultat = resultat || ptp.depDe4Rec(p)
  }
  return this.memDep4Rec(resultat)
}

CLignePolygonaleAncetre.prototype.distancePointPourSurface = function (xp, yp, masquage) {
  let dis
  if (!this.existe) return -1
  else {
    dis = MAX_VALUE
    for (let i = 0; i < this.nombrePoints - 1; i++) {
      this.point1.placeEn(this.absPoints[i], this.ordPoints[i])
      this.point2.placeEn(this.absPoints[i + 1], this.ordPoints[i + 1])
      this.segment.positionne()
      const d = this.segment.distancePoint(xp, yp, true)
      if ((d !== -1) && (d < dis)) dis = d
    }
  }
  if (dis === MAX_VALUE) dis = -1
  return dis
}

CLignePolygonaleAncetre.prototype.distancePoint = function (xp, yp, masquage) {
  if (!(this.existe) || (masquage && this.masque)) return -1
  else return this.distancePointPourSurface(xp, yp, masquage)
}

CLignePolygonaleAncetre.prototype.estDefiniParObjDs = function (listeOb) {
  for (let i = 0; i < this.colPoints.length; i++) {
    if (!this.colPoints[i].pointeurSurPoint.estDefPar(listeOb)) return false
  }
  return true
}
