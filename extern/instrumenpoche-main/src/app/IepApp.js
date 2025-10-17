/*
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Yves Biton <yves.biton@sesamath.net>
 * @licence AGPL-3.0-or-later
 */
import IepDoc from './IepDoc'
export default IepApp

/**
 * Provoque la fermeture des éventuelles fenêtres popup (à priori onglets du navigateur)
 * contenant le code XML d'une figure (obtenues en cliquant sur l'icône XML)
 * Appelé à la fermeture d'une fenêtre contenant un lecteur
 * @private
 */
function closeAllXMLWindows (iepApp) {
  iepApp.docs.forEach(doc => {
    if (doc.windowxml) doc.windowxml.close()
  })
}

/**
 * Lecteur d'animations, qui peut gérer plusieurs figures instrumenPoche dans des svg différents
 * @param {Object} [options]
 * @param {boolean} [options.debug] passer true pour avoir des infos de debug en console
 * @constructor
 */
function IepApp (options) {
  this.debug = Boolean(options && options.debug)
  if (this.debug) console.log('Mode debug activé')
  this.docs = []
  window.addEventListener('unload', closeAllXMLWindows.bind(null, this))
}

/**
 * Ajoute une animation au lecteur
 * @param {string|Element} svg Le svg (l'élément du dom ou son id) dans lequel va se jouer l'animation
 * @param {string} xml La chaîne XML du script de l'animation
 * @param {boolean} [autoStart=true] Passer false pour ne pas démarrer l'animation dès le chargement
 */
IepApp.prototype.addDoc = function addDoc (svg, xml, autoStart = true) {
  if (typeof svg === 'string') svg = document.getElementById(svg)
  if (!svg) return new Error('svg manquant')
  if (svg.localName !== 'svg') return new Error('svg incorrect')
  const options = {
    autoStart,
    debug: this.debug
  }
  const doc = new IepDoc(svg, xml, options)
  this.docs.push(doc)
  svg.iepDoc = doc // Pour que les boutons accèdent au document.
  return doc
}

/**
 * Supprime toutes les animations passées au lecteur
 */
IepApp.prototype.flush = function flush () {
  // on ferme les fenêtres xml éventuelles
  this.closeAllXMLWindows()
  // on vire tous les svg du dom
  this.docs.forEach(({ svg }) => {
    if (svg.parentNode) svg.parentNode.removeChild(svg)
    else console.error('le svg', svg, 'n’a pas de parentNode')
  })
  // et on vire les docs de iepApp
  this.docs = []
}

/**
 * Retourne les animations du lecteur
 * @return {IepDoc[]}
 */
IepApp.prototype.getDocs = function getDocs () {
  return this.docs
}
/**
 * Retourne la dernière animation ajoutée (null si addDoc n'a pas été appelé, depuis sa création ou le dernier flush)
 * @return {IepDoc}
 */
IepApp.prototype.getLastDoc = function getLastDoc () {
  const length = this.docs.length
  if (!length) return null
  return this.docs[length - 1]
}
