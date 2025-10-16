/*
 * Created by yvesb on 16/12/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CArcDeCercle from '../objets/CArcDeCercle'
import AngleArcDlg from '../dialogs/AngleArcDlg'
import { chaineNombre, ConvRadDeg, distancePointPoint, getStr, mesurePrincipale } from '../kernel/kernel'
import CArcDeCercleAncetre from '../objets/CArcDeCercleAncetre'
import Vect from '../types/Vect'

export default CArcDeCercle

CArcDeCercle.prototype.modifiableParMenu = function () {
  return !this.estElementFinal && (this.pointFinArc === null)
}

CArcDeCercle.prototype.modifDlg = function (app, callBack1, callBack2) {
  new AngleArcDlg(app, this, true, callBack1, callBack2)
}

CArcDeCercle.prototype.infoHist = function () {
  let ch = this.getName() + ' : ' + getStr('ArcPetit')
  ch += ' ' + getStr('chinfo202') + ' ' + this.o.getName() + ' ' + getStr('chinfo203') + ' ' + this.a.getName()
  if (this.pointFinArc !== null) ch += ' ' + getStr('chinfo204') + ' ' + this.pointFinArc.getName()
  else ch += getStr('chinfo205') + ' ' + this.angleAuCentre.chaineInfo()
  return ch
}
CArcDeCercle.prototype.contientParDefinition = function (po) {
  return (this.a === po)
}
CArcDeCercle.prototype.distancePointPourSurface = function (xp, yp) {
  if (!this.existe) return -1
  else {
    const appSecteur = this.surArc(xp, yp)
    if (!appSecteur) return -1
    else return Math.abs(distancePointPoint(this.centreX, this.centreY, xp, yp) - this.rayon)
  }
}
CArcDeCercle.prototype.distancePoint = function (xp, yp, masquage) {
  if (!this.existe || (masquage && this.masque)) return -1
  else return this.distancePointPourSurface(xp, yp, masquage)
}
CArcDeCercle.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  if (this.pointFinArc === null) {
    return this.memDep4Rec(CArcDeCercleAncetre.prototype.depDe4Rec.call(this, p) ||
      this.o.depDe4Rec(p) || this.a.depDe4Rec(p) || this.angleAuCentre.depDe4Rec(p))
  } else {
    return this.memDep4Rec(CArcDeCercleAncetre.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.a.depDe4Rec(p) || this.pointFinArc.depDe4Rec(p))
  }
}

CArcDeCercle.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const list = this.listeProprietaire
  const x1 = list.tikzXcoord(this.a.x, dimf, bu)
  const y1 = list.tikzYcoord(this.a.y, dimf, bu)
  const ray = list.tikzLongueur(this.rayon, dimf, bu)
  const u = new Vect(this.centreX, this.centreY, this.origine_x, this.origine_y)
  let ang1 = u.angleRad()
  let ang2 = ang1 + this.valeurAngleAuCentre
  if (ang2 < 0) ang2 = ang2 + 2 * Math.PI
  if (ang2 >= 2 * Math.PI) ang2 = ang2 - 2 * Math.PI
  const dif = mesurePrincipale(ang2 - ang1)
  if (dif > 0) {
    if (ang2 < ang1) ang2 = ang2 + 2 * Math.PI
  } else {
    if (ang2 > ang1) ang2 = ang2 - 2 * Math.PI
  }

  ang1 *= ConvRadDeg
  ang2 *= ConvRadDeg
  return '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '(' + chaineNombre(x1, 3) + ',' + chaineNombre(y1, 3) + ') arc ' +
    '(' + chaineNombre(ang1, 3) + ' : ' + chaineNombre(ang2, 3) + ' : ' + chaineNombre(ray, 3) + ');'
}

CArcDeCercle.prototype.estDefiniParObjDs = function (listeOb) {
  if (this.pointFinArc == null) {
    return this.o.estDefPar(listeOb) &&
    this.a.estDefPar(listeOb) &&
    this.angleAuCentre.estDefiniParObjDs(listeOb)
  } else {
    return this.o.estDefPar(listeOb) &&
    this.a.estDefPar(listeOb) &&
    this.pointFinArc.estDefPar(listeOb)
  }
}
