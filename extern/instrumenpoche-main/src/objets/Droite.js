/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import DroiteAncetre from '../objets/DroiteAncetre'
export default Droite
/**
 * Classe représentant une droite donnée par les coordonnées de ses deux points
 * @constructor
 * @extends ObjetBase
 * @param {number} x1 Abscisse du premier point
 * @param {number} y1 Ordonnée du deuième point
 * @param {number} x2 Abscisse du deuxième point
 * @param {number} y2 Ordonnée du deuxième point
 * @param {string} couleur La couleur
 * @param {string} epaisseur L'épaisseur de trait
 * @param {string} opacite L'opacité du tracé
 * @param {string} styleTrait "tiret" pour un trait pointillé
 */
function Droite (doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait) {
  DroiteAncetre.call(this, doc, id, x1, y1, x2, y2, couleur, epaisseur, opacite, styleTrait)
}
Droite.prototype = new DroiteAncetre()

/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Droite.prototype.creeg = function () {
  this.calcule()
  if (!this.horsFenetre) {
    const li = document.createElementNS(svgns, 'line')
    li.setAttribute('x1', this.xext1)
    li.setAttribute('y1', this.yext1)
    li.setAttribute('x2', this.xext2)
    li.setAttribute('y2', this.yext2)
    li.setAttribute('style', this.style)
    this.g = li
  } else {
    this.g = document.createElementNS(svgns, 'g')
  }
  this.g.setAttribute('visibility', 'hidden')
  // this.g.setAttribute("id",this.id);
}
/**
 * Calcul des coordonnées des points d'intersection de la droite avec les bords de la fenêtre
 * Si la droite est hors de la fenêtre, this.horsFenetre est mis à false, sinon true
 * Au retour, (this.xext1, this.yext1) et (this.xext2, this.yext2) sont les coodonnées des points au bord
 */
Droite.prototype.calcule = function () {
  const { x1, y1, x2, y2 } = this
  if ((x1 === x2) && (y1 === y2)) {
    this.horsFenetre = true
    return
  }
  this.horsFenetre = false
  const width = this.doc.getWidth()
  const height = this.doc.getHeight()
  if (x1 === x2) {
    this.xext1 = x1
    this.yext1 = 0
    this.xext2 = x1
    this.yext2 = height
    if ((x1 < 0) || (x1 > width)) {
      this.horsFenetre = true
      return
    }
    this.xext1 = x1
    this.yext1 = 0
    this.xext2 = x1
    this.yext2 = height
    return
  }
  if (y1 === y2) {
    this.xext1 = 0
    this.yext1 = y1
    this.xext2 = width
    this.yext2 = y1
    if ((y1 < 0) || (y1 > height)) {
      this.horsFenetre = true
      return
    }
    this.xext1 = 0
    this.yext1 = y1
    this.xext2 = width
    this.yext2 = y1
    return
  }
  let indicePoint = 0
  const a = (y2 - y1) / (x2 - x1)
  const xa = 0
  const ya = this.y1 + a * (xa - x1)
  if ((ya >= 0) && (ya <= height)) {
    indicePoint++
    this.xext1 = xa
    this.yext1 = ya
  }
  const xb = width
  const yb = a * (xb - x1) + y1
  if ((yb >= 0) && (yb <= height)) {
    indicePoint++
    if (indicePoint === 1) {
      this.xext1 = xb
      this.yext1 = yb
    } else {
      this.xext2 = xb
      this.yext2 = yb
      return
    }
  }
  const yc = 0
  const xc = (yc - y1) / a + x1
  if ((xc > 0) && (xc < width)) {
    indicePoint++
    if (indicePoint === 1) {
      this.xext1 = xc
      this.yext1 = yc
    } else {
      this.xext2 = xc
      this.yext2 = yc
      return
    }
  }
  const yd = height
  const xd = (yd - y1) / a + x1
  if ((xd > 0) && (xd <= width)) {
    indicePoint++
    if (indicePoint === 2) {
      this.xext2 = xd
      this.yext2 = yd
    } else {
      this.horsFenetre = true
    }
  } else this.horsFenetre = true
  if (this.horsFenetre) {
    this.xext1 = 0
    this.yext1 = ya
    this.xext2 = xb
    this.yext2 = yb
  }
}
