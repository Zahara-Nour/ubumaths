/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CGrapheSuiteRecComplexe from '../objets/CGrapheSuiteRecComplexe'
import CElementLigne from '../objets/CElementLigne'
import CSegment from '../objets/CSegment'
import { getStr } from '../kernel/kernel'
import GrapheSuiteRecDlg from '../dialogs/GrapheSuiteRecDlg'
export default CGrapheSuiteRecComplexe

CGrapheSuiteRecComplexe.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('chinfo90') + ' ' + this.suiteAssociee.nomCalcul + ' ' +
    getStr('chinfo32') + ' ' + this.repereAssocie.getNom()
}

CGrapheSuiteRecComplexe.prototype.distancePoint = function (xp, yp, masquage, distmin) {
  let dist, i
  if (!this.existe || (masquage && this.masque)) return -1
  if (this.pointsRelies) {
    for (i = 0; i <= this.suiteAssociee.indiceDernierTermeExistant - 1; i++) {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i].x)
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i].y)
      this.point2.abs.donneValeur(this.suiteAssociee.valeurs[i + 1].x)
      this.point2.ord.donneValeur(this.suiteAssociee.valeurs[i + 1].y)
      this.point1.positionne(false, this.dimf)
      this.point2.positionne(false, this.dimf)
      this.seg.positionne(false, this.dimf)
      dist = this.seg.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
  } else {
    for (i = 0; i <= this.suiteAssociee.indiceDernierTermeExistant; i++) {
      this.point1.abs.donneValeur(this.suiteAssociee.valeurs[i].x)
      this.point1.ord.donneValeur(this.suiteAssociee.valeurs[i].y)
      this.point1.positionne(false, this.dimf)
      dist = this.point1.distancePoint(xp, yp, masquage)
      if ((dist !== -1) && (dist < distmin)) return dist
    }
  }
  return -1
}

CGrapheSuiteRecComplexe.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CGrapheSuiteRecComplexe.prototype.modifDlg = function (app, callBack1, callBack2) {
  new GrapheSuiteRecDlg(app, this, false, true, callBack1, callBack2)
}

CGrapheSuiteRecComplexe.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementLigne.prototype.depDe4Rec.call(this, p) ||
    this.suiteAssociee.depDe4Rec(p) || this.repereAssocie.depDe4Rec(p))
}

/**
 * Fonction appelée par l'outil de création de graphe de suite récurrente complexe
 * et associant aux points utilisés de façon interne le repère
 */
CGrapheSuiteRecComplexe.prototype.updateObjetsInternes = function () {
  const rep = this.repereAssocie
  this.point1.rep = rep
  this.point2.rep = rep
  this.point1.motif = this.motif
  this.point1.couleur = this.couleur
}

// Modifié par rapport à la version Java
/**
 * Fonction utilisée pour générer un nom pour le protocole de la figure
 * @returns {string}Le nom généré
 */
CGrapheSuiteRecComplexe.prototype.genereNom = function () {
  CGrapheSuiteRecComplexe.ind++
  return getStr('rgsc') + CGrapheSuiteRecComplexe.ind
}

CGrapheSuiteRecComplexe.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  const point1 = this.point1
  const point2 = this.point2
  const seg = new CSegment(this.listeProprietaire, null, false, this.couleur, false, this.style, point1, point2)
  const suiteAssociee = this.suiteAssociee
  let ch = ''
  seg.donneCouleur(this.couleur)
  seg.donneStyle(this.style)
  point1.donneMotif(this.motif)
  point1.donneCouleur(this.couleur)

  for (let i = 0; i <= suiteAssociee.indiceDernierTermeExistant; i++) {
    point1.abs.donneValeur(suiteAssociee.valeurs[i].x)
    point1.ord.donneValeur(suiteAssociee.valeurs[i].y)
    point1.positionne(false, dimf)
    ch += point1.tikz(dimf, nomaff, coefmult, bu) + '\n'
    if (this.pointsRelies && i !== suiteAssociee.indiceDernierTermeExistant) {
      point2.abs.donneValeur(suiteAssociee.valeurs[i + 1].x)
      point2.ord.donneValeur(suiteAssociee.valeurs[i + 1].y)
      point2.positionne(false, dimf)
      seg.positionne(false, dimf)
      if (seg.existe && !seg.horsFenetre) ch += seg.tikz(dimf, nomaff, coefmult, bu) + '\n'
    }
  }
  if (ch.endsWith('\n')) ch = ch.substring(0, ch.length - 1)
  return ch
}

CGrapheSuiteRecComplexe.prototype.estDefiniParObjDs = function (listeOb) {
  return this.repereAssocie.estDefPar(listeOb) &&
  this.suiteAssociee.estDefPar(listeOb)
}
