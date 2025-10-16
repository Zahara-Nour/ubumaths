/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuDiscretParVariable from '../objets/CLieuDiscretParVariable'
import CLieuDiscretDeBase from '../objets/CLieuDiscretDeBase'
import { getStr, testToile } from '../kernel/kernel'
export default CLieuDiscretParVariable

CLieuDiscretParVariable.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuPtDis') + ' ' + getStr('of') + ' ' + this.pointATracer.getName() + ' ' +
    getStr('chinfo207') + ' ' + this.variableGeneratrice.nomCalcul
}

CLieuDiscretParVariable.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  let valeur; let i
  const vg = this.variableGeneratrice
  const point1 = this.point1
  const listeElementsAncetres = this.listeElementsAncetres
  point1.donneMotif(this.motif)
  point1.donneCouleur(this.couleur)
  const valeurMinimale = vg.valeurMini
  const valeurMaximale = vg.valeurMaxi
  const valeurInitiale = vg.valeurActuelle
  const pas = (valeurMaximale - valeurMinimale) / (this.nombreDePoints - 1)
  valeur = valeurMinimale
  const nb = this.nombreDePoints - 1
  for (i = 0; i < this.nombreDePoints; i++) {
    valeur = (i === 0) ? valeurMinimale : ((i === nb) ? valeurMaximale : valeur + pas)
    vg.donneValeur(valeur)
    this.listeElementsAncetres.positionne(false, dimf)
    if (this.pointATracer.existe) {
      if (testToile(this.pointATracer.x, this.pointATracer.y)) {
        point1.placeEn(this.pointATracer.x, this.pointATracer.y)
        point1.positionne(false, dimf)
        ch += point1.tikz(dimf, false, coefmult, bu)
      }
    }
  }

  // On redonne à la variable génératrice sa valeur initiale
  vg.donneValeur(valeurInitiale)
  listeElementsAncetres.positionne(false, dimf)
  return ch
}

CLieuDiscretParVariable.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuDiscretDeBase.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.variableGeneratrice.estDefPar(listeOb)
}
