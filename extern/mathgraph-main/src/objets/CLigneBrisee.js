/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { cens } from 'src/kernel/dom'
import NatObj from '../types/NatObj'
import { round3dg } from '../kernel/kernel'
import CLignePolygonaleAncetre from './CLignePolygonaleAncetre'
export default CLigneBrisee

/**
 * Classe représentant une ligne brisée.
 * @constructor
 * @extends CLignePolygonaleAncetre
 * @param {CListeObjets} listeProprietaire  La liste propriétaire.
 * @param {CImplementationProto} impProto  null ou la construction propriétaire.
 * @param {boolean} estElementFinal  true si élément final de construction.
 * @param {Color} couleur  La couleur.
 * @param {boolean} masque  true si l'objet est masqué.
 * @param {StyleTrait} style  Le style du tracé.
 * @param {CNoeudPointeurSurPoint[]} colPoints  Tableau de CNoeudPointeurSurPoint qui donne les sommets.
 * @returns {CLigneBrisee}
 */
function CLigneBrisee (listeProprietaire, impProto, estElementFinal, couleur, masque, style, colPoints) {
  if (arguments.length === 1) CLignePolygonaleAncetre.call(this, listeProprietaire)
  else {
    CLignePolygonaleAncetre.call(this, listeProprietaire, impProto, estElementFinal, couleur,
      masque, style, colPoints)
  }
}
CLigneBrisee.prototype = new CLignePolygonaleAncetre()
CLigneBrisee.prototype.constructor = CLigneBrisee
CLigneBrisee.prototype.superClass = 'CLignePolygonaleAncetre'
CLigneBrisee.prototype.className = 'CLigneBrisee'

CLigneBrisee.prototype.getClone = function (listeSource, listeCible) {
  const colClone = new Array(this.nombrePoints)
  for (let i = 0; i < this.nombrePoints; i++) {
    const noeud = this.colPoints[i]
    colClone[i] = noeud.getClone(listeSource, listeCible)
  }
  const ind1 = listeSource.indexOf(this.impProto)
  return new CLigneBrisee(listeCible, listeCible.get(ind1, 'CImplementationProto'),
    this.estElementFinal, this.couleur, this.masque, this.style.getClone(), colClone)
}
CLigneBrisee.prototype.abscisseMinimale = function () {
  return 0
}
CLigneBrisee.prototype.abscisseMaximale = function () {
  return 1
}
CLigneBrisee.prototype.getNature = function () {
  return NatObj.NLigneBrisee
}
CLigneBrisee.prototype.confonduAvec = function (p) {
  let ptp1, ptp2, i

  if (p.className === this.className) {
    const nombrePoints = this.nombrePoints
    if (nombrePoints !== p.nombrePoints) return false
    // On regarde si une ligne brisée formée des mêmes points
    // a déjà été crée dans le même sens
    let confondu = true
    for (i = 0; i < this.nombrePoints; i++) {
      ptp1 = this.colPoints[i].pointeurSurPoint
      ptp2 = p.colPoints[i].pointeurSurPoint
      confondu = ptp1 === ptp2
      if (!confondu) break
    }
    // ou dans le sens inverse
    if (!confondu) {
      confondu = true
      for (i = 0; i < nombrePoints; i++) {
        ptp1 = this.colPoints[i].pointeurSurPoint
        ptp2 = p.colPoints[nombrePoints - i - 1].pointeurSurPoint
        confondu = ptp1 === ptp2
        if (!confondu) break
      }
    }
    return confondu
  } else return false
}
CLigneBrisee.prototype.createg = function () {
  let points = ''
  // Pour un polygone, le dernier point est le même que le premier mais pas pour svg
  for (let i = 0; i < this.nombrePoints; i++) {
    points += round3dg(this.absPoints[i]) + ',' + round3dg(this.ordPoints[i]) + ' '
  }
  let style = ''
  const stroke = this.style.stroke
  if (stroke.length !== 0) style += 'stroke-dasharray:' + stroke + ';'
  const strokewidth = this.style.strokeWidth
  style += 'stroke-width:' + strokewidth + ';'
  // style += "stroke:"+this.couleur.rgb()+";"; Modifié version 4.9.9.4
  // style += 'stroke:' + this.color + ';' // Modifié version 6.9.1
  style += 'stroke:' + this.color + ';opacity:' + this.couleur.opacity + ';'
  style += 'fill:none'
  return cens('polyline', {
    points,
    style,
    // Ligne suivante modifiée version 6.5.2
    // 'pointer-events': 'none'
    'pointer-events': this.pointerevents
  })
}
// Version JavaScript : trace est spécifique pour CPolygone et CLigneBrisee
CLigneBrisee.prototype.trace = function (svg) {
  const g = this.createg()
  g.setAttribute('id', this.id)
  svg.appendChild(g)
  this.g = g
}
CLigneBrisee.prototype.update = function (svg) {
  const oldg = this.g
  const g = this.createg()
  svg.replaceChild(g, oldg)
  g.setAttribute('id', this.id)
  this.g = g
  if (this.cbmap) this.resetEventListeners() // Ajout version 6.5.2
}
CLigneBrisee.prototype.chaineDesignation = function () {
  return 'desLigneBrisee'
}
