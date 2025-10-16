/*
 * Created by yvesb on 10/10/2016.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import CPolygone from '../objets/CPolygone'
import { chaineNombre, getStr, zero } from '../kernel/kernel'
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
export default CPolygone

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CPolygone.prototype.getTypeName = function () {
  return getStr('Polygone')
}

CPolygone.prototype.infoHist = function () {
  return getStr('Polygone') + ' ' + this.nomSommetsPolygone()
}

CPolygone.prototype.nomSommetsPolygone = function () {
  let stb = ''
  for (let i = 0; i < this.nombrePoints - 1; i++) stb += this.colPoints[i].pointeurSurPoint.nom
  return stb
}

CPolygone.prototype.coincideAvec = function (p) {
  let ptp1, ptp2, i, j, resultat
  if (p.getNature() !== NatObj.NPolygone) return false
  let nombrePoints = this.colPoints.length
  if (nombrePoints !== p.colPoints.length) return false
  // On regarde si un polynôme a déjà été créé avec les mêmes sommets
  // dans le  même ordre. On ne regarde pas le dernier sommet qui
  // est le même que le premier}
  nombrePoints--
  j = 0
  do {
    resultat = true
    i = 0
    while (resultat && (i <= nombrePoints - 1)) {
      ptp1 = this.colPoints[i].pointeurSurPoint
      ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
      resultat = ptp1.coincideAvec(ptp2)
      i++
    }
    j++
  }
  while ((j !== nombrePoints) && !resultat)

  if (resultat) return true
  // On regarde en tournant dans l'autre sens
  j = 0
  do {
    resultat = true
    i = 0
    while (resultat && (i <= nombrePoints - 1)) {
      ptp1 = this.colPoints[nombrePoints - 1 - i].pointeurSurPoint
      ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
      resultat = ptp1.coincideAvec(ptp2)
      i++
    }
    j++
  }
  while ((j !== nombrePoints) && !resultat)
  return resultat
}
/**
 *
 * @returns {string}
 */
CPolygone.prototype.getNom = function () {
  return getStr('Polygone') + ' ' + this.nomSommets()
}
/**
 * Fonction renvoyant true si this a des côtés de même longueurs que p (qui doit être un polygone)
 * Sert uniquement pout certains exercices de construction
 * @param {CElementGraphique} p
 * @returns {boolean}
 */
CPolygone.prototype.isIsomTo = function (p) {
  let ptp0, ptp1, ptp2, ptp3, vect1, vect2, norm1, norm2, i, j, resultat
  function nomsEgaux (p0, p1, p2, p3) {
    return ((p0.nom === p2.nom) && (p1.nom === p3.nom)) || ((p0.nom === p3.nom) && (p1.nom === p2.nom))
  }
  if (p.getNature() !== NatObj.NPolygone) return false
  let nombrePoints = this.colPoints.length
  if (nombrePoints !== p.colPoints.length) return false
  nombrePoints--
  j = 0
  do {
    resultat = true
    i = 0
    while (resultat && (i <= nombrePoints)) {
      ptp0 = this.colPoints[i].pointeurSurPoint
      ptp1 = this.colPoints[(i + 1) % nombrePoints].pointeurSurPoint
      ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
      ptp3 = p.colPoints[(i + j + 1) % nombrePoints].pointeurSurPoint
      vect1 = new Vect(ptp0, ptp1)
      vect2 = new Vect(ptp2, ptp3)
      norm1 = vect1.norme()
      norm2 = vect2.norme()
      resultat = nomsEgaux(ptp0, ptp1, ptp2, ptp3) && zero(Math.abs(norm1 - norm2))
      i++
    }
    j++
  }
  while ((j !== nombrePoints) && !resultat)
  if (resultat) return true
  // On regarde en tournant dans l'autre sens
  j = 0
  do {
    resultat = true
    i = 0
    while (resultat && (i <= nombrePoints)) {
      ptp0 = this.colPoints[(2 * nombrePoints - 1 - i) % nombrePoints].pointeurSurPoint
      ptp1 = this.colPoints[(2 * nombrePoints - 2 - i) % nombrePoints].pointeurSurPoint
      ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
      ptp3 = p.colPoints[(i + j + 1) % nombrePoints].pointeurSurPoint
      vect1 = new Vect(ptp0, ptp1)
      vect2 = new Vect(ptp2, ptp3)
      norm1 = vect1.norme()
      norm2 = vect2.norme()
      resultat = nomsEgaux(ptp0, ptp1, ptp2, ptp3) && zero(Math.abs(norm1 - norm2))
      i++
    }
    j++
  }
  while ((j !== nombrePoints) && !resultat)
  return resultat
}

CPolygone.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let i; let x; let y
  const list = this.listeProprietaire
  let ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '('
  for (i = 0; i < this.nombrePoints - 1; i++) {
    x = list.tikzXcoord(this.absPoints[i], dimf, bu)
    y = list.tikzYcoord(this.ordPoints[i], dimf, bu)
    ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ')--('
  }
  i = this.nombrePoints - 1
  x = list.tikzXcoord(this.absPoints[i], dimf, bu)
  y = list.tikzYcoord(this.ordPoints[i], dimf, bu)
  ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ')--cycle;'
  return ch
}
