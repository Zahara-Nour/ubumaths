/*
 * Created by yvesb on 28/11/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import CRepere from '../objets/CRepere'
import { chaineNombre, getStr } from '../kernel/kernel'
import CElementLigne from '../objets/CElementLigne'
import RepDlg from '../dialogs/RepDlg'
export default CRepere

/**
 *
 * @returns {string}
 */
CRepere.prototype.getNom = function () {
  return '(' + this.o.getName() + ',' + this.i.getName() + ',' + this.j.getName() + ')'
}
/**
 *
 * @returns {string}
 */
CRepere.prototype.info = function () {
  return getStr('Repere') + ' ' + this.getNom()
}
/**
 *
 * @returns {string}
 */
CRepere.prototype.infoHist = function () {
  let ch = getStr('Repere') + ' ' + this.getNom() + '\n' +
    getStr('OrAbs') + this.abscisseOrigine.chaineInfo() + '\n' +
    getStr('OrOrd') + this.ordonneeOrigine.chaineInfo() + '\n' +
    getStr('Unitex') + this.uniteX.chaineInfo() + '\n' +
    getStr('Unitey') + this.uniteY.chaineInfo()
  if (!this.existe) ch = ch + '\n' + getStr('ch18')
  return ch
}

CRepere.prototype.depDe4Rec = function (p) {
  if (this.elementTestePourDependDePourRec === p) return this.dependDeElementTestePourRec
  return this.memDep4Rec(CElementLigne.prototype.depDe4Rec.call(this, p) ||
    this.o.depDe4Rec(p) || this.i.depDe4Rec(p) || this.j.depDe4Rec(p) ||
    this.abscisseOrigine.depDe4Rec(p) || this.ordonneeOrigine.depDe4Rec(p) ||
    this.uniteX.depDe4Rec(p) || this.uniteY.depDe4Rec(p))
}

CRepere.prototype.modifiableParMenu = function () {
  return !this.estElementFinal
}

CRepere.prototype.modifDlg = function (app, callBack1, callBack2) {
  new RepDlg(app, this, true, callBack1, callBack2)
}

CRepere.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''; let p; let q; let x1; let y1; let ray
  const droiteQuadrillage = this.droiteQuadrillage
  const couleur = this.couleur
  const list = this.listeProprietaire

  if (this.quadrillageVertical) {
    droiteQuadrillage.donneCouleur(couleur)
    droiteQuadrillage.donneStyle(this.style) // Contrairement à la version java les repères ont un style
    if (this.absMaxiV - this.absMiniV <= 80) {
      droiteQuadrillage.vect.x = this.u.x
      droiteQuadrillage.vect.y = this.u.y
      for (p = this.absMiniV; p <= this.absMaxiV; p++) {
        if (p !== 0) {
          droiteQuadrillage.point_x = this.o.x + p * this.v.x
          droiteQuadrillage.point_y = this.o.y + p * this.v.y
          // Les paramètres d'appel ne servent pas.
          droiteQuadrillage.positionne(false, dimf)
          ch += droiteQuadrillage.tikz(dimf, nomaff, coefmult, bu) + '\n'
        }
      }
    }
  }
  if (this.quadrillageHorizontal) {
    droiteQuadrillage.donneCouleur(couleur)
    droiteQuadrillage.donneStyle(this.style)

    if (this.absMaxiH - this.absMiniH <= 80) {
      droiteQuadrillage.vect.x = this.v.x
      droiteQuadrillage.vect.y = this.v.y
      for (p = this.absMiniH; p <= this.absMaxiH; p++) {
        if (p !== 0) {
          droiteQuadrillage.point_x = this.o.x + p * this.u.x
          droiteQuadrillage.point_y = this.o.y + p * this.u.y
          droiteQuadrillage.positionne(false, dimf)
          ch += droiteQuadrillage.tikz(dimf, nomaff, coefmult, bu) + '\n'
        }
      }
    }
  }
  if (this.pointilles) {
    // A revoir. Différent de la version Java
    if ((this.absMaxiH - this.absMiniH <= 80) &&
      (this.absMaxiV - this.absMiniV <= 80)) {
      for (p = this.absMiniH; p <= this.absMaxiH; p++) {
        for (q = this.absMiniV; q <= this.absMaxiV; q++) {
          x1 = this.o.x + p * this.u.x + q * this.v.x
          y1 = this.o.y + p * this.u.y + q * this.v.y
          if (dimf.dansFenetre(x1, y1)) {
            ray = list.tikzLongueur(1, dimf, bu)
            ch += '\\fill[color=' + this.tikzCouleur() + '] (' +
              chaineNombre(list.tikzXcoord(x1, dimf, bu), 3) +
              ',' + chaineNombre(list.tikzYcoord(y1, dimf, bu), 3) + ') circle (' +
              chaineNombre(ray, 3) + ');' + '\n'
          }
        }
      }
    }
  }
  if (ch.endsWith('\n')) ch = ch.substring(0, ch.length - 1)
  return ch
}

CRepere.prototype.estDefiniParObjDs = function (listeOb) {
  return this.o.estDefPar(listeOb) &&
  this.i.estDefPar(listeOb) &&
  this.j.estDefPar(listeOb)
}
