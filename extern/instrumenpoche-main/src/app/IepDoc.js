/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import { elimineDoublonsXML, estInstrument, getSvgColor, parseXMLDoc } from '../global'
import { svgns } from '../global/constantes'
import Vect from '../types/Vect'
import Compas from '../instruments/Compas'
import Equerre from '../instruments/Equerre'
import Rapporteur from '../instruments/Rapporteur'
import Regle from '../instruments/Regle'
import Requerre from '../instruments/Requerre'
import Crayon from '../instruments/Crayon'
import ActionCoucherCompas from '../actions/ActionCoucherCompas'
import ActionCreation from '../actions/ActionCreation'
import ActionEcarterCompas from '../actions/ActionEcarterCompas'
import ActionEcrireTexte from '../actions/ActionEcrireTexte'
import ActionGlisser from '../actions/ActionGlisser'
import ActionLeverCompas from '../actions/ActionLeverCompas'
import ActionMasquer from '../actions/ActionMasquer'
import ActionMasquerInstrument from '../actions/ActionMasquerInstrument'
import ActionModifierLongueur from '../actions/ActionModifierLongueur'
import ActionMontrer from '../actions/ActionMontrer'
import ActionMontrerGraduations from '../actions/ActionMontrerGraduations'
import ActionMontrerInstrument from '../actions/ActionMontrerInstrument'
import ActionMontrerNombres from '../actions/ActionMontrerNombres'
import ActionNommerPoint from '../actions/ActionNommerPoint'
import ActionPause from '../actions/ActionPause'
import ActionRotationInstrument from '../actions/ActionRotationInstrument'
import ActionRetourner from '../actions/ActionRetourner'
import ActionRotationObjet from '../actions/ActionRotationObjet'
import ActionTranslationInstrument from '../actions/ActionTranslationInstrument'
import ActionTranslationObjet from '../actions/ActionTranslationObjet'
import ActionZoomInstrument from '../actions/ActionZoomInstrument'
import ActionZoomObjet from '../actions/ActionZoomObjet'
import ActionModifierRayon from '../actions/ActionModifierRayon'
import Angle from '../objets/Angle'
import AngleDroit from '../objets/AngleDroit'
import Arc from '../objets/Arc'
import Gabarit from '../objets/Gabarit'
import Axe from '../objets/Axe'
import DemiDroite from '../objets/DemiDroite'
import Droite from '../objets/Droite'
import Imag from '../objets/Imag'
import LigneContinue from '../objets/LigneContinue'
import MarqueSegment from '../objets/MarqueSegment'
import MarqueSeg from '../objets/MarqueSeg'
import NomPoint from '../objets/NomPoint'
import Point from '../objets/Point'
import Polygone from '../objets/Polygone'
import Quadrillage from '../objets/Quadrillage'
import Repere from '../objets/Repere'
import Segment from '../objets/Segment'
import Texte from '../objets/Texte'

export default IepDoc

// la liste des outils
const outils = ['compas', 'equerre', 'rapporteur', 'regle', 'requerre', 'crayon']
// la liste des icones
const icons = ['Reset', 'PrevStep', 'Pause', 'Play', 'Restart', 'NextStep', 'GotoEnd', 'XML', 'Repeat']

const defaultWidth = 800
const defaultHeight = 600

/**
 * Retourne une promesse qui sera résolue dans delay (ms)
 * @private
 * @param {number} delay
 * @return {Promise<undefined>}
 */
const waitPromise = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), delay)
  })
}

// des fonctions pour construire du svg (hors prototype car indépendantes de lui)

/**
 * Retourne le svg de l'icône play de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconPlay (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '-5,8 8,0 -5,-8')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  return svg
}

/**
 * Retourne le svg de l'icône pause de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 */
function getIconPause (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  let rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', -6)
  rect.setAttribute('y', -7)
  rect.setAttribute('width', 3)
  rect.setAttribute('height', 14)
  rect.setAttribute('style', 'stroke:white;fill:white;')
  rect.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(rect)
  rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', 2)
  rect.setAttribute('y', -7)
  rect.setAttribute('width', 3)
  rect.setAttribute('height', 14)
  rect.setAttribute('style', 'stroke:white;fill:white;')
  rect.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(rect)
  // svg.setAttribute("transform","translate(16,16)");
  return svg
}

/**
 * retourne l'icône stepNext de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconNextStep (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', 5)
  rect.setAttribute('y', -6)
  rect.setAttribute('width', 3)
  rect.setAttribute('height', 12)
  rect.setAttribute('style', 'stroke:white;fill:white;')
  rect.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(rect)
  const pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '-7,6 2,0 -7,-6')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  return svg
}

/**
 * Retourne l'icône stepPrev de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconPrevStep (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const rect = document.createElementNS(svgns, 'rect')
  rect.setAttribute('x', -7)
  rect.setAttribute('y', -6)
  rect.setAttribute('width', 3)
  rect.setAttribute('height', 12)
  rect.setAttribute('style', 'stroke:white;fill:white;')
  rect.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(rect)
  const pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '7,6 -2,0 7,-6')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  return svg
}

/**
 * Retourne le svg de l'icône goEnd de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconGotoEnd (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  let pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '-6,7 1,0 -6,-7')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '3,7 10,0 3,-7')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  return svg
}

/**
 * Retourne l'icône goBegin de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconReset (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  let pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '6,7 -1,0 6,-7')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  pol = document.createElementNS(svgns, 'polygon')
  pol.setAttribute('points', '-3,7 -10,0 -3,-7')
  pol.setAttribute('style', 'stroke:white;fill:white;')
  pol.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(pol)
  return svg
}

/**
 * Retourne le svg de l'icône restart de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconRestart (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const path = document.createElementNS(svgns, 'path')
  path.setAttribute('d', 'M 0 -8 A 8 8 -90 1 1 -8 0')
  path.setAttribute('style', 'stroke:white;stroke-width:3;fill:none;')
  path.setAttribute('marker-end', 'url(#markerarrow')
  path.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(path)
  return svg
}

/**
 * Retourne le svg de l'icône restart de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconRepeat (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const path = document.createElementNS(svgns, 'path')
  path.setAttribute('d', 'M 0 -8 A 8 8 -90 1 1 -1 -8')
  path.setAttribute('style', 'stroke:white;stroke-width:3;fill:none;')
  path.setAttribute('marker-end', 'url(#markerarrow')
  path.setAttribute('transform', 'translate(16,16)')
  svg.appendChild(path)
  return svg
}
/**
 * Retourne le svg de l'icône XML de la figure
 * Si teinte == "fonce", la couleur bleu foncée est employée
 * Si "teinte == "clair", la couleur gris clair est employée
 * @private
 * @param {number} x l'abscisse de l'icône relative à la barre d'icônes
 * @param {number} y l'ordonnée de l'icône relative à la barre d'icônes
 * @param {string} teinte "fonce" ou "clair"
 * @returns {SVGElement}
 */
function getIconXml (x, y, teinte) {
  const svg = document.createElementNS(svgns, 'svg')
  svg.setAttribute('x', x)
  svg.setAttribute('y', y)
  svg.setAttribute('width', 32)
  svg.setAttribute('height', 32)
  const circ = document.createElementNS(svgns, 'circle')
  // le cercle entourant l'icône
  svg.appendChild(circ)
  circ.setAttribute('cx', 16)
  circ.setAttribute('cy', 16)
  circ.setAttribute('r', 15)
  const filtre = (teinte === 'fonce') ? 'filtrebleu' : 'filtregris'
  circ.setAttribute('style', 'stroke:none;' + 'fill:url(#radial' + teinte + '); filter:url(#' + filtre + ');')
  const text = document.createElementNS(svgns, 'text')
  text.setAttribute('pointer-events', 'none')
  text.appendChild(document.createTextNode('XML'))
  text.setAttribute('x', 16)
  text.setAttribute('y', 21)
  text.setAttribute('style', 'font-family:Arial;font-size:9pt;fill:white;text-anchor:middle')
  svg.appendChild(text)
  return svg
}

// fonctions pour récupérer des attributs

/**
 * Retourne l'attribut id d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getId (el) {
  return el.getAttribute('id')
}

/**
 * Retourne l'attribut abscisse de trait d'une action
 * @private
 * @param {Element} el un des elements retourné par this.xmldoc.getElementsByTagName("action")
 * @returns {string}
 */
function getAbs (el) {
  return el.getAttribute('abscisse')
}

/**
 * Retourne l'attribut ordonnée de trait d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getOrd (el) {
  const ord = el.getAttribute('ordonnee')
  return (ord === null) ? el.getAttribute('ordonnée') : ord
}

/**
 * Retourne l'attribut couleur d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {SvgColor} (si l'élément n'avait pas l'attribut couleur ce sera black)
 */
function getCouleur (el) {
  const coul = el.getAttribute('couleur')
  return coul ? getSvgColor(coul) : 'black'
}
/**
 * Retourne l'attribut couleur_cadre de l'action
 * @private
 * @param {Element} el
 * @return {null|SvgColor}
 */
function getCouleurCadre (el) {
  const coul = el.getAttribute('couleur_cadre')
  return coul ? getSvgColor(coul) : null
}

/**
 * Retourne l'attribut couleur_fond d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {SvgColor|null}
 */
function getCouleurFond (el) {
  const coul = el.getAttribute('couleur_fond')
  return coul ? getSvgColor(coul) : null
}

/**
 * Retourne l'attribut épaisseur d'une action (1 si y'en avait pas)
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getEpaisseur (el) {
  const ep = el.getAttribute('epaisseur')
  return (ep === null || parseInt(ep) === 0) ? '1' : ep
}

/**
 * Retourne l'attribut opacité de trait d'une action (100 si y'en avait pas)
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string} opacité ('100' par défaut)
 */
function getOpaciteTrait (el) {
  const op = el.getAttribute('opacite')
  return (op === null) ? '100' : op
}

/**
 * Retourne l'attribut opacité de fond d'une action
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getOpaciteFond (el) {
  const op = el.getAttribute('opacite')
  if (op === null) return '50'
  return op
}

/**
 * Retourne l'attribut le style de trait d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getStyleTrait (el) {
  const st = el.getAttribute('pointille')
  return (st == null) ? 'continu' : st
}

/**
 * Retourne l'attribut style de flèce d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
function getStyle (el) {
  const st = el.getAttribute('style')
  return (st == null) ? 'normal' : st
}

/**
 * Animation InstrumenPoche (avec son svg associé)
 * @constructor
 * @param {SVGElement} svg  Le SVG contenant la figure
 * @param {string} xml La chaîne contenant le code XML décrivant la figure.
 * @param {Object} [options]
 * @param {boolean} [options.debug=false] passer true pour avoir des infos de debug en console
 * @param {boolean} [options.autoStart=false] passer true pour démarrer l'animation dès le chargement
 */
function IepDoc (svg, xml, options) {
  /**
   * L'élément svg du DOM
   * @type {SVGElement}
   */
  this.svg = svg
  // pour la compatibilité ascendante, on traite le 3e argument booléen comme autostart
  if (typeof options === 'boolean') {
    /** @type {boolean} */
    this.autoStart = options
    options = {}
  } else {
    if (typeof options !== 'object') options = {}
    this.autoStart = Boolean(options.autoStart)
  }
  /** @type {boolean} */
  this.debug = Boolean(options.debug)
  /**
   * Pointera sur la fenêtre contenant le code xml
   * @type {Window}
   */
  this.windowxml = null
  let ch = xml
  // On ajoute l'en-tête xml si elle a été ommise.
  if (ch.search(/<?xml/gi) === -1) ch = '<?xml version="1.0" encoding="UTF-8"?>' + ch
  // On élimine les <action_ suivis de chiffres
  ch = ch.replace(/<action[_]\d*/gi, '<action')
  // On élimine les remarques html
  ch = ch.replace(/<!--.*-->/g, '')
  // On corrige les oublis d'espaces et les -- dans les attributs
  ch = ch.replace(/(="[^"]*")([^ ])/g, '$1 $2').replace(/--/g, '')
  // On corrige les éventuels << ou >>
  ch = ch.replace(/<</g, '<').replace(/>>/g, '>')
  // Certains auteurs ont mis des <actiontempo= sans espace ou autre
  ch = ch.replace(/<action(\w)/gi, '<action $1')
  // Les commentaires peuvent un attribut texte ce qui pose des problèmes dans elimineDoublonsXML
  // On les remplace par un attribut texteCommentaire
  ch = ch.replace(/<commentaire\s*texte\s*=/gi, '<commentaire texteCommentaire =')
  // On corrige les attributs en doublon
  ch = elimineDoublonsXML(ch)
  // On élimine l'en-tête qui contient parfois des caractères bizarres
  /**
   * La string xml du doc
   * @type {string}
   */
  this.codexml = ch // Mémorisé pour pouvoir être affiche quand on clique sur le bouton XML
  // (on veut la version avant le nettoyage qui suit pour conserver la déclaration xml et les attributs du tag INSTRUMENPOCHE)

  // on corrige le tag ouvrant et fermant, parfois folklorique dans les scripts existants
  // Pas de > dans la recherche sur le tag fermant car certains auteurs se sont trompés sur la balise de fin
  const chunks = (/<\s*INSTRUMENPOCHE[^>]*>(.*)<\s*\/INSTRUMENPOCHE/si).exec(ch)
  if (!chunks) throw Error('script xml invalide')
  /**
   * Le doc xml sans l'en-tête <?xml …> et avec les tags INSTRUMENPOCHE ouvrant / fermant nettoyés
   * @type {string}
   */
  this.chdoc = '<INSTRUMENPOCHE>' + chunks[1] + '</INSTRUMENPOCHE>'

  /**
   * La liste des actions (initialisée par creeActions)
   * @type {ActionCreation[]}
   * @private
   */
  this.actions = [] // Un tableau qui contiendra toutes les actions de la figure.
  /**
   * Une liste des éléments graphiques de type objet graphique traités par la figure.
   * Chaque élément sera identifié par un n° d'id et par son type.
   * Lorsqu'un élément de même id et de même nature qu'un élément déjà existant est créé,
   * lors de l'exécution de l'action de création, son élément graphique remplacera celui
   * de l'élement déjà existant dans le DOM du svg de la figure
   * @type {ObjetBase[]}
   * @private
   */
  this.elements = []
  /** @type {boolean} */
  this.compasRetourne = false
  // On crée les instruments dès le début car certains objet créés ont besoin de connaître
  // l'état des instruments lors de leur création
  /**
   * @type {CompasLeve}
   * @private
   */
  this.compasLeve = null
  /**
   * @type {Compas}
   * @private
   */
  this.compas = new Compas(this)
  /**
   * @type {Equerre}
   * @private
   */
  this.equerre = new Equerre(this)
  /**
   * @type {Rapporteur}
   * @private
   */
  this.rapporteur = new Rapporteur(this)
  /**
   * @type {Regle}
   * @private
   */
  this.regle = new Regle(this)
  /**
   * @type {Requerre}
   * @private
   */
  this.requerre = new Requerre(this)
  /**
   * @type {Crayon}
   * @private
   */
  this.crayon = new Crayon(this)
  /**
   * Le script xml parsé
   * @type {XMLDocument}
   */
  this.xmldoc = parseXMLDoc(this.chdoc)
  /**
   * Liste des éléments action du xml
   * @type {Element[]}
   * @private
   */
  this.tabact = this.xmldoc.getElementsByTagName('action')
  /** @type {boolean} */
  this.started = false
  /** @type {boolean} */
  this.animationEnCours = true // Sera mis à false pour le pas à pas

  // viewBox, on regarde si on trouve un tag <viewBox> dans le xml,
  // si oui on prend les valeurs qu'il précise (si elles sont valides)
  // sinon nos valeurs par défaut
  const vb = {
    x: 0,
    y: 0,
    width: defaultWidth,
    height: defaultHeight
  }
  // à propos de viewbox & viewport
  // https://la-cascade.io/comprendre-svg-viewbox-et-viewport/
  // https://developer.mozilla.org/fr/docs/Web/SVG/Attribute/viewBox
  // https://la-cascade.io/comprendre-svg-viewbox/
  // https://la-cascade.io/comprendre-svg-preserveaspectratio/
  const viewBoxElts = this.xmldoc.getElementsByTagName('viewBox')
  if (viewBoxElts && viewBoxElts.length) {
    if (viewBoxElts.length > 1) console.error(Error('Il y a plusieurs tags viewBox dans le script, on prend le premier'), viewBoxElts)
    const xmlViewBox = viewBoxElts[0]
    // et pour chaque attribut on regarde si il est précisé
    Object.keys(vb).forEach(attr => {
      const value = Number(xmlViewBox.getAttribute(attr))
      // pour x & y on tolère les négatifs, mais pas pour width et height
      if (Number.isFinite(value) && (attr.length < 2 || value > 0)) vb[attr] = value
    })
  }
  // sur un écran très large, on réduit la largeur initiale du div conteneur pour essayer de tout faire rentrer dans l'écran
  // (sinon avec le preserveAspectRatio et 98% en largeur et hauteur, ça aligne le svg sur largeur et ajoute du scroll vertical)
  if (
    window.innerHeight > vb.height * 0.6 && // tout pourrait rentrer en hauteur (avec un zoom de 0.6 ça reste acceptable)
    (vb.width / vb.height) < (window.innerWidth / window.innerHeight) // l'écran est plus large (en format) que l'animation
  ) {
    // on réduit le div parent en largeur pour que l'animation puisse rentrer entièrement à l'écran,
    // et éviter de trop l'agrandir en largeur
    // try/catch au cas où parentNode serait pas très catholique
    try {
      svg.parentNode.style.width = (window.innerHeight / vb.height * vb.width) + 'px'
    } catch (error) {
      console.error(error)
    }
  }
  // on ajoute une taille minimale au conteneur (qui fera apparaître des ascenseur si on réduit trop)
  try {
    svg.parentNode.style.minWidth = (vb.width / 2) + 'px'
    svg.parentNode.style.minHeight = (vb.height / 2) + 'px'
  } catch (error) {
    console.error(error)
  }
  // on mémorise le viewBox initial
  this.initialViewBox = vb
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`)
  svg.setAttribute('preserveAspectRatio', 'xMinYMin meet')

  /**
   * indice de la première action qui sera exécutée
   * @type {number}
   */
  this.indiceActionEnCours = 0
  this.creeActions()

  // Les événements souris pour pouvoir gérer les déplacements de la barre d'icônes
  const t = this
  svg.addEventListener('mousemove', function (ev) { t.mousemoveListenerSvg(ev, ev.clientX, ev.clientY) }, false)
  svg.addEventListener('mouseup', function () { t.mouseupListener() }, false)
  svg.addEventListener('mouseleave', function () { t.mouseleaveListener() }, false)
  svg.addEventListener('touchmove', function (ev) { t.mousemoveListenerSvg(ev, ev.touches[0].pageX, ev.touches[0].pageY) }, false)
  svg.addEventListener('touchend', function () { t.mouseupListener() }, false)
  svg.addEventListener('touchcancel', function () { t.mouseupListener() }, false)
  svg.addEventListener('touchleave', function () { t.mouseleaveListener() }, false)
  if (this.debug) console.log('iepDoc instancié :', this)
}

/**
 * Change la viewBox du svg
 * @param {Object} viewBox
 * @param {number} viewBox.x
 * @param {number} viewBox.y
 * @param {number} viewBox.width
 * @param {number} viewBox.height
 * @throws {TypeError} s'il manque l'une des 4 propriétés
 */
IepDoc.prototype.setViewBox = function setViewBox (viewBox) {
  if (typeof viewBox !== 'object' || Object.keys(this.initialViewBox).some(prop => !Number.isFinite(viewBox[prop]))) {
    throw TypeError('paramètre invalide (il faut passer un objet { x: number, y: number, width: number, height: number })')
  }
  const { x, y, width, height } = viewBox
  // on limite le zoom, mais on ne throw pas d'erreur (sinon à force de cliquer sur + on arrive à descendre sous les 10 et ça génère un rapport bugsnag)
  if (width < 10 || height < 10) return console.error(Error('width et height doivent être supérieur à 10'))
  // facteur de zoom absolu
  const zoomFactor = this.initialViewBox.width / width
  this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`)
  this.barreIcones.setAttribute('transform', `translate(${x + this.xbarre / zoomFactor}, ${y + this.ybarre / zoomFactor}) scale(${1 / zoomFactor})`)
}

/**
 * Zoom (in ou out) dans le svg
 * @param {number} zoomFactor Facteur de zoom relatif à l'état actuel (1.5 grossi de 50%, et 0.8 réduit de 20%), sauf pour 1 où l'animation est remise dans son état initial (du chargement)
 * @param {number} [xCenter] Abscisse du centre du zoom (si non fourni ce sera le milieu de l'affichage actuel)
 * @param {number} [yCenter] Ordonnée du centre du zoom (si non fourni ce sera le milieu de l'affichage actuel)
 */
IepDoc.prototype.zoom = function zoom (zoomFactor, xCenter, yCenter) {
  if (typeof zoomFactor !== 'number' || zoomFactor < 1e-6 || zoomFactor > 1e6) throw Error(`zoomFactor invalide : ${typeof zoomFactor} ${zoomFactor}`)
  // on reset si on passe un zoomFactor de 1
  if (zoomFactor === 1) return this.setViewBox(this.initialViewBox)
  // sinon faut faire des calculs
  let { x, y, width, height } = this.getViewBox()
  if (!Number.isFinite(xCenter)) xCenter = x + width / 2
  if (!Number.isFinite(yCenter)) yCenter = y + height / 2
  width = Math.round(width / zoomFactor)
  height = Math.round(height / zoomFactor)
  x = xCenter - width / 2
  y = yCenter - height / 2
  this.setViewBox({ x, y, width, height })
}

/**
 * Retourne true seulement si tous les objets de la figure sont bien chargés
 * @returns {boolean}
 */
IepDoc.prototype.isReadyAll = function isReadyAll () {
  if (this.debug) {
    const pasPretes = this.actions.filter(action => !action.isReady)
    if (pasPretes.length) console.log(`${pasPretes.length} actions pas encore prêtes (sur ${this.actions.length})`)
    else console.log(`Les ${this.actions.length} actions sont prêtes`)
  }
  return this.actions.every(action => action.isReady)
}

/**
 * Rappellera callback quand tout sera prêt ou qu'on aura attendu maxWait ms
 * @param {function} callback Sera appelée avec une erreur si maxWait est atteint
 * @param {number} maxWait délai max à attendre, en s
 */
IepDoc.prototype.whenReady = function whenReady (callback, maxWait = 30) {
  const wait = () => setTimeout(check, 100)
  const check = () => {
    // on teste toutes les 100ms, jusqu'à ce que ce soit prêt ou que maxWait soit atteint
    if (this.isReadyAll()) return callback()
    if ((Date.now() - start) < maxWait * 1000) return wait()
    callback(Error(`Après ${maxWait}s d’attente l’animation n’est pas prête, échec du chargement…`))
  }
  const start = Date.now()
  check()
}

/**
 * Retourne une promesse qui sera résolue quand le doc sera prêt ou qu'on aura attendu maxWait (dans ce cas rejet avec l'erreur)
 * @param {number} maxWait délai max à attendre, en s
 * @return {Promise<undefined>}
 */
IepDoc.prototype.getReadyPromise = function getReadyPromise (maxWait = 30) {
  if (this.isReadyAll()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    this.whenReady((error) => {
      if (error) reject(error)
      else resolve(this)
    }, maxWait)
  })
}

/**
 * Retourne la largeur en pixel du svg (dans son système de coordonnées, pas ce qu'il occupe à l'écran)
 * @return {number}
 */
IepDoc.prototype.getWidth = function getWidth () {
  return this.getViewBox().width
}
/**
 * Retourne la hauteur en pixel du svg (dans son système de coordonnées, pas ce qu'il occupe à l'écran)
 * @return {number}
 */
IepDoc.prototype.getHeight = function getHeight () {
  return this.getViewBox().height
}
/**
 * Retourne les 4 valeurs de la viewBox du svg (toutes en number).
 * Si y'a pas de viewBox ou une viewBox invalide ça impose la viewBox par défaut (et retourne ses valeurs)
 * @return {{x: number, width: number, y: number, height: number}}
 */
IepDoc.prototype.getViewBox = function getViewBox () {
  try {
    const viewBox = this.svg.getAttribute('viewBox')
    if (viewBox) {
      // on cast en Number et vérifie qu'on a aucun NaN
      const values = viewBox.split(' ').map(Number).filter(n => !Number.isNaN(n))
      if (values.length === 4) {
        const [x, y, width, height] = values
        // on vérifie quand même que width et height sont valides
        if (width > 0 && height > 0) return { x, y, width, height }
      }
    }
    console.error(Error('viewBox invalide'), viewBox)
  } catch (error) {
    console.error(error)
  }
  // on rectifie les conneries pour que ce qu'on retourne corresponde à la réalité
  this.svg.setAttribute('viewBox', `0 0 ${defaultWidth} ${defaultHeight}`)
  return {
    x: 0,
    y: 0,
    width: defaultWidth,
    height: defaultHeight
  }
}

/**
 * Retourne au début et joue l'animation en accéléré (pas à pas avec delay ms entre chaque pas)
 * @param delay
 * @param callback
 */
IepDoc.prototype.goFast = function goFast (delay = 100, callback) {
  const self = this
  const nextStep = () => {
    self.nextStep()
    if (self.indiceActionEnCours < self.actions.length) {
      setTimeout(() => nextStep(), delay)
    } else if (callback) {
      callback()
    }
  }
  this.getReadyPromise().then(() => {
    if (self.animationEnCours) {
      self.pause()
      return waitPromise(500)
    }
    return Promise.resolve()
  }).then(() => {
    self.reset()
    nextStep()
  }).catch(error => {
    console.error(error)
    alert(error.message)
  })
}

/**
 * Crée tous les éléments graphiques des aactions de création de la figure.
 * Seules les actions de créations d'objets ont une fonction creegElement faisant quelquechose
 * @private
 */
IepDoc.prototype.creeElementsGraphiques = function creeElementsGraphiques () {
  this.actions.forEach(action => action.creegElement())
}

/**
 * Réinitilise la position de tous les instruments et les cache
 * @private
 */
IepDoc.prototype.initialiseOutils = function initialiseOutils () {
  outils.forEach(outil => {
    this[outil].initialisePosition()
    this[outil].montre(false)
  })
  this.compas.leve = false
}

/**
 * Retire du DOM les éléments graphiques des outils et les recrée de façon à ce que les outils
 * soient dans le DOM après les éléments graphiques des objets de la figure.
 * @private
 */
IepDoc.prototype.recreeOutils = function recreeOutils () {
  outils.forEach(outil => {
    this[outil].updateg()
    this[outil].montre(false)
  })
  this.compasLeve = null
}

/**
 * Fonction lancée après le chargement complet de la figure.
 * Toutes les actions de création d'objet de la figure créent leur propre élément graphique dans le DOM du svg
 * qu'elles stockent dans une variable this.g. Ces éléments sont initialeùent tous cachés.
 * Ensuite on recrée dans le DOM les éléments graphiques des outils pour qu'ils soient situés après les objets créés.
 * Puis on crée les icônes et on les initialise à leur état initial  pour le démarrage de la figure.
 * @private
 */
IepDoc.prototype.init = function init () {
  this.started = true
  this.creeElementsGraphiques()
  this.recreeOutils()
  this.creeIcones()
  if (this.autoStart) {
    this.montreIcones(['Pause'])
    this.play()
  } else {
    this.montreIcones(['Play'])
  }
}

/**
 * Crée les icônes de la figure.
 * @private
 */
IepDoc.prototype.creeIcones = function creeIcones () {
  // Toutes les images seront contenues dans un g element appelé barreIcones
  const nbIcones = 8
  const t = this
  this.barreIcones = document.createElementNS(svgns, 'g')
  this.creeElementsPourIcones()
  // reset
  this.iconReset = getIconReset(0, 0, 'fonce')
  this.iconResetGris = getIconReset(0, 0, 'clair')
  this.iconReset.onclick = this.reset.bind(this)
  this.barreIcones.appendChild(this.iconReset)
  this.barreIcones.appendChild(this.iconResetGris)
  // prevStep
  this.iconPrevStep = getIconPrevStep(32, 0, 'fonce')
  this.iconPrevStepGris = getIconPrevStep(32, 0, 'clair')
  this.iconPrevStep.onclick = function () { t.prevStep() }
  this.barreIcones.appendChild(this.iconPrevStep)
  this.barreIcones.appendChild(this.iconPrevStepGris)
  // pause
  this.iconPause = getIconPause(64, 0, 'fonce')
  this.iconPauseGris = getIconPause(64, 0, 'clair')
  this.iconPause.onclick = this.pause.bind(this)
  this.barreIcones.appendChild(this.iconPause)
  this.barreIcones.appendChild(this.iconPauseGris)
  // play
  this.iconPlay = getIconPlay(96, 0, 'fonce')
  this.iconPlayGris = getIconPlay(96, 0, 'clair')
  this.iconPlay.onclick = this.play.bind(this)
  this.barreIcones.appendChild(this.iconPlay)
  // continue, icône rouge à activer quand on rencontre une pause
  // Cette icône ne sera visible et active que quand on rencontre une action de pause
  this.iconContinue = getIconPlay(96, 0, 'rouge')
  this.iconContinue.setAttribute('visibility', 'hidden')
  this.iconContinue.onclick = this.continue.bind(this)
  this.barreIcones.appendChild(this.iconContinue)
  this.barreIcones.appendChild(this.iconPlayGris)
  // restart
  this.iconRestart = getIconRestart(128, 0, 'fonce')
  this.iconRestartGris = getIconRestart(128, 0, 'clair')
  this.iconRestart.onclick = this.restart.bind(this)
  this.barreIcones.appendChild(this.iconRestart)
  this.barreIcones.appendChild(this.iconRestartGris)
  // nextStep
  this.iconNextStep = getIconNextStep(160, 0, 'fonce')
  this.iconNextStepGris = getIconNextStep(160, 0, 'clair')
  this.iconNextStep.onclick = function () { t.nextStep() }
  this.barreIcones.appendChild(this.iconNextStep)
  this.barreIcones.appendChild(this.iconNextStepGris)
  // gotoEnd
  this.iconGotoEnd = getIconGotoEnd(192, 0, 'fonce')
  this.iconGotoEndGris = getIconGotoEnd(192, 0, 'clair')
  this.iconGotoEnd.onclick = function () { t.gotoEnd() }
  this.barreIcones.appendChild(this.iconGotoEnd)
  this.barreIcones.appendChild(this.iconGotoEndGris)
  // xml
  this.iconXML = getIconXml(224, 0, 'fonce')
  this.iconXMLGris = getIconXml(224, 0, 'clair')
  this.iconXML.onclick = function () { t.showXml() }
  this.barreIcones.appendChild(this.iconXML)
  this.barreIcones.appendChild(this.iconXMLGris)
  // Repeat
  this.iconRepeat = getIconRepeat(256, 0, 'fonce')
  this.iconRepeatGris = getIconRepeat(256, 0, 'clair')
  this.iconRepeat.onclick = this.repeat.bind(this)
  this.barreIcones.appendChild(this.iconRepeat)
  this.barreIcones.appendChild(this.iconRepeatGris)

  this.hauteurBarre = 32
  this.demiLargeurBarre = nbIcones * 16
  // this.xbarre et this.ybarre contiennent les coordonnées initiales de la barre d'outils dans le SVG
  this.xbarre = 50 // pas trop à gauche à cause des boutons de zoom éventuels
  this.ybarre = 4
  this.barreIcones.setAttribute('transform', `translate(${this.xbarre}, ${this.ybarre})`)
  this.svg.appendChild(this.barreIcones)
  // Ajout des listeners de souris sur la barre d'icônes (pour gérer son déplacement)
  this.isDraggingBarre = false // flag mis à true au mousedown|touch et lu au move
  this.barreIcones.addEventListener('mousedown', function (ev) { t.mousedownListenerBarre(ev.clientX, ev.clientY) }, false)
  this.barreIcones.addEventListener('mousemove', function (ev) { t.mousemoveListenerBarre(ev.clientX, ev.clientY) }, false)
  // C'est le SVG qui gère les événements mouseup
  this.barreIcones.addEventListener('touchstart', function (ev) { t.mousedownListenerBarre(ev.touches[0].pageX, ev.touches[0].pageY) }, false)
  this.barreIcones.addEventListener('touchmove', this.mousemoveListenerBarre.bind(this), false)
  // C'est le svg qui gère les événements touhcancel et touchend
  // this.barreIcones.addEventListener("touchcancel",function() {t.onmouseupbarre()},false);
  // Initialisation de la position relative de la barre d'outils
  // this.deltax et this.deltay contiendront de décalage relatif de la barre d'outils par rapport
  // à sa position initiale lorsqu'on la fait glisser.
  this.deltax = 0
  this.deltay = 0
}

/**
 * Fonction appelée quand on clique ou fait un appui tactile sur la barre d'icônes de la figure
 * @param {number} xmouse l'abscisse du point cliqué par la souris
 * @param {number} ymouse l'ordonnée du point cliqué par la souris
 * @private
 */
IepDoc.prototype.mousedownListenerBarre = function mousedownListenerBarre (xmouse, ymouse) {
  if (this.animationEnCours) return
  this.isDraggingBarre = true
  this.xcapturebarre = xmouse
  this.ycapturebarre = ymouse
}

/**
 * Fonction appelée au survol de la barre d'icônes par la souris ou du pointeur tactive
 * @private
 */
IepDoc.prototype.mousemoveListenerBarre = function mousemoveListenerBarre () {
  if (this.animationEnCours) {
    this.barreIcones.style.cursor = 'default'
    this.isDraggingBarre = false
  } else {
    this.barreIcones.style.cursor = 'pointer'
  }
}

/**
 * Appelé au survol du svg par la souris ou au déplacement d'un pointeur tactile
 * @private
 * @param {event} ev
 * @param {number} xmouse l'abscisse pointée par la souris
 * @param {number} ymouse l'ordonnée pointée par la souris
 */
IepDoc.prototype.mousemoveListenerSvg = function mousemoveListenerSvg (ev, xmouse, ymouse) {
  if (this.isDraggingBarre) {
    const w = this.getWidth()
    const h = this.getHeight()
    const dx = xmouse - this.xcapturebarre
    const dy = ymouse - this.ycapturebarre
    const deltax = this.deltax + dx
    const deltay = this.deltay + dy
    const xpos = this.xbarre + deltax
    const ypos = this.ybarre + deltay
    if ((xpos <= w - 2 * this.demiLargeurBarre) && (xpos >= 0) &&
            (ypos >= 0) && (ypos <= h - this.hauteurBarre)) {
      this.barreIcones.setAttribute('transform', 'translate(' + xpos + ',' + ypos + ')')
      this.deltax = deltax
      this.deltay = deltay
      this.xcapturebarre = xmouse
      this.ycapturebarre = ymouse
    }
    ev.preventDefault() // Pour éviter que des éléments texte soient sélectionnés en bougeant la souris
  }
  // ev.preventDefault(); // Pour éviter que des éléments texte soient sélectionnés en bougeant la souris
  // Abandonné car alors on e peut pls zoomer ou dézoomer sur périphérique mobile
}

/**
 * Fonction appelée lorsque le bouton de la souris est relâché sur le svg
 * @private
 */
IepDoc.prototype.mouseupListener = function mouseupListener () {
  this.isDraggingBarre = false
}

/**
 * Fonction appelée quand on relâche le bouton de la souris sur la figure
 * @private
 */
IepDoc.prototype.mouseleaveListener = function mouseleaveListener () {
  this.isDraggingBarre = false
}

/**
 * Ouvre une fenêtre (ou onglet) affichant le code XML de la figure
 */
IepDoc.prototype.showXml = function showXml () {
  if (this.windowxml == null) this.windowxml = this.popup()
  else this.windowxml.focus()
}

/**
 * Montre les icones passées en argument et grise les autres
 * @param {string[]} icones
 */
IepDoc.prototype.montreIcones = function montreIcones (icones) {
  icons.forEach(icone => {
    const bvisible = icones.includes(icone)
    const nom = 'icon' + icone
    if (this[nom]) {
      this[nom].setAttribute('visibility', bvisible ? 'visible' : 'hidden')
      this[nom + 'Gris'].setAttribute('visibility', bvisible ? 'hidden' : 'visible')
    } else {
      console.error(`L’icone ${nom} n’existe pas`)
    }
  })
}

/**
 * Active l'icône rouge Continuer et désactive les autres
 * @private
 */
IepDoc.prototype.activeIconeContinuer = function activeIconeContinuer () {
  this.montreIcones(['XML'])
  // et on vire le play gris pour mettre continuer à sa place
  this.iconPlayGris.setAttribute('visibility', 'hidden')
  this.iconContinue.setAttribute('visibility', 'visible')
}

/**
 * Saute à la fin de l'animation
 */
IepDoc.prototype.gotoEnd = function gotoEnd () {
  this.animationEnCours = false
  this.initialise()
  this.montreIcones(['Reset', 'PrevStep', 'Restart', 'XML', 'Repeat'])
  this.executeJusque(this.actions.length - 1)
  this.indiceActionEnCours = this.actions.length
}

/**
 * Lance la lecture de l'animation
 */
IepDoc.prototype.play = function play () {
  this.animationEnCours = true
  this.montreIcones(['Pause'])
  if (this.actions[this.indiceActionEnCours]) {
    this.actions[this.indiceActionEnCours].execute(false)
  } else {
    console.error(Error(`Pas d'action ${this.indiceActionEnCours}`), this.actions)
  }
}

/**
 * Reprend la lecture de l'animation (après une action de pause contenue dans l'animation, pas un clic sur pause, ≠ play)
 */
IepDoc.prototype.continue = function continueAnimation () {
  if (this.indiceActionEnCours === this.actions.length) {
    this.gotoEnd()
    return
  }
  this.iconContinue.setAttribute('visibility', 'hidden')
  this.montreIcones(['Pause'])
  this.animationEnCours = true
  this.indiceActionEnCours++
  if (this.actions[this.indiceActionEnCours]) {
    this.actions[this.indiceActionEnCours].execute(false)
  } else {
    console.error(Error(`Pas d'action ${this.indiceActionEnCours}`), this.actions)
  }
}

/**
 * Réinitialise l'animation (la remet au début en mode pause, utiliser restart pour rejouer du début), et son zoom
 */
IepDoc.prototype.reset = function reset () {
  this.animationEnCours = false
  this.initialise()
  this.montreIcones(['Play', 'NextStep', 'GotoEnd', 'XML', 'Repeat'])
  this.indiceActionEnCours = 0
  this.zoom(1)
}

/**
 * Redémarre l'animation à partir du début
 */
IepDoc.prototype.restart = function restart () {
  if (this.animationEnCours) {
    this.animationEnCours = false
    // on attend un peu pour que l'animation en cours se termine ? pourquoi 100ms ?
    setTimeout(this.restart.bind(this), 100)
    return
  }
  this.initialise()
  this.indiceActionEnCours = 0
  this.zoom(1)
  this.play()
}

IepDoc.prototype.repeat = function repeat () {
  if (this.animationEnCours) {
    this.animationEnCours = false
    // on attend un peu pour que l'animation en cours se termine ? pourquoi 100ms ?
    setTimeout(this.repeat.bind(this), 100)
    return
  }
  this.animationEnCours = true
  this.animationEnBoucle = true
  this.initialise()
  this.montreIcones(['Pause'])
  this.indiceActionEnCours = 0
  this.zoom(1)
  this.actions[0].execute(false)
}

/**
 * Met la lecture de l'animation en pause
 */
IepDoc.prototype.pause = function pause () {
  this.animationEnBoucle = false
  this.animationEnCours = false
  // On laisse 500ms pour finir l'animation en cours.
  setTimeout(() => this.montreIcones(['Reset', 'PrevStep', 'Play', 'Restart', 'NextStep', 'GotoEnd', 'XML', 'Repeat']), 500)
}

/**
 * Passe au pas suivant (en mode pas à pas)
 */
IepDoc.prototype.nextStep = function nextStep () {
  const nbActions = this.actions.length
  this.animationEnCours = false
  if (this.indiceActionEnCours < nbActions) {
    if (this.actions[this.indiceActionEnCours].actionVisible()) this.indiceActionEnCours++
    else this.indiceActionEnCours = this.indiceProchaineActionVisible(this.indiceActionEnCours) + 1
    this.executeJusque(this.indiceActionEnCours - 1)
  }
  const derniereAction = this.indiceActionEnCours === this.actions.length
  const iconsToShow = ['Reset', 'PrevStep', 'Restart', 'XML', 'Repeat']
  if (derniereAction) this.montreIcones(iconsToShow)
  else this.montreIcones(iconsToShow.concat(['NextStep', 'GotoEnd', 'Play']))
}

/**
 * Passe au pas précédent (en mode pas à pas)
 */
IepDoc.prototype.prevStep = function prevStep () {
  this.animationEnCours = false
  // this.indiceActionEnCours--;
  this.indiceActionEnCours = this.indicePrecedenteActionVisible(this.indiceActionEnCours - 1)
  if (this.indiceActionEnCours > 0) this.executeJusque(this.indiceActionEnCours - 1)
  const iconsToShow = ['Play', 'NextStep', 'GotoEnd', 'XML', 'Repeat']
  const premiereAction = this.indiceActionEnCours === 0
  if (premiereAction) this.montreIcones(iconsToShow)
  else this.montreIcones(iconsToShow.concat(['Reset', 'PrevStep']))
}

/**
 * Réinitialise l'animation :
 * - cache tous les éléments graphiques de la figure,
 * - réinitialise tous les outils
 * - réinitialise la position de tous les objets ou instruments qui peuvent être translatés, tournés ou zoomés (points et images)
 * @private
 */
IepDoc.prototype.initialise = function initialise () {
  let i, el
  const svg = this.svg
  for (i = 0; i < svg.childNodes.length; i++) {
    el = svg.childNodes[i]
    if (el !== this.barreIcones) {
      try { // Pour compatibilité avec explorer
        svg.childNodes[i].setAttribute('visibility', 'hidden')
      } catch (error) {
        console.error(error)
      }
    }
  }
  for (i = 0; i < this.actions.length; i++) {
    const action = this.actions[i]
    if (action instanceof ActionCreation) action.objet.initialisePosition()
  }
  this.initialiseOutils()
}

/**
 * Retourne la visibilité de l'instrument après l'exécution de l'action d'indice indaction
 * @private
 * @param {InstrumentAncetre} instrument
 * @param {number} indaction
 * @returns {boolean}
 */
IepDoc.prototype.getInstrumentVisibility = function getInstrumentVisibility (instrument, indaction) {
  if (indaction === -1) return false
  let action
  let visible = false
  for (let i = 0; i <= indaction; i++) {
    action = this.actions[i]
    if (action instanceof ActionMontrerInstrument) {
      if (action.instrument === instrument) visible = true
    } else if (action instanceof ActionMasquerInstrument) {
      if (action.instrument === instrument) visible = false
    }
  }
  return visible
}

/**
 * Retourne la visibilité de l'objet après l'exécution de l'action d'indice indaction
 * @private
 * @param {ObjetBase} objet
 * @param {number} indaction
 * @returns {boolean}
 */
IepDoc.prototype.getObjectVisibility = function getObjectVisibility (objet, indaction) {
  if (indaction === -1) return false
  let action
  let visible = false
  for (let i = 0; i <= indaction; i++) {
    action = this.actions[i]
    if (action instanceof ActionMontrer) {
      if (action.objet === objet) visible = true
    } else if (action instanceof ActionMasquer) {
      if (action.objet === objet) visible = false
    }
  }
  return visible
}

/**
 * Fonction donnant l'état du compas (levé ou couché) après l'exécution
 * de l'action d'indice indaction.
 * Si le compas est couché, renvoie "couche", s'il est leve, renvoie "leve"
 * @private
 * @param {number} indaction
 * @returns {string}
 */
IepDoc.prototype.getCompasStatus = function getCompasStatus (indaction) {
  if (indaction === -1) return 'couche'
  let couche = true
  let action
  for (let i = 0; i <= indaction; i++) {
    action = this.actions[i]
    if (action instanceof ActionCoucherCompas) {
      couche = true
    } else if (action instanceof ActionLeverCompas) {
      couche = false
    }
  }
  return couche ? 'couche' : 'leve'
}

/**
 * Retourne l'indice de la prochaine action qui aura une action visible sur la figure
 * à partir de l'indice ind
 * Si aucune action visible ne figure après ind, renvoie this.actions.length
 * @private
 * @param {number} ind
 * @returns {number}
 */
IepDoc.prototype.indiceProchaineActionVisible = function indiceProchaineActionVisible (ind) {
  if (ind >= this.actions.length) return this.actions.length - 1
  for (let i = ind; i < this.actions.length; i++) {
    if (this.actions[i].actionVisible()) return i
  }
  return this.actions.length - 1
}

/**
 * Retourne l'indice de la précédene action qui aura une action visible sur la figure
 * à partir de l'indice ind
 * Si aucune action visible ne figure avant ind, renvoie 0
 * @private
 * @param {number} ind
 * @returns {number}
 */
IepDoc.prototype.indicePrecedenteActionVisible = function indicePrecedenteActionVisible (ind) {
  if (ind < 0) return 0
  if (ind === this.actions.length) ind--
  for (let i = ind; i >= 0; i--) {
    if (this.actions[i].actionVisible()) return i
  }
  return 0
}

/**
 * Fonction montrant les instruments à leur étape de visibilité à l'étape n
 * @private
 * @param {number} n indice de la dernière action exécutée
 */
IepDoc.prototype.montreInstrumentsEtape = function montreInstrumentsEtape (n) {
  let visible = this.getInstrumentVisibility(this.compas, n)
  if (this.compas.leve) this.compasLeve.montre(visible)
  else this.compas.montre(visible)
  visible = this.getInstrumentVisibility(this.crayon, n)
  this.crayon.montre(visible)
  visible = this.getInstrumentVisibility(this.equerre, n)
  this.equerre.montre(visible)
  visible = this.getInstrumentVisibility(this.rapporteur, n)
  this.rapporteur.montre(visible)
  visible = this.getInstrumentVisibility(this.regle, n)
  this.regle.montre(visible)
  visible = this.getInstrumentVisibility(this.requerre, n)
  this.requerre.montre(visible)
}

/**
 * Exécute sans animation toutes les actions de la figure jusqu'à l'indice indfin compris
 * @private
 * @param {number} indfin
 */
IepDoc.prototype.executeJusque = function executeJusque (indfin) {
  if (indfin >= this.actions.length) return
  this.initialise()
  this.initialiseOutils()
  this.animationEnCours = false
  for (let i = 0; i <= indfin; i++) {
    this.actions[i].execute(true) // true pour que l'exécution soit immédiate
  }
  this.montreInstrumentsEtape(indfin)
}

/**
 * Ajoute un élément, s'il y a déjà un élément avec cet id et cet objet on le remplace
 * @private
 * @param {ObjetBase} element
 */
IepDoc.prototype.addElement = function addElement (element) {
  const i = this.elements.findIndex(el => el.id === element.id && el.objet === element.objet)
  if (i !== -1) this.elements[i] = element
  else this.elements.push(element)
}

/**
 * Fonction appelée dans le cas où on est sûr que la liste doc.elements ne contient pas
 * déjà un élément de même id et de même nature que element
 * @private
 * @param {ObjetBase} element
 * @throws {Error} si y'en avait un
 */
IepDoc.prototype.pushElement = function pushElement (element) {
  if (this.elements.some(el => el.id === element.id && el.objet === element.objet)) throw Error(`Il y a déjà un élément ${element.id} désignant le même objet`)
  this.elements.push(element)
}

/**
 * Retourne l'objet de elements d'id égale à id s'il y en a une et sinon null
 * Attention : Le quadrillage est le seul objet a ne pas avoir d'id et il ne peut y en avoir qu'un par figure
 * @private
 * @param {string} id
 * @param {string} nature
 * @returns {ObjetBase|null}
 */
IepDoc.prototype.getElement = function getElement (id, nature) {
  const found = this.elements.find(el => {
    if (el.objet === nature) {
      if (nature === 'quadrillage') return true // on regarde pas l'id dans ce cas
      return el.id === id
    }
    return false
  })
  // found peut être undefined, on veut retourner null dans ce cas
  return found || null
}

/**
 * Remplaçe l'élément d'id id par e s'il y en a un, sinon retourne false
 * S'il n'y a pas délément d'id id renvoie false
 * @private
 * @param {string} id
 * @param {ObjetBase} e
 * @returns {boolean}
 */
IepDoc.prototype.setElement = function setElement (id, e) {
  const i = this.elements.findIndex(el => el.id === id)
  if (i !== -1) {
    this.elements[i] = e
    return true
  }
  return false
}

/**
 * Ajoute l'action à la liste
 * @private
 * @private
 * @param {ActionCreation} action
 */
IepDoc.prototype.ajouteAction = function ajouteAction (action) {
  // On donne à action un indice pour qu'elle sache quelle est son rang dans la liste
  // Elle pourra alors indiquer si son action sur la figure est visible ou non
  action.indice = this.actions.length
  this.actions.push(action)
}

/**
 * Crée toutes les actions de la figure
 * @private
 * @param {number} ind
 */
IepDoc.prototype.creeActions = function creeActions () {
  let ind, el, at, ato, objet, action, forme, xcrayon, ycrayon, id,
    angle, sens, vitesse, abs, ord, cibles, tempo, len, ecart, v1, echelle, point, cible
  for (ind = 0; ind < this.tabact.length; ind++) {
    el = this.tabact[ind]
    id = getId(el)
    at = el.getAttribute('mouvement')
    tempo = el.getAttribute('tempo')
    try {
      let abscisse_bas_droite, ecartAngle // faut éviter de déclarer dans un case directement, on le fait dans le bloc parent (eslint no-case-declarations)
      switch (at) {
        case 'creer':
          ato = el.getAttribute('objet')
          // Si on a déjà créé un objet avec le même id c'est une erreur et on saute la création
          if (this.getElement(id, ato) !== null) {
            console.error(`L'id ${id} existe déjà, action creer ignorée`, ato)
            break
          }

          if (ato != null) {
            switch (ato) {
              case 'point':
                objet = new Point(this, id, parseFloat(getAbs(el)), parseFloat(getOrd(el)),
                  getCouleur(el), getEpaisseur(el))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'angle':
                objet = new Angle(this, id, getAbs(el), getOrd(el), el.getAttribute('rayon'),
                  el.getAttribute('angle1'), el.getAttribute('angle2'), getCouleur(el), getEpaisseur(el),
                  getOpaciteFond(el), el.getAttribute('forme'))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'angle_droit':
                objet = new AngleDroit(this, id, el.getAttribute('abscisse_sommet'), el.getAttribute('ordonnee_sommet'),
                  el.getAttribute('abscisse_inter'), el.getAttribute('ordonnee_inter'), getCouleur(el), getEpaisseur(el))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'longueur':
                objet = new MarqueSegment(this, id, getAbs(el), getOrd(el),
                  getCouleur(el), getEpaisseur(el),
                  el.getAttribute('forme'))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'marque':
                objet = new MarqueSeg(this, id, el.getAttribute('idSeg'),
                  getCouleur(el), getEpaisseur(el),
                  el.getAttribute('forme'), el.getAttribute('rayon'))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'texte':
                objet = new Texte(this, id, getAbs(el), getOrd(el), getCouleur(el), el.getAttribute('taille'))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'repere':
                objet = new Repere(this, el.getAttribute('hauteur'), el.getAttribute('largeur'),
                  el.getAttribute('haut'), el.getAttribute('gauche'), el.getAttribute('Xgrad'),
                  el.getAttribute('Ygrad'), el.getAttribute('Xmin'), el.getAttribute('Xmax'),
                  el.getAttribute('Ymin'), el.getAttribute('Ymax'), getCouleur(el),
                  el.getAttribute('grille'), el.getAttribute('axes'), el.getAttribute('etiquettes'))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'quadrillage':
                abscisse_bas_droite = el.getAttribute('abscisse_bas_droite')
                if (abscisse_bas_droite != null) { // Syntaxe non documentée dans la doc
                  abscisse_bas_droite = parseFloat(abscisse_bas_droite) / 30
                  const ordonnee_bas_droite = parseFloat(el.getAttribute('ordonnee_bas_droite')) / 30
                  const abscisse_haut_gauche = parseFloat(el.getAttribute('abscisse_haut_gauche')) / 30
                  const ordonnee_haut_gauche = parseFloat(el.getAttribute('ordonnee_haut_gauche')) / 30
                  objet = new Quadrillage(
                    this,
                    el.getAttribute('quadrillage'),
                    String(ordonnee_bas_droite - ordonnee_haut_gauche),
                    String(abscisse_bas_droite - abscisse_haut_gauche),
                    ordonnee_haut_gauche,
                    abscisse_haut_gauche,
                    getCouleur(el)
                  )
                  action = new ActionCreation(this, 'quadrillageIEP', objet, tempo)
                } else {
                  objet = new Quadrillage(this, el.getAttribute('quadrillage'), el.getAttribute('hauteur'),
                    el.getAttribute('largeur'), el.getAttribute('haut'), el.getAttribute('gauche'), getCouleur(el))
                }
                action = new ActionCreation(this, 'quadrillageIEP', objet, tempo)
                break

              case 'axe':
                objet = new Axe(this, el.getAttribute('pente'), el.getAttribute('largeur'),
                  el.getAttribute('haut'), el.getAttribute('gauche'), el.getAttribute('distanceBord'),
                  el.getAttribute('Xgrad'), el.getAttribute('Xmin'), el.getAttribute('Xmax'), getCouleur(el))
                action = new ActionCreation(this, id, objet, tempo)
                break

              case 'gabarit':
                ecartAngle = el.getAttribute('ecart_angle')
                if (ecartAngle === null) ecartAngle = '-30'
                objet = new Gabarit(this, id, el.getAttribute('abscisse'), el.getAttribute('ordonnee'), el.getAttribute('rayon'),
                  ecartAngle, getCouleur(el), getEpaisseur(el), getCouleurFond(el), getOpaciteTrait(el))
                action = new ActionCreation(this, id, objet, tempo)
                break

              default:
                // Pour ce que j'aurais oublié d'implémenter
                console.error(`objet ${objet} inconnu => création ignorée`)
                action = null
            }

            if (action) {
              this.ajouteAction(action)
              action.setReady()
            }
          }
          break
        case 'montrer':
          ato = el.getAttribute('objet')
          if (estInstrument(ato)) {
            abs = el.getAttribute('abscisse')
            ord = el.getAttribute('ordonnee')
            action = new ActionMontrerInstrument(this, this[ato], abs, ord, tempo)
            if (((ato === 'crayon') || (ato === 'compas')) && (abs != null) && (ord != null)) this[ato].translate(parseFloat(abs), parseFloat(ord))
          } else action = new ActionMontrer(this, id, ato, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'masquer':
          ato = el.getAttribute('objet')
          if (estInstrument(ato)) action = new ActionMasquerInstrument(this, this[ato], tempo)
          else action = new ActionMasquer(this, id, ato, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'tracer':
          ato = el.getAttribute('objet')
          cible = el.getAttribute('cible')
          if (cible != null) {
            objet = this.getElement(cible, 'point') // Le point vers lequel on veut translater l'objet
            abs = objet.xcons
            ord = objet.ycons
          } else {
            abs = parseFloat(getAbs(el))
            ord = parseFloat(getOrd(el))
          }
          switch (ato) {
            case 'crayon':
              forme = el.getAttribute('forme')
              xcrayon = this.crayon.x
              ycrayon = this.crayon.y
              id = getId(el)
              switch (forme) {
                case null: // Cas d'un segment
                  if (isNaN(abs) || isNaN(ord)) { // Cas d'une forme libre pas déclarée
                    objet = new LigneContinue(this, id, this.crayon.x, this.crayon.y, el.getAttribute('abscisses'),
                      el.getAttribute('ordonnees'), getCouleur(el), getEpaisseur(el), getOpaciteTrait(el),
                      getStyleTrait(el), getStyle(el))
                    len = objet.abs.length
                    this.crayon.translate(objet.abs[len - 1], objet.ord[len - 1])
                  } else {
                    objet = new Segment(this, id, xcrayon, ycrayon, abs, ord, getCouleur(el),
                      getEpaisseur(el), getOpaciteTrait(el), getStyleTrait(el), getStyle(el))
                    this.crayon.translate(abs, ord)
                  }
                  break
                case 'droite': // Cas d'une droite
                  if (isNaN(abs) || isNaN(ord)) break
                  objet = new Droite(this, id, xcrayon, ycrayon, abs, ord, getCouleur(el),
                    getEpaisseur(el), getOpaciteTrait(el), getStyleTrait(el), getStyle(el))
                  this.crayon.translate(abs, ord)
                  break
                case 'demidroite': // Cas d'une demi-droite
                  if (isNaN(abs) || isNaN(ord)) break
                  objet = new DemiDroite(this, id, xcrayon, ycrayon, abs, ord, getCouleur(el),
                    getEpaisseur(el), getOpaciteTrait(el), getStyleTrait(el), getStyle(el))
                  this.crayon.translate(abs, ord)
                  break
                case 'polygone':
                  cibles = el.getAttribute('cibles')
                  if (cibles === null) {
                    objet = new Polygone(this, id, el.getAttribute('abscisses'),
                      el.getAttribute('ordonnees'), getCouleur(el), getEpaisseur(el),
                      getCouleurFond(el), el.getAttribute('opacite'))
                  } else {
                    let abs = ''
                    let ord = ''
                    cibles.split(',').forEach((elt, i) => {
                      const sep = (i === 0) ? '' : ','
                      const obj = this.getElement(elt, 'point')
                      abs += sep + obj.xcons
                      ord += sep + obj.ycons
                    })
                    objet = new Polygone(this, id, abs, ord,
                      getCouleur(el), getEpaisseur(el),
                      getCouleurFond(el), el.getAttribute('opacite'))
                  }
                  len = objet.abs.length
                  this.crayon.translate(objet.abs[len - 1], objet.ord[len - 1])
                  break
                case 'libre':
                  objet = new LigneContinue(this, id, this.crayon.x, this.crayon.y, el.getAttribute('abscisses'),
                    el.getAttribute('ordonnees'), getCouleur(el), getEpaisseur(el), getOpaciteTrait(el),
                    getStyleTrait(el), getStyle(el))
                  len = objet.abs.length
                  this.crayon.translate(objet.abs[len - 1], objet.ord[len - 1])
              }
              vitesse = el.getAttribute('vitesse')
              if (vitesse == null) vitesse = '4'
              action = new ActionCreation(this, getId(el), objet, tempo, vitesse)
              this.ajouteAction(action)
              action.setReady()
              break
            case 'trait':
              vitesse = el.getAttribute('vitesse')
              if (vitesse === null) vitesse = 10000 // Instantané si vitesse pas précisé
              objet = new Segment(this, id, el.getAttribute('abscisse1'), el.getAttribute('ordonnee1'),
                el.getAttribute('abscisse2'), el.getAttribute('ordonnee2'), getCouleur(el),
                getEpaisseur(el), getOpaciteTrait(el), getStyleTrait(el), getStyle(el))
              action = new ActionCreation(this, getId(el), objet, tempo, vitesse) // Pas d'animation pour les traits
              this.ajouteAction(action)
              action.setReady()
              break
            case 'compas':
              objet = new Arc(this, id, this.compas.x, this.compas.y, this.compas.ecart,
                this.getAngle(el, 'debut'), this.getAngle(el, 'fin'), getCouleur(el), getEpaisseur(el), getOpaciteTrait(el),
                getStyleTrait(el))
              vitesse = el.getAttribute('sens')
              if (vitesse == null) vitesse = '8'
              action = new ActionCreation(this, getId(el), objet, tempo, vitesse)
              this.ajouteAction(action)
              action.setReady()
              break
            case 'angle_droit': // Certains scripts utilisent tracer au lieu de créer pour les angles droits ...
              objet = new AngleDroit(this, id, el.getAttribute('abscisse_sommet'), el.getAttribute('ordonnee_sommet'),
                el.getAttribute('abscisse_inter'), el.getAttribute('ordonnee_inter'), getCouleur(el), getEpaisseur(el))
              action = new ActionCreation(this, getId(el), objet, tempo, vitesse)
              this.ajouteAction(action)
              action.setReady()
              break
          }
          break
        case 'rotation':
          ato = el.getAttribute('objet')
          sens = el.getAttribute('sens')
          if (estInstrument(ato)) {
            cible = el.getAttribute('cible')
            // Au cas ou un auteur a mis à la fois un attribut cible et un attribut angle,
            // C'est l'attribut angle qui semble l'emporter (constaté par des tests).
            if ((cible != null) && (el.getAttribute('angle') === null)) {
              objet = this.getElement(cible, 'point') // Le point vers lequel on veut translater l'objet
              abs = objet.xcons
              ord = objet.ycons
              v1 = new Vect(this[ato].x, this[ato].y, abs, ord)
              if (v1.presqueNul()) angle = 0
              else angle = -v1.angle()
            } else {
              if (ato === 'compas') angle = this.getAngle(el, 'angle')
              else angle = el.getAttribute('angle')
            }
            action = new ActionRotationInstrument(this, this[ato], angle, tempo, sens)
          } else {
            // On vérifie que l'action est cohérente (que l'objet cible existe)
            if (this.getElement(id, ato) === null) action = null
            else {
              angle = el.getAttribute('angle')
              action = new ActionRotationObjet(this, id, angle, ato, tempo, sens)
            }
          }
          if (action !== null) {
            this.ajouteAction(action)
            action.setReady()
          }
          break
        case 'translation':
          ato = el.getAttribute('objet')
          cible = el.getAttribute('cible')
          // Au cas où on a spécifié abscisse et ordonnée et cible, cible aa priorité
          if (cible != null) {
            objet = this.getElement(cible, 'point') // Le point vers lequel on veut translater l'objet
            abs = objet.xcons
            ord = objet.ycons
          } else {
            abs = parseFloat(getAbs(el))
            ord = parseFloat(getOrd(el))
          }
          vitesse = el.getAttribute('vitesse')
          if (estInstrument(ato)) {
            this[ato].x = abs
            this[ato].y = ord
            action = new ActionTranslationInstrument(this, this[ato], abs, ord, tempo, vitesse)
          } else {
            // On vérifie que l'action est cohérente
            if (this.getElement(id, ato) === null) action = null
            else {
              // Dans le cas où on translate un point il faut modifier ses champs xcons et ycons
              // pour que tout objet ultérieur l'utilisant comme cible soit correctement initialisé
              if (ato === 'point') {
                point = this.getElement(id, 'point')
                point.xcons = abs
                point.ycons = ord
              }
              action = new ActionTranslationObjet(this, id, abs, ord, ato, tempo, vitesse)
            }
          }
          if (action !== null) {
            this.ajouteAction(action)
            if ((ato === 'crayon') || (ato === 'compas')) { this[ato].translate(abs, ord) }
            action.setReady()
          }
          break
        case 'zoom':
          ato = el.getAttribute('objet')
          vitesse = el.getAttribute('vitesse')
          if (estInstrument(ato)) {
            echelle = el.getAttribute('echelle')
            this[ato].zoomfactor = parseFloat(echelle) / 100
            action = new ActionZoomInstrument(this, this[ato], echelle, tempo, vitesse)
          } else {
            // On ne peut zoomer que sur un texte ou une image
            if ((ato === 'texte' || (ato === 'image'))) action = new ActionZoomObjet(this, id, el.getAttribute('echelle'), ato, tempo, vitesse)
            else action = null
          }
          if (action !== null) {
            this.ajouteAction(action)
            action.setReady()
          }
          break
        case 'ecarter':
          cible = el.getAttribute('cible')
          if (cible != null) {
            objet = this.getElement(cible, 'point') // Le point vers lequel on veut translater l'objet
            v1 = new Vect(this.compas.x, this.compas.y, objet.xcons, objet.ycons)
            ecart = v1.norme()
          } else ecart = parseFloat(el.getAttribute('ecart')) * this.compas.zoomfactor
          this.compas.ecart = ecart
          action = new ActionEcarterCompas(this, ecart, tempo, el.getAttribute('vitesse'))
          this.ajouteAction(action)
          action.setReady()
          break
        case 'lever':
          action = new ActionLeverCompas(this, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'coucher':
          action = new ActionCoucherCompas(this, tempo)
          this.ajouteAction(action)
          action.setReady()
          break

        case 'masquer_nombres':
          action = new ActionMontrerNombres(this, false, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'montrer_nombres':
          action = new ActionMontrerNombres(this, true, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'graduations':
          ato = el.getAttribute('objet')
          action = new ActionMontrerGraduations(this, this[ato], true, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'vide':
          ato = el.getAttribute('objet')
          action = new ActionMontrerGraduations(this, this[ato], false, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'retourner':
          this.compasRetourne = !this.compasRetourne
          action = new ActionRetourner(this, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'glisser':
          action = new ActionGlisser(this, el.getAttribute('abscisse'), tempo, el.getAttribute('vitesse'))
          this.ajouteAction(action)
          action.setReady()
          break
        case 'chargement':
          // Attention, pour l'image, pas d'appel de creeAction(ind+1)
          // car c'est une fonction de callBack qui s'en charge une fois l'image chargée
          objet = new Imag(this, id, el.getAttribute('url'))
          objet.prepareAction()
          // Pas de action.setReady car il faut attendre que la figure soit chargée
          break
        case 'ecrire': // Texte
          action = new ActionEcrireTexte(
            this,
            id,
            getCouleur(el),
            el.getAttribute('taille'),
            el.getAttribute('texte'),
            el.getAttribute('style'),
            getCouleurFond(el),
            el.getAttribute('opacite_fond'),
            getCouleurCadre(el),
            el.getAttribute('epaisseur_cadre'),
            el.getAttribute('marge'),
            el.getAttribute('marge_gauche'),
            el.getAttribute('marge_droite'),
            el.getAttribute('marge_haut'),
            el.getAttribute('marge_bas'),
            tempo
          )
          this.ajouteAction(action)
          action.prepare()
          break
        case 'nommer':
          // on regarde si le point à nommer a été créé sinon erreur de script
          if (this.getElement(id, 'point') !== null) {
            // Dans certains script on nommait un point avec une chaîne vide ce qui n'a pas de sens.
            const nomPoint = el.getAttribute('nom')
            if (nomPoint !== '') {
              objet = new NomPoint(this, id, getAbs(el), getOrd(el),
                nomPoint, getCouleur(el))
              action = new ActionNommerPoint(this, objet, tempo)
              this.ajouteAction(action)
              action.prepare()
            }
          }
          break
        case 'pause':
          action = new ActionPause(this, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
        case 'modifier_longueur':
          ato = el.getAttribute('objet')
          action = new ActionModifierLongueur(this, this[ato], el.getAttribute('longueur'), tempo)
          this.ajouteAction(action)
          action.setReady()
          break
          // Modification du rayon d'un gabarit
        case 'modifier_rayon':
          ato = el.getAttribute('objet')
          action = new ActionModifierRayon(this, id, el.getAttribute('rayon'), ato, tempo)
          this.ajouteAction(action)
          action.setReady()
          break
      }
    } catch (error) {
      console.error(error)
      // On ne fait rien si xml incorrect
    }
  }
  // Une fois les actions créées on attend que les éléments asynchrones soient prêts pour continuer
  this.getReadyPromise()
    .then(this.init.bind(this))
    .catch(error => {
      console.error(error)
      window.alert(error.message)
    })
}

/**
 * Si immediat est true, les actions sont exécutées immédiatement, sans animation et sans temporisation
 * @private
 * @param {boolean} immediat
 */
IepDoc.prototype.execute = function execute (immediat) {
  this.indiceActionEnCours = 0
  this.actions[0].execute(immediat)
}

/**
 * Fonction appelée lorsqu'une action a été exécutée pour passer à l'exécution suivante.
 * Si immediat est true, on retourne sans rien faire
 * Si animationECours en false, on revient sans rien faire (pour arrêter une animation en cours)
 * Si l'action.tempo n'est pas nul, on attend action.tempo millièmes de seconde avant de passer à l'action suivante
 * indiceActionEnCours est l'indice de la prochaine action à exécuter
 * @private
 * @param {boolean} [immediat=false]
 */
IepDoc.prototype.actionSuivante = function actionSuivante (immediat) {
  immediat = Boolean(immediat)
  if (!this.animationEnCours && !immediat) {
    // if (this.indiceActionEnCours != this.actions.length-1) this.indiceActionEnCours++;
    return
  } // Pas de passage à l'action suivante pour le mode pas à pas.
  const action = this.actions[this.indiceActionEnCours]
  if ((action.tempo === null) || immediat) {
    this.passageActionSuivante(immediat)
  } else {
    setTimeout(this.passageActionSuivante.bind(this, immediat), action.tempo)
  }
}

/**
 * Fonction appelée par actionSuivante pour passer à l'action suivante
 * indiceActionEnCours est l'indice de la prochaine action à exécuter
 * @private
 * @param {boolean} [immediat=false]
 */
IepDoc.prototype.passageActionSuivante = function passageActionSuivante (immediat) {
  // IL peut arriver qu'on arrive ici alors qu'on a cliqué pour arrêter une animation, cliqué rapidement
  // pour aller à la fin alors que l'animation n'était pas finie...
  if (this.indiceActionEnCours >= this.actions.length) return
  if (this.indiceActionEnCours !== this.actions.length - 1) {
    this.indiceActionEnCours++
    this.actions[this.indiceActionEnCours].execute(immediat)
  } else {
    if (this.animationEnBoucle) {
      const me = this
      setTimeout(function () {
        me.initialise()
        me.indiceActionEnCours = 0
        me.actions[me.indiceActionEnCours].execute(immediat)
      }, 3000) // On attend 3 secondes avant de reboucler
    } else {
      this.indiceActionEnCours++
      this.montreIcones(['Reset', 'PrevStep', 'Restart', 'XML', 'Repeat'])
      this.animationEnCours = false
    }
  }
}

/**
 * Retourne l'attribut angle d'une action
 * @private
 * @param {Element} el element retourné par this.xmldoc.getElementsByTagName("action")[]
 * @returns {string}
 */
IepDoc.prototype.getAngle = function getAngle (el, attribute) {
  const a = el.getAttribute(attribute)
  if (a == null) return null
  if (this.compasRetourne) return String(parseFloat(a) + 180)
  return a
}

/**
 * Fonction rajoutant dans le svg parent des définitions defs qui serot utilisées
 * plusieurs fois dans les icônes (radialGradiant et marker pour la flèche de l'icône restart.
 * On les mets dans le svg barreIcones pour qu'il ne soient pas effacés lors de initialise()
 * @private
 */
IepDoc.prototype.creeElementsPourIcones = function creeElementsPourIcones () {
  let defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.radialGradiant('#9999FF', '#000099', 'radialfonce'))
  this.svg.appendChild(defs)
  defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.radialGradiant('#CCCCCC', '#666666', 'radialclair'))
  this.svg.appendChild(defs)
  defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.radialGradiant('#FF9999', '#FF0000', 'radialrouge'))
  this.svg.appendChild(defs)
  defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.markerArrow('markerarrow'))
  this.barreIcones.appendChild(defs)
  defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.filtreEclairageIcone('filtrebleu'))
  this.barreIcones.appendChild(defs)
  defs = document.createElementNS(svgns, 'defs')
  defs.appendChild(this.filtreEclairageIcone('filtregris'))
  this.barreIcones.appendChild(defs)
}

/**
 * Retourne un radialGradiant utilisé pour le dessin des icônes
 * @param {string} clair la couleur claire de gradiant
 * @param {string} fonce  la couleur focée du gradiant
 * @param {string} id l'id du gradiant
 * @private
 * @returns {SVGRadialGradientElement}
 */
IepDoc.prototype.radialGradiant = function radialGradiant (clair, fonce, id) {
  const rg = document.createElementNS(svgns, 'radialGradient')
  rg.setAttribute('id', id)
  let stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '0%')
  stop.setAttribute('style', 'stop-color:' + fonce + ';')
  rg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '80%')
  stop.setAttribute('style', 'stop-color:' + clair + ';')
  rg.appendChild(stop)
  stop = document.createElementNS(svgns, 'stop')
  stop.setAttribute('offset', '100%')
  stop.setAttribute('style', 'stop-color:' + fonce + ';')
  rg.appendChild(stop)
  return rg
}

/**
 * Retourne un marker qui sera utilisé pour la flèche de l'icône restart
 * @private
 * @param {string} id L'id du marker
 * @returns {SVGMarkerElement}
 */
IepDoc.prototype.markerArrow = function markerArrow (id) {
  const marker = document.createElementNS(svgns, 'marker')
  marker.setAttribute('id', id)
  marker.setAttribute('markerWidth', '4')
  marker.setAttribute('markerHeight', '4')
  marker.setAttribute('refX', '0')
  marker.setAttribute('refY', '2')
  marker.setAttribute('orient', 'auto')
  const pathm = document.createElementNS(svgns, 'path')
  pathm.setAttribute('d', 'M 0 0 2 2 0 4 Z')
  pathm.setAttribute('style', 'fill:white;')
  marker.appendChild(pathm)
  return marker
}

/**
 * Foncion renvoyant un filtre qui sera utilisé pour donner un aspect de relief aux icônes
 * creeElementsPourIcones
 * @private
 * @param {string} id L'id du filtre
 * @returns {SVGFilterElement}
 */
IepDoc.prototype.filtreEclairageIcone = function filtreEclairageIcone (id) {
  const filter = document.createElementNS(svgns, 'filter')
  filter.setAttribute('x', '0')
  filter.setAttribute('y', '0')
  filter.setAttribute('width', '100%')
  filter.setAttribute('height', '100%')
  filter.setAttribute('color-interpolation-filters', 'sRGB')
  const dl = document.createElementNS(svgns, 'feDiffuseLighting')
  dl.setAttribute('lighting-color', 'white')
  dl.setAttribute('surfaceScale', '1')
  dl.setAttribute('diffuseConstant', '1.2')
  dl.setAttribute('in', 'SourceGraphic')
  dl.setAttribute('result', 'diffOut')
  const pointLight = document.createElementNS(svgns, 'fePointLight')
  pointLight.setAttribute('x', '5')
  pointLight.setAttribute('y', '5')
  pointLight.setAttribute('z', '15')
  dl.appendChild(pointLight)
  filter.appendChild(dl)
  const fc = document.createElementNS(svgns, 'feComposite')
  fc.setAttribute('in', 'SourceGraphic')
  fc.setAttribute('in2', 'diffOut')
  fc.setAttribute('operator', 'arithmetic')
  fc.setAttribute('k1', '1')
  fc.setAttribute('k2', '0')
  fc.setAttribute('k3', '0')
  fc.setAttribute('k4', '0')
  filter.appendChild(fc)
  filter.setAttribute('id', id)
  return filter
}

/**
 * Retourne une fenêtre contenant le code XML de la figure
 * @private
 * @return {Window}
 */
IepDoc.prototype.popup = function popup () {
  // ouvre une fenetre sans barre d'etat, ni d'ascenceur
  const w = window.open('', 'popup', 'width=700,height=450,toolbar=no,scrollbars=no,resizable=yes')
  w.iepDoc = this
  const doc = w.document
  doc.title = 'Code Xml de la figure'
  const div = doc.createElement('div')
  const form = doc.createElement('form')
  div.appendChild(form)
  div.setAttribute('align', 'center')
  doc.body.appendChild(div)
  const ta = doc.createElement('textarea')
  form.appendChild(ta)
  ta.setAttribute('cols', 80)
  ta.setAttribute('rows', 25)
  ta.setAttribute('readonly', true)
  ta.style.fontSize = '13px'
  ta.scrollIntoView()
  // Si le script ne comporte pas de retours à la ligne (une seule ligne), on en rajoute
  let ch = this.codexml
  ch = ch.replace(/>\s*</g, '>\n<')
  ta.appendChild(document.createTextNode(ch))
  ta.select()
  // w.onbeforeunload = function(){this.iepDoc.windowxml = null;};
  const iepDoc = this
  w.addEventListener('unload', () => { iepDoc.windowxml = null })
  return w
}
