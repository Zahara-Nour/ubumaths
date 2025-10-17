/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { mesurePrincDeg, zeroAngle } from '../global'
import { convDegRad, svgns } from '../global/constantes'
import Ligne from '../objets/Ligne'
import Vect from '../types/Vect'
export default Angle
/**
 * Classe représentant une marque d'angle sur la figure
 * @extends ObjetBase
 * @constructor
 * @param {number} x  : abscisse du centre
 * @param {number} y ordonnée du centre
 * @param {number} ray le rayon
 * @param {number} ang1 angle de départ (en degrés)
 * @param {number} ang2 angle de fin (en degrés)
 * @param {string} couleur la couleur
 * @param {string} epaisseur épaisseur du trait
 * @param {string} opacite chaine de caractère pour l'opacité (0 à 100)
 * @param {string} motif ; chaîne de caractères. Si elle commence par plein la marque doit être remplie.
 * Si elle finit par un, deux ou trois slashes, elle a des traits de marque
 * d'angle (autant que de /)
 */
function Angle (doc, id, x, y, ray, ang1, ang2, couleur, epaisseur, opacite, motif) {
  this.x = parseFloat(x)
  this.y = parseFloat(y)
  this.ray = parseFloat(ray)
  this.ang1 = parseFloat(ang1)
  this.ang2 = parseFloat(ang2)
  this.motif = (motif == null) ? 'simple' : motif
  // Pas d'opacité pour le trait
  Ligne.call(this, doc, id, couleur, epaisseur, 1)
  this.opaciteRemplissage = (opacite == null) ? 0.7 : parseFloat(opacite) / 100
  this.objet = 'angle'
}
Angle.prototype = new Ligne()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
Angle.prototype.creeg = function () {
  let direct, path, line, v2, xc1, yc1, xmilieu, ymilieu, ang2, ang3
  const demilong = 5 // Demi-longueur des traits de marque
  const motif = this.motif
  const ray = this.ray
  const a1 = this.ang1
  const a2 = this.ang2
  const d = a2 - a1
  const ang = mesurePrincDeg(d)
  // var direct = (ang>0) && !iep.zeroAngle(d+180); // Direct dans le sens du repère du svg
  if (zeroAngle(Math.abs(d) - 180)) direct = (this.ang1 <= this.ang2)
  else direct = ang > 0
  const u1 = (new Vect(this.x, this.y, this.x + Math.cos(a1 * convDegRad), this.y + Math.sin(a1 * convDegRad)))
    .vecteurColineaire(ray)
  const u2 = (new Vect(this.x, this.y, this.x + Math.cos(a2 * convDegRad), this.y + Math.sin(a2 * convDegRad)))
    .vecteurColineaire(ray)
  // Début de l'arc
  let xd = this.x + u1.x
  let yd = this.y + u1.y
  // Fin de l'arc
  let xf = this.x + u2.x
  let yf = this.y + u2.y
  const g = document.createElementNS(svgns, 'g')
  let p = document.createElementNS(svgns, 'path')
  const remplis = (motif.indexOf('plein') !== -1) ? this.couleur : 'none'
  if (remplis !== 'none') {
    path = 'M' + this.x + ' ' + this.y + 'L' + xd + ' ' + yd + 'A' + ray + ' ' + ray + ' ' +
            this.ang1 + ' 0 ' + (direct ? '1 ' : '0 ') + xf + ' ' + yf + ' Z'
  } else {
    path = 'M' + xd + ' ' + yd + 'A' + ray + ' ' + ray + ' ' +
            this.ang1 + ' 0 ' + (direct ? '1 ' : '0 ') + xf + ' ' + yf
  }

  p.setAttribute('d', path)
  const style1 = 'stroke:' + this.couleur + ';stroke-width:' + this.epaisseur + ';'
  const style = style1 + 'fill:' + remplis + ';fill-opacity:' + this.opaciteRemplissage + ';'
  p.setAttribute('style', style)
  g.appendChild(p)
  const rond = (motif.indexOf('O') !== -1)
  const uc = u1.tourne(ang / 2) // Vecteur du centre vers le milieu de l'arc
  const xc = this.x + uc.x // Abscisse du centre de l'arc
  const yc = this.y + uc.y // Ordonnée du centre de l'arc
  if (rond) {
    const circ = document.createElementNS(svgns, 'circle')
    circ.setAttribute('r', 5) // Rayon de 5 pixels pour le petir rond de marque
    circ.setAttribute('cx', xc)
    circ.setAttribute('cy', yc)
    circ.setAttribute('style', style1 + 'fill:none;')
    g.appendChild(circ)
  }
  // On regarde s'il y a un, deux ou trois arcs de cercle à tracer
  const n = (motif.indexOf('triple') !== -1) ? 2 : ((motif.indexOf('double') !== -1) ? 1 : 0)
  for (let i = 1; i <= n; i++) {
    p = document.createElementNS(svgns, 'path')
    const r = ray - i * 5
    const u3 = u1.vecteurColineaire(r)
    const u4 = u2.vecteurColineaire(r)
    xd = this.x + u3.x
    yd = this.y + u3.y
    xf = this.x + u4.x
    yf = this.y + u4.y
    path = 'M' + xd + ' ' + yd + 'A' + r + ' ' + r + ' ' +
          this.ang1 + ' 0 ' + (direct ? '1 ' : '0 ') + xf + ' ' + yf
    p.setAttribute('d', path)
    p.setAttribute('style', style1 + 'fill:none;')
    g.appendChild(p)
  }
  // On rajoute les éventuels traits (de 1 à 3)
  const nbtraits = (motif.indexOf('///') !== -1) ? 3 : ((motif.indexOf('//') !== -1) ? 2 : ((motif.indexOf('/') !== -1) ? 1 : 0))
  if (nbtraits === 0) {
    this.g = g
    return
  }
  const n1 = n + 1
  const v = uc.vecteurColineaire(1) // Vecteur de longueur 1
  switch (nbtraits) {
    case 1 :
      xmilieu = this.x + v.x * ray
      ymilieu = this.y + v.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xmilieu - v.x * demilong * n1)
      line.setAttribute('y1', ymilieu - v.y * demilong * n1)
      line.setAttribute('x2', xmilieu + v.x * demilong)
      line.setAttribute('y2', ymilieu + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      break
    case 2 :
      ang2 = ang / 6
      ang3 = 6
      if (Math.abs(ang2) >= Math.abs(ang3)) ang2 = ang3
      v2 = v.tourne(ang2)
      xc1 = this.x + v2.x * ray
      yc1 = this.y + v2.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xc1 - v.x * demilong * n1)
      line.setAttribute('y1', yc1 - v.y * demilong * n1)
      line.setAttribute('x2', xc1 + v.x * demilong)
      line.setAttribute('y2', yc1 + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      v2 = v.tourne(-ang2)
      xc1 = this.x + v2.x * ray
      yc1 = this.y + v2.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xc1 - v.x * demilong * n1)
      line.setAttribute('y1', yc1 - v.y * demilong * n1)
      line.setAttribute('x2', xc1 + v.x * demilong)
      line.setAttribute('y2', yc1 + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      break
    case 3 :
      xmilieu = this.x + v.x * ray
      ymilieu = this.y + v.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xmilieu - v.x * demilong * n1)
      line.setAttribute('y1', ymilieu - v.y * demilong * n1)
      line.setAttribute('x2', xmilieu + v.x * demilong)
      line.setAttribute('y2', ymilieu + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      ang2 = ang / 4
      ang3 = 9
      if (Math.abs(ang2) >= Math.abs(ang3)) ang2 = ang3
      v2 = v.tourne(ang2)
      xc1 = this.x + v2.x * ray
      yc1 = this.y + v2.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xc1 - v.x * demilong * n1)
      line.setAttribute('y1', yc1 - v.y * demilong * n1)
      line.setAttribute('x2', xc1 + v.x * demilong)
      line.setAttribute('y2', yc1 + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      v2 = v.tourne(-ang2)
      xc1 = this.x + v2.x * ray
      yc1 = this.y + v2.y * ray
      line = document.createElementNS(svgns, 'line')
      line.setAttribute('x1', xc1 - v.x * demilong * n1)
      line.setAttribute('y1', yc1 - v.y * demilong * n1)
      line.setAttribute('x2', xc1 + v.x * demilong)
      line.setAttribute('y2', yc1 + v.y * demilong)
      line.setAttribute('style', style)
      g.appendChild(line)
      break
  }
  this.g = g
}
