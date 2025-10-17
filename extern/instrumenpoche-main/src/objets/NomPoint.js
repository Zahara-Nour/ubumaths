/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { analyseExposantOuIndice, getMathsForName, getTaille, indiceFinBalise, necessiteLatex, remplaceBalises, remplaceCarSpe, traiteBalise } from '../global'
import { svgns } from '../global/constantes'
import InfoBalise from '../global/InfoBalise'
import ObjetBase from '../objets/ObjetBase'
import { setStyles } from 'sesajstools/dom'
export default NomPoint
/**
 * Objet servant à nommer un point
 * @extends ObjetBase
 * @constructor
 * @param {iepDoc} doc le document propriétaire
 * @param {string} id l'id du point auquel le nom est attribué
 * @param {string} dx le décalage en abscisses du nom par rapport au point (haut-gauche de la matrice du nom)
 * @param {string} dy le décalage en ordonnées du nom par rapport au point (haut-gauche de la matrice du nom)
 * @param {string} couleur la couleur du nom
 */
function NomPoint (doc, id, dx, dy, nom, couleur) {
  ObjetBase.call(this, doc, id, couleur)
  this.dx = (dx == null) ? 2 : parseFloat(dx)
  this.dy = (dy == null) ? 4 : parseFloat(dy)
  // Traitement des accents plus nécessaire avec la version MathJax 3
  // this.nom = kernel.remplaceAccentsHtml(kernel.remplaceBalises(kernel.remplaceCarSpe(nom)))
  this.nom = remplaceBalises(remplaceCarSpe(nom))
  this.taille = 20
  this.point = this.doc.getElement(this.id, 'point')
  this.objet = 'point'
  this.nom = this.nom.replace(/\*/g, '×')
  if (necessiteLatex(nom)) {
    this.nom = '$' + this.traiteMaths(this.nom) + '$'
    this.estLatex = true
  } else {
    // this.nom = traiteAccents(this.nom) PLus utile version MathJax 3
    this.estLatex = false
  }
}
NomPoint.prototype = new ObjetBase()
/**
 * Fonction mettant dans this.g l'élément graphique représentant l'objet dans
 * le DOM du svg de la figure
 */
NomPoint.prototype.creeg = function () {
  let indbalise, tspan, ch, ch2, style, txt, ind, indexp, indind, mini, bexp, tailleind, stylespan,
    y, sp, i, debutLigne, an
  let dy = 0 // Le baselineshift de chaque tspan
  const inf = '<' // Equivalent du symbole <
  const debexp = '£e('
  const debind = '£i('
  const g = document.createElementNS(svgns, 'g')
  const taille = getTaille(this)
  const hautlig = taille + 2
  let decblp = 0 // Décalage vers le bas de la ligne précédente
  const decalage = taille * 0.4 // Décalage vers le bas ou le haut en cas d'indice ou d'exposant

  if (this.nom.length !== 0) {
    txt = document.createElementNS(svgns, 'text')
    txt.setAttribute('pointer-events', 'none')
    txt.setAttribute('x', 0)
    txt.setAttribute('y', 0)
    style = 'text-anchor:left;font-size:' + taille + 'px;' + 'fill:' + this.couleur + ';'
    txt.setAttribute('style', style)
    // On remplace les espaces par des espaces insécables
    ch2 = this.nom.replace(/ /g, '\u00A0')
    // Affecter une longueur ne peut être efficace que pour du texte simpel sans balise
    if ((this.nom.indexOf(inf) === -1) && (this.nom.indexOf(debexp) === -1) && (this.nom.indexOf(debind) === -1) &&
      (this.nom.indexOf('<br>') === -1)) {
      txt.appendChild(document.createTextNode(ch2))
    } else {
      sp = ch2.split(/<br>/gi)
      y = -hautlig
      for (i = 0; i < sp.length; i++) {
        debutLigne = true
        ch = sp[i]
        while (ch.length !== 0) {
          indbalise = ch.indexOf(inf)
          indexp = ch.indexOf(debexp)
          indind = ch.indexOf(debind)
          if (debutLigne) y += hautlig + decblp
          if (indexp !== -1) y += decalage
          if ((indbalise === -1) && (indexp === -1) && (indind === -1)) {
            tspan = document.createElementNS(svgns, 'tspan')
            tspan.setAttribute('pointer-events', 'none')
            tspan.setAttribute('dy', dy)
            if (debutLigne) {
              tspan.setAttribute('x', 0)
              tspan.setAttribute('y', y)
              debutLigne = false
            }
            dy = 0 // On est revenu au niveau 0
            tspan.appendChild(document.createTextNode(ch))
            txt.appendChild(tspan)
            break
          } else {
            while ((ch.indexOf(inf) !== -1) || (ch.indexOf(debexp) !== -1) ||
                    (ch.indexOf(debind) !== -1)) {
              indbalise = ch.indexOf(inf)
              indexp = ch.indexOf(debexp)
              indind = ch.indexOf(debind)
              if (indbalise === -1) {
                if (indexp === -1) mini = indind
                else mini = (indind === -1) ? indexp : Math.min(indind, indexp)
              } else {
                if (indexp === -1) mini = (indind === -1) ? indbalise : Math.min(indbalise, indind)
                else {
                  if (indind === -1) mini = Math.min(indbalise, indexp)
                  else mini = Math.min(indbalise, indind, indexp)
                }
              }
              if (mini > 0) { // Il y a du texte avant les balises
                tspan = document.createElementNS(svgns, 'tspan')
                tspan.setAttribute('pointer-events', 'none')
                tspan.setAttribute('dy', dy)
                if (debutLigne) {
                  tspan.setAttribute('x', 0)
                  tspan.setAttribute('y', y)
                  debutLigne = false
                }
                dy = 0 // On est revenu au niveau 0
                tspan.appendChild(document.createTextNode(ch.substring(0, mini)))
                txt.appendChild(tspan)
                ch = ch.substring(mini)
              } else {
                if (indbalise === 0) {
                  const infoBalise = new InfoBalise(false, false, false, this.couleur, '', taille)
                  ind = indiceFinBalise(ch)
                  if (ind === -1) traiteBalise(ch, infoBalise, txt, debutLigne, y)
                  else traiteBalise(ch.substring(0, ind), infoBalise, txt, debutLigne, y)
                  debutLigne = false
                  if (ind !== -1) ch = ch.substring(ind); else ch = ''
                  dy = 0 // On est revenu au niveau 0
                } else { // mini est égal à 0
                  bexp = mini === indexp
                  an = analyseExposantOuIndice(ch)
                  tspan = document.createElementNS(svgns, 'tspan')
                  tspan.setAttribute('pointer-events', 'none')
                  tspan.setAttribute('dy', dy + 'px')
                  if (debutLigne) {
                    tspan.setAttribute('x', 0)
                    tspan.setAttribute('y', y)
                    debutLigne = false
                  }
                  if (an.erreur) tspan.appendChild(document.createTextNode(ch))
                  else {
                    tspan.appendChild(document.createTextNode(an.operande))
                    txt.appendChild(tspan)
                    tspan = document.createElementNS(svgns, 'tspan')
                    tspan.setAttribute('pointer-events', 'none')
                    tspan.appendChild(document.createTextNode(an.exposant))
                    dy = decalage
                    if (bexp) dy = -dy
                    else decblp = dy
                    tspan.setAttribute('dy', dy + 'px')
                    tailleind = taille * 0.6
                    stylespan = 'font-size:' + tailleind + 'px;'
                    tspan.setAttribute('style', stylespan)
                    txt.appendChild(tspan)
                    dy = -dy // Car sinon la suite sera décalée aussi en hauteur
                  }
                  ch = an.texte
                }
              }
            }
          }
        }
      }
    }
    g.appendChild(txt)
    this.g = g
  }
  g.setAttribute('visibility', 'hidden')
  // g.setAttribute("id",this.id);
}
/*
NomPoint.prototype.creegLatex = function () {
  let w, h, ratio
  try {
    const g = document.createElementNS(svgns, 'g')
    const c1 = this.div.childNodes[1]
    if (c1 === undefined) return document.createElementNS(svgns, 'g')
    const c2 = c1.childNodes[0]
    if (c2 === undefined) return document.createElementNS(svgns, 'g')
    let s = c2.childNodes[0]
    if (s === undefined) return document.createElementNS(svgns, 'g')
    // Pour gérer Chrome
    while (s.tagName === 'SPAN') s = s.childNodes[0]
    // Le test suivant est du à la compatibilité avec l'explorer
    if ((s.clientWidth !== 0) && (s.clientHeight !== 0)) {
      w = s.clientWidth
      h = s.clientHeight
    } else {
      const b = s.getBBox()
      ratio = b.height / b.width
      w = this.div.clientWidth
      h = w * ratio
    }
    const t = this.taille
    if (h < t) h = t
    s.setAttribute('x', '0')
    s.setAttribute('y', String(-this.taille)) // Différent de MathGraph32
    s.setAttribute('width', w + 'px')
    s.setAttribute('height', h + 'px')
    g.appendChild(s.parentNode.removeChild(s))
    document.body.removeChild(this.div)
    g.setAttribute('visibility', 'hidden')
    // g.setAttribute("id",this.id);
    this.g = g
  } catch (e) {
    if (this.div != null) document.body.removeChild(this.div)
    this.g = document.createElementNS(svgns, 'g') // Crée un g vide en cas de problème
  }
}
*/
/**
 * Fonction appelée par prepare() qui récupère l'élement svg graphique représentant
 * la formule dans this.html (créé par MathJax.tex2svgPromise), le modifie pour lui
 * donner les bons attributs et l'affecte à this.g
 * Rajoute les éléments graphiques correspondant à un cadre si une couleur de fond
 * et un cadre ont été demandés
 */
NomPoint.prototype.creegLatex = function () {
  try {
    const g = document.createElementNS(svgns, 'g')
    // on récupère le svg de creeg mis dans this.html (éventuellement par MathJax.tex2svgPromise)
    const s = this.html.firstChild
    const svg = s.cloneNode(true)
    g.appendChild(svg)
    // le svg de MathJax a ces attributs
    const w = parseFloat(s.getAttribute('width')) * this.ex
    const h = parseFloat(s.getAttribute('height')) * this.ex
    const svgVa = svg.style['vertical-align']
    const va = (svgVa ? parseFloat(svgVa) || 1 : 1) * this.ex
    svg.setAttribute('width', w + 'px')
    svg.setAttribute('height', h + 'px')
    setStyles(svg, 'vertical-align', va + 'px')

    svg.setAttribute('x', '0')
    const taille = getTaille(this)
    svg.setAttribute('y', String(-taille)) // Différent de MathGraph32
    svg.setAttribute('visibility', 'hidden')
    // g.setAttribute("id",this.id);
    this.g = g
  } catch (error) {
    console.error(error, 'on remplace par un <g> vide')
    this.g = document.createElementNS(svgns, 'g') // Crée un g vide en cas de problème
  }
}

/** @inheritDoc */
NomPoint.prototype.positionne = function () {
  // Il arrive que des gens aient mis l'action de nommer le point avant la création du point lui-même
  // d'où le test suivant :
  if (this.point === null) this.point = this.doc.getElement(this.id, 'point')
  const xp = this.point.x
  const yp = this.point.y
  const taille = getTaille(this)
  this.g.setAttribute('transform', 'translate(' + String(xp + this.dx) + ',' + String(yp + this.dy + taille) + ')')
}

/**
 * Fonction traitant la chaîne ch pour la transcrire en code LaTeX
 * Renvoie la chaîne LaTeX correspondante.
 * Si la chaîne contient des balises <br>, un tableau LaTeX est utilisé pour rendre le contenu
 * @param {string} ch la chaîne à traiter
 * @returns {string} la chaîne LaTeX correpondante une fois ch traduite
 */
NomPoint.prototype.traiteMaths = function (ch) {
  // Modifié version MathJax 3
  // return traiteAccents(getMathsForName(ch, true)) // True pour mode texte
  return getMathsForName(ch, true)
}
