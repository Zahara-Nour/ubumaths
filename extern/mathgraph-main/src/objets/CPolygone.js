/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import Vect from '../types/Vect'
import { round3dg, zero13 } from '../kernel/kernel'
import CLignePolygonaleAncetre from './CLignePolygonaleAncetre'
import { appartientSegment, coefficientsPointInterieur, coefficientsPointSurSegment, estInterieurATriangle } from 'src/kernel/kernelVect'

export default CPolygone

/**
 * Classe polygone
 * @constructor
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style du tracé.
 * @param {CNoeudPointeurSurPoint} colPoints  Tableau de CNoeudPointeurSurPoint qui donne les sommets.
 * @returns {CPolygone}
 */
function CPolygone (listeProprietaire, impProto, estElementFinal, couleur, masque, style, colPoints) {
  if (arguments.length === 1) CLignePolygonaleAncetre.call(this, listeProprietaire)
  else CLignePolygonaleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur, masque, style, colPoints)
}
CPolygone.prototype = new CLignePolygonaleAncetre()
CPolygone.prototype.constructor = CPolygone
CPolygone.prototype.superClass = 'CLignePolygonaleAncetre'
CPolygone.prototype.className = 'CPolygone'

CPolygone.prototype.getClone = function (listeSource, listeCible) {
  const colClone = new Array(this.nombrePoints)
  for (let i = 0; i < this.nombrePoints; i++) {
    const noeud = this.colPoints[i]
    colClone[i] = noeud.getClone(listeSource, listeCible)
  }
  const ind1 = listeSource.indexOf(this.impProto)
  return new CPolygone(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), colClone)
}
CPolygone.prototype.createg = function () {
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  style += 'fill:none'
  return cens('polygon', {
    points: this.getPoints(),
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
}
CPolygone.prototype.getPoints = function () {
  let points = ''
  // Pour un polygone, le dernier point est le même que le premier mais pas pour svg
  for (let i = 0; i < this.nombrePoints - 1; i++) {
    points += round3dg(this.absPoints[i]) + ',' + round3dg(this.ordPoints[i]) + ' '
  }
  return points
}
// Version JavaScript : trace est spécifique pour CPolygone et CLigneBrisee
CPolygone.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CPolygone.prototype.update = function () {
  const g = this.g
  g.setAttribute('points', this.getPoints())
}
CPolygone.prototype.confonduAvec = function (p) {
  let ptp1, ptp2, i, j, resultat

  if (p.className === this.className) {
    let nombrePoints = this.nombrePoints
    if (nombrePoints !== p.nombrePoints) return false
    // On regarde si un polynôme a déjà été créé avec les mêmes sommets
    // dans le  même ordre. On ne regarde pas le dernier sommet qui
    // est le même que le premier}
    nombrePoints--
    j = 0
    do {
      ptp1 = this.colPoints[0].pointeurSurPoint
      ptp2 = p.colPoints[j % nombrePoints].pointeurSurPoint
      resultat = (ptp1 === ptp2)
      i = 1
      while (resultat && (i <= nombrePoints - 1)) {
        ptp1 = this.colPoints[i].pointeurSurPoint
        ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
        resultat = resultat && (ptp1 === ptp2)
        i++
      }
      j++
    }
    while ((j !== nombrePoints) && !resultat)

    if (resultat) return true
    // On regarde en tournant dans l'autre sens
    j = 0
    do {
      ptp1 = this.colPoints[nombrePoints - 1].pointeurSurPoint
      ptp2 = p.colPoints[j % nombrePoints].pointeurSurPoint
      resultat = (ptp1 === ptp2)
      i = 1
      while (resultat && (i <= nombrePoints - 1)) {
        ptp1 = this.colPoints[nombrePoints - 1 - i].pointeurSurPoint
        ptp2 = p.colPoints[(i + j) % nombrePoints].pointeurSurPoint
        resultat = resultat && (ptp1 === ptp2)
        i++
      }
      j++
    }
    while ((j !== nombrePoints) && !resultat)
    return resultat
  } else return false
}

CPolygone.prototype.abscisseMinimale = function () {
  return 0
}
CPolygone.prototype.abscisseMaximale = function () {
  return 1 - 1e-12
}
CPolygone.prototype.getNature = function () {
  return NatObj.NPolygone
}
CPolygone.prototype.lieALigneFermee = function () {
  return true
}
/**
 * Fonction renvoyant true si le point de coordonnées (x; y) est intérieur au polygône
 * c'est à dire s'il est sur un des côtés ou si la somme des mesures principales d'angle orienté
 * est un multiple impair de 2*pi.
 */
CPolygone.prototype.pointInterieur = function (x, y) {
  let sommeang = 0
  const taille = this.colPoints.length
  for (let i = 0; i < taille - 1; i++) {
    const noeud1 = this.colPoints[i]
    const x1 = noeud1.pointeurSurPoint.x
    const y1 = noeud1.pointeurSurPoint.y
    const noeud2 = this.colPoints[i + 1]
    const x2 = noeud2.pointeurSurPoint.x
    const y2 = noeud2.pointeurSurPoint.y
    if (appartientSegment(x, y, x1, y1, x2, y2)) return true
    const u = new Vect(x, y, x1, y1)
    const v = new Vect(x, y, x2, y2)
    sommeang += u.mesureAngleVecteurs(v)
  }
  // Modifié version 7.3 pour optimisation
  // const q = Math.floor(sommeang / (2 * Math.PI) + 0.5)
  const q = Math.round(sommeang / (2 * Math.PI))
  // Modifié version 4.8
  // return q != 2*Math.floor(q/2);
  return !zero13(q - 2 * Math.floor(q / 2))
}
CPolygone.prototype.determinePositionInterieure = function (x, y, indicePremierSommet, estSurCote, alpha, beta, gamma) {
  let i, nd1, nd2, nd3, nd4
  const nbSommets = this.nombrePoints - 1
  for (i = 0; i < nbSommets; i++) {
    nd1 = this.colPoints[i]
    const b = nd1.pointeurSurPoint
    nd2 = this.colPoints[i + 1]
    const c = nd2.pointeurSurPoint
    if (appartientSegment(x, y, b.x, b.y, c.x, c.y)) {
      indicePremierSommet.setValue(i)
      coefficientsPointSurSegment(x, y, b.x, b.y, c.x, c.y, alpha, beta)
      estSurCote.setValue(true)
      return true
    }
  }
  const nda = this.colPoints[0]
  const a = nda.pointeurSurPoint
  for (i = 1; i < nbSommets - 1; i++) {
    nd3 = this.colPoints[i]
    const d = nd3.pointeurSurPoint
    nd4 = this.colPoints[i + 1]
    const e = nd4.pointeurSurPoint
    if (estInterieurATriangle(x, y, a.x, a.y, d.x, d.y, e.x, e.y)) {
      indicePremierSommet.setValue(i)
      // En appelant I le point d'intersection on calcule les coordonnées barycentriques du point
      // de coordonnées (x; y) par rapport au triangle ICD
      coefficientsPointInterieur(x, y, a.x, a.y, d.x, d.y, e.x, e.y, alpha, beta, gamma)
      estSurCote.setValue(false)
      return true
    }
  }
  return false
}
CPolygone.prototype.chaineDesignation = function () {
  return 'desPolygone'
}
