/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CGrapheSuiteRec from '../objets/CGrapheSuiteRec'
import CElementLigne from '../objets/CElementLigne'
import GrapheSuiteRecDlg from '../dialogs/GrapheSuiteRecDlg'
import CSegment from '../objets/CSegment'
import { getStr } from '../kernel/kernel'
export default CGrapheSuiteRec

CGrapheSuiteRec.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo88') + ' ' + this.suiteAssociee.nomCalcul + ' ' +
    getStr('chinfo32') + ' ' + this.repereAssocie.getNom()
}

CGrapheSuiteRec.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist, i
  if (!this.existe || (masquage && this.masque)) return -1
  for (i = 1; i <= this.suiteAssociee.indiceDernierTermeExistant; i++) {
    if (i === 1) {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[0])
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[1])
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[1])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[1])
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      this.seg.positionne(false, this.dimf)
      dist = this.seg.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
      if (this.traitsDeRappelSurAbscisses) {
        this.point1.abs.donneValeur(this.suiteAssociee.valeurs[0])
        this.point1.ord.donneValeur(0)
        this.point2.abs.donneValeur(this.suiteAssociee.valeurs[0])
        this.point2.ord.donneValeur(this.suiteAssociee.valeurs[1])
        this.point1.positionne(false, this.dimf)
        this.point2.positionne(false, this.dimf)
        this.seg.positionne(false, this.dimf)
        dist = this.seg.distancePoint(xp, yp, masquage)
        if ((dist !== -1) && (dist < distmin)) return dist
      }
    } else {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i - 1])
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i - 1])
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i - 1])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      this.seg.positionne(false, this.dimf)
      dist = this.seg.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i - 1])
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      this.seg.positionne(false, this.dimf)
      dist = this.seg.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
    if (this.traitsDeRappelSurAbscisses) {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i])
      this.point1.ord.donneValeur(0)
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i])
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i])
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      this.seg.positionne(false, this.dimf)
      dist = this.seg.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
  }
  return -1
}

CGrapheSuiteRec.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementLigne.prototype.depDe4Rec.call(this, p) ||
    this.suiteAssociee.depDe4Rec(p) || this.repereAssocie.depDe4Rec(p))
}

CGrapheSuiteRec.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CGrapheSuiteRec.prototype.modifDlg = function (app, callBack1, callBack2) {
  new GrapheSuiteRecDlg(app, this, true, true, callBack1, callBack2)
}

/**
 * Fonction appelée par l'outil de création de graphe de suite récurrente
 * et associant aux points utilisés de façon interne le repère
 */
CGrapheSuiteRec.prototype.updateObjetsInternes = function () {
  const rep = this.repereAssocie
  this.point1.rep = rep
  this.point2.rep = rep
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CGrapheSuiteRec.prototype.genereNom = function () {
  CGrapheSuiteRec.ind++
  return getStr('rgsr') + CGrapheSuiteRec.ind
}

CGrapheSuiteRec.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  const point1 = this.point1
  const point2 = this.point2
  const seg = new CSegment(this.listeProprietaire, null, false, this.couleur, false, this.style, point1, point2)
  const suiteAssociee = this.suiteAssociee
  seg.donneCouleur(this.couleur)
  seg.donneStyle(this.style)
  for (let i = 1; i <= this.suiteAssociee.indiceDernierTermeExistant; i++) {
    if (i === 1) {
      point1.abs.donneValeur(suiteAssociee.valeurs[0])
      point1.ord.donneValeur(suiteAssociee.valeurs[1])
      point2.abs.donneValeur(suiteAssociee.valeurs[1])
      point2.ord.donneValeur(suiteAssociee.valeurs[1])
      point1.positionne(false, dimf)
      point2.positionne(false, dimf)
      seg.positionne(false, dimf)
      if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, nomaff, coefmult, bu) + '\n'
      if (this.traitsDeRappelSurAbscisses) {
        point1.abs.donneValeur(suiteAssociee.valeurs[0])
        point1.ord.donneValeur(0)
        point2.abs.donneValeur(suiteAssociee.valeurs[0])
        point2.ord.donneValeur(suiteAssociee.valeurs[1])
        point1.positionne(false, dimf)
        point2.positionne(false, dimf)
        seg.positionne(false, dimf)
        if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, false, coefmult, bu) + '\n'
      }
    } else {
      point1.abs.donneValeur(suiteAssociee.valeurs[i - 1])
      point1.ord.donneValeur(suiteAssociee.valeurs[i - 1])
      point2.abs.donneValeur(suiteAssociee.valeurs[i - 1])
      point2.ord.donneValeur(suiteAssociee.valeurs[i])
      point1.positionne(false, dimf)
      point2.positionne(false, dimf)
      seg.positionne(false, dimf)
      if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, nomaff, coefmult, bu) + '\n'
      point1.abs.donneValeur(suiteAssociee.valeurs[i - 1])
      point1.ord.donneValeur(suiteAssociee.valeurs[i])
      point2.abs.donneValeur(suiteAssociee.valeurs[i])
      point2.ord.donneValeur(suiteAssociee.valeurs[i])
      point1.positionne(false, dimf)
      point2.positionne(false, dimf)
      seg.positionne(false, dimf)
      if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, false, coefmult, bu) + '\n'
    }
    if (this.traitsDeRappelSurAbscisses) {
      point1.abs.donneValeur(suiteAssociee.valeurs[i])
      point1.ord.donneValeur(0)
      point2.abs.donneValeur(suiteAssociee.valeurs[i])
      point2.ord.donneValeur(suiteAssociee.valeurs[i])
      point1.positionne(false, dimf)
      point2.positionne(false, dimf)
      seg.positionne(false, dimf)
      if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, false, coefmult, bu) + '\n'
    }
  }
  return ch
}

CGrapheSuiteRec.prototype.estDefiniParObjDs = function (listeOb) {
  return this.suiteAssociee.estDefPar(listeOb) &&
  this.repereAssocie.estDefPar(listeOb)
}
