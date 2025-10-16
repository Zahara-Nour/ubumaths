/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CLieuDiscretParPointLie from '../objets/CLieuDiscretParPointLie'
import CLieuDiscretDeBase from '../objets/CLieuDiscretDeBase'
import { getStr, testToile } from '../kernel/kernel'
export default CLieuDiscretParPointLie

CLieuDiscretParPointLie.prototype.infoHist = function () {
  return this.getName() + ' : ' + getStr('LieuPtDis') + ' ' + getStr('of') + ' ' + this.pointATracer.getName() +
    ' ' + getStr('chinfo207') + ' ' + this.pointLieGenerateur.getName()
}

CLieuDiscretParPointLie.prototype.estGenereParPointLie = function (pointlie) {
  return this.pointLieGenerateur === pointlie
}

CLieuDiscretParPointLie.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let ch = ''
  let abscisseMini, abscisseMaxi, abscisse, pas, abscisseFinale, d, nbValeurs
  const point1 = this.point1
  const plg = this.pointLieGenerateur
  const listeElementsAncetres = this.listeElementsAncetres
  point1.donneMotif(this.motif)
  point1.donneCouleur(this.couleur)

  abscisseMini = plg.abscisseMinimale()
  abscisseMaxi = plg.abscisseMaximale()
  // On range dans l'ordre croissant
  if (abscisseMini > abscisseMaxi) {
    d = abscisseMini
    abscisseMini = abscisseMaxi
    abscisseMaxi = d
  }
  const abscisseInitiale = plg.abscisse
  // Modification pour la version 1.9.5
  if (plg.lieALigneFermee()) {
    nbValeurs = this.nombreDePoints
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi - pas
  } else {
    nbValeurs = this.nombreDePoints - 1
    pas = (abscisseMaxi - abscisseMini) / nbValeurs
    abscisseFinale = abscisseMaxi
  }
  abscisse = abscisseMini - pas
  const nb = this.nombreDePoints - 1
  for (let i = 0; i < this.nombreDePoints; i++) {
    abscisse = (i === 0) ? abscisseMini : ((i === nb) ? abscisseFinale : abscisse + pas)
    plg.donneAbscisse(abscisse)
    listeElementsAncetres.positionne(false, dimf)
    if (this.pointATracer.existe) {
      if (testToile(this.pointATracer.x, this.pointATracer.y)) {
        point1.placeEn(this.pointATracer.x, this.pointATracer.y)
        point1.positionne(false, dimf)
        ch += point1.tikz(dimf, false, coefmult, bu)
      }
    }
  }

  // On  remet le point ancêtre à sa position initiale
  plg.donneAbscisse(abscisseInitiale)
  listeElementsAncetres.positionne(false, dimf)
  return ch
}

CLieuDiscretParPointLie.prototype.estDefiniParObjDs = function (listeOb) {
  return CLieuDiscretDeBase.prototype.estDefiniParObjDs.call(this, listeOb) &&
  this.pointLieGenerateur.estDefPar(listeOb)
}
