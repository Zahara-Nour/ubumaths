/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { svgns } from '../global/constantes'
import InstrumentAncetre from './InstrumentAncetre'
export default Rapporteur

/**
 * @constructor
 * @extends InstrumentAncetre
 * Classe représentant le rapporteur de la figure.
 * @param {IepDoc} doc
 */
function Rapporteur (doc) {
  InstrumentAncetre.call(this, doc)
  this.graduationExterneVisible = true
  this.graduationInterneVisible = true
  this.creeg()
  this.g.setAttribute('visibility', 'hidden')
  this.setPosition(this.x, this.y, this.angle)
  doc.svg.appendChild(this.g)
}

Rapporteur.prototype = new InstrumentAncetre()

/**
 * Fonction mettant dans this.g l'élément graphique représentant le rapporteur dans
 * le DOM du svg de la figure
 */
Rapporteur.prototype.creeg = function () {
  let path, p, li, i, text
  const hauteurPolice = 10
  const hauteurPoliceInterne = 9
  const largeurBarre = '13'
  const ray = 156
  const rayon = String(ray) // Le rayon extérieur
  const rayInt = 89
  const rayonInt = String(rayInt) // Le rayon intérieur
  const raytraitint = '116' // Le rayon du trait interne
  const rayonMire = '7'
  const g = document.createElementNS(svgns, 'g')
  p = document.createElementNS(svgns, 'path')
  // Le pourtour
  path = 'M ' + rayon + ' 0 A ' + rayon + ' ' + rayon + ' 0 0 0 -' + rayon + ' 0 L ' +
          '-' + rayon + ' ' + largeurBarre + ' L ' + rayon + ' ' + largeurBarre +
          ' L ' + rayon + ' 0'
  // L'intérieur qui doit être tacé dans l'autre sens
  path += 'M 0 0 L -' + rayonInt + ' 0 A ' + rayonInt + ' ' + rayonInt + ' 0 0 1 ' +
          rayonInt + ' 0 Z'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke:#999999;stroke-width:1; fill: #c6cbe8; fill-opacity: 0.5')
  g.appendChild(p)
  // La mire
  p = document.createElementNS(svgns, 'path')
  path = 'M ' + rayonMire + ' 0 A ' + rayonMire + ' ' + rayonMire + ' 0 0 0 ' +
          '-' + rayonMire + ' 0 M 0 0 L 0 -' + rayonMire
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke: #666666;stroke-width:1; fill: none')
  g.appendChild(p)
  // Les graduations externes
  for (i = 0; i <= 180; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('x1', rayon)
    li.setAttribute('y1', 0)
    li.setAttribute('x2', i % 10 === 0 ? ray - 20 : (i % 5 === 0 ? ray - 10 : ray - 5))
    li.setAttribute('y2', 0)
    li.setAttribute('transform', 'rotate(-' + i + ')')
    li.setAttribute('style', 'stroke: #333333;stroke-width:0.7;')
    g.appendChild(li)
  }
  // Les nombres de la graduation externe
  this.gradext = document.createElementNS(svgns, 'g')
  for (i = 0; i <= 180; i++) {
    if (i % 10 === 0) {
      text = document.createElementNS(svgns, 'text')
      text.setAttribute('pointer-events', 'none')
      text.appendChild(document.createTextNode(i))
      text.setAttribute('x', 0)
      text.setAttribute('y', 0)
      text.setAttribute('style', 'font-family: arial;font-size: ' + hauteurPolice +
              'px;text-anchor: middle; fill: black')
      text.setAttribute('transform', ' scale(-1) rotate(' + String(-i - 90) + ') translate(0,' +
              String(-ray + 22 + hauteurPolice) + ')')
      this.gradext.appendChild(text)
    }
  }
  g.appendChild(this.gradext)
  // On rajoute le trait interne séparat les graduatiosn externes et internes
  const dep = ray - 26 - hauteurPolice
  p = document.createElementNS(svgns, 'path')
  path = 'M ' + String(dep) + ' 0 L ' + raytraitint + ' 0 A ' +
          raytraitint + ' ' + raytraitint + ' 0 0 0 -' + raytraitint + ' 0 L ' +
          String(-dep) + ' 0'
  p.setAttribute('d', path)
  p.setAttribute('style', 'stroke: #666666;stroke-width:1; fill: none')
  g.appendChild(p)
  // On rajoute les graduatiions internes
  for (i = 0; i <= 18; i++) {
    li = document.createElementNS(svgns, 'line')
    li.setAttribute('x1', rayInt)
    li.setAttribute('y1', 0)
    li.setAttribute('x2', rayInt + 10)
    li.setAttribute('y2', 0)
    li.setAttribute('transform', 'rotate(-' + String(10 * i) + ')')
    li.setAttribute('style', 'stroke: #333333;stroke-width:0.7;')
    g.appendChild(li)
  }
  // Les nombres de la graduation interne
  this.gradint = document.createElementNS(svgns, 'g')
  for (i = 0; i <= 18; i++) {
    text = document.createElementNS(svgns, 'text')
    text.setAttribute('pointer-events', 'none')
    text.appendChild(document.createTextNode(180 - 10 * i))
    text.setAttribute('x', 0)
    text.setAttribute('y', 0)
    text.setAttribute('style', 'font-family: arial;font-size: ' + hauteurPoliceInterne +
              'px;text-anchor: middle; fill: black')
    text.setAttribute('transform', 'scale(-1) rotate(' + String(-10 * i - 90) + ') translate(0,' +
              String(-rayInt - 14) + ')')
    // text.setAttribute("transform", "rotate(" + String(-10*i+1) + ")");
    this.gradint.appendChild(text)
  }
  g.appendChild(this.gradint)
  // On matérialise le centre par un petit rond (n'existait pas).
  const circ = document.createElementNS(svgns, 'circle')
  circ.setAttribute('cx', 0)
  circ.setAttribute('cy', 0)
  circ.setAttribute('r', 2)
  circ.setAttribute('style', 'stroke: black; stroke-width: 1;fill: none')
  g.appendChild(circ)
  // On rajoute le texte Sesamath dans la barre du bas
  text = document.createElementNS(svgns, 'text')
  text.setAttribute('pointer-events', 'none')
  text.appendChild(document.createTextNode('Sésamath'))
  text.setAttribute('x', 0)
  text.setAttribute('y', largeurBarre - 2)
  text.setAttribute('style', 'font-family: sans-serif;font-size: 7pt;font-weight:bold;text-anchor: middle; fill: maroon')
  g.appendChild(text)
  this.g = g
}

/**
 * Fonction montrant ou affichant les nombres de la graduation externe
 * @param {boolean} [bvisible=false] Nombres affichés si true
 */
Rapporteur.prototype.montreGraduations = function (bvisible) {
  this.graduationInterneVisible = true
  if (this.visible) this.gradint.setAttribute('visibility', bvisible ? 'visible' : 'hidden')
}

/**
 * Fonction montrant ou affichant les nombres de la graduation interne du rapporteur
 * @param {boolean} [bvisible=false]Nombres affichés si true
 */
Rapporteur.prototype.montreGraduationsExternes = function (bvisible) {
  this.graduationExterneVisible = true
  if (this.visible) this.gradext.setAttribute('visibility', bvisible ? 'visible' : 'hidden')
}

/**
 * Fonction mettant le rapporteur en position visible ou caché suivant la
 * valeur de bvisible
 * @param {boolean} [bvisible=false]
 */
Rapporteur.prototype.montre = function (bvisible) {
  InstrumentAncetre.prototype.montre.call(this, bvisible)
  if (bvisible) {
    this.gradint.setAttribute('visibility', this.graduationInterneVisible ? 'visible' : 'hidden')
    this.gradext.setAttribute('visibility', this.graduationExterneVisible ? 'visible' : 'hidden')
  } else {
    this.gradint.setAttribute('visibility', 'hidden')
    this.gradext.setAttribute('visibility', 'hidden')
  }
}
