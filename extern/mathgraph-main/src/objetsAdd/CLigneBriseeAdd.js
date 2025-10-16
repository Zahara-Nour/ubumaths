/*
 * Created by yvesb on 29/05/2017.
 */
/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre, getStr } from '../kernel/kernel'
import CLigneBrisee from '../objets/CLigneBrisee'
import NatObj from 'src/types/NatObj'
import { appartientSegment } from '../kernel/kernelVect'
export default CLigneBrisee

/**
 * Fonction renvoyant la nature de l'objet (par exemple point, droite, cercle)
 * @returns {string}
 */
CLigneBrisee.prototype.getTypeName = function () {
  return getStr('LigneBrisee')
}

CLigneBrisee.prototype.infoHist = function () {
  return getStr('LigneBrisee') + ' ' + this.nomSommets()
}

CLigneBrisee.prototype.tikz = function (dimf, nomaff, coefmult, bu) {
  let i, x, y
  const list = this.listeProprietaire
  let ch = '\\draw ' + this.tikzLineStyle(dimf, coefmult) + '('
  const nombrePoints = this.nombrePoints
  for (i = 0; i < nombrePoints - 1; i++) {
    x = list.tikzXcoord(this.absPoints[i], dimf, bu)
    y = list.tikzYcoord(this.ordPoints[i], dimf, bu)
    ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ')--('
  }
  i = nombrePoints - 1
  x = list.tikzXcoord(this.absPoints[i], dimf, bu)
  y = list.tikzYcoord(this.ordPoints[i], dimf, bu)
  ch += chaineNombre(x, 3) + ',' + chaineNombre(y, 3) + ');'
  return ch
}
// Ajout version 9.1 pour pouvoir accepter comme confondues des lignes brisées
// comportant des points inutiles lors des exercices de construction
CLigneBrisee.prototype.getMinColPoints = function () {
  const colclone = [...this.colPoints] // Copie de this.colPoints
  // On va retirer de cette copie les points situés sur un segment formé par les points qui l'encadrent
  let i = 1
  while (i < colclone.length - 1) {
    const ptact = colclone[i].pointeurSurPoint
    const ptprec = colclone[i - 1].pointeurSurPoint
    const ptnext = colclone[i + 1].pointeurSurPoint
    if (appartientSegment(ptact.x, ptact.y, ptprec.x, ptprec.y, ptnext.x, ptnext.y)) {
      colclone.splice(i, 1)
    } else i++
  }
  return colclone
}
CLigneBrisee.prototype.coincideAvec = function (p) {
  let ptp1, ptp2, resultat
  if (p.getNature() !== NatObj.NLigneBrisee) return false
  const colPoints1 = this.getMinColPoints()
  const colPoints2 = p.getMinColPoints()
  if (colPoints1.length !== colPoints2.length) return false
  const nbPoints = colPoints1.length
  // On regarde si les lignes brisées dans lesquelles on a suppriméles points inutiles ont bien les mêmes points dans le même
  // ordre ou dans l'ordre inverse
  resultat = true
  for (let i = 0; i < nbPoints; i++) {
    ptp1 = colPoints1[i].pointeurSurPoint
    ptp2 = colPoints2[i].pointeurSurPoint
    resultat = ptp1.coincideAvec(ptp2)
    if (!resultat) break
  }
  if (resultat) return true
  resultat = true
  for (let i = 0; i < nbPoints; i++) {
    ptp1 = colPoints1[i].pointeurSurPoint
    ptp2 = colPoints2[(nbPoints - i - 1)].pointeurSurPoint
    resultat = ptp1.coincideAvec(ptp2)
    if (!resultat) return false
  }
  return true
}
