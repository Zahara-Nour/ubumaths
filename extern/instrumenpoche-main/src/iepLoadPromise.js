/* Loader qui retourne une promesse
 *
 * Visualiseur InstrumenPoche en Javascript et SVG
 * @author Association Sésamath
 * @licence AGPL-3.0-or-later
 */
import IepApp from './app/IepApp'
import { addElement, empty, setStyles } from 'sesajstools/dom'

import '../styles/iep.css'

// pour avoir un singleton sur l'appli
let iepApp

// à propos de viewbox & viewport
// https://la-cascade.io/comprendre-svg-viewbox-et-viewport/
// https://developer.mozilla.org/fr/docs/Web/SVG/Attribute/viewBox
// https://la-cascade.io/comprendre-svg-viewbox/
// https://la-cascade.io/comprendre-svg-preserveaspectratio/
// attention aussi à svg.style.width qui prend le pas sur svg.width
// c'est le constructeur IepDoc qui va set le viewBox

// il y a eu une version avec du resize auto dans le commit 8a3db59
// https://framagit.org/Sesamath/instrumenpoche/-/blob/8a3db5973b1e517316e63d0790f14d7a8abe0cfe/sources/iepLoaderPromise.js
// (voir aussi cette version pour l'usage de https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver sur le svg)
// ça donnait des résultats rigolos par ex avec http://localhost:8081/#xml1 (après avoir lancé `pnpm start`)
// et ça montre qu'il y a plein d'animations iep existantes avec du monde caché hors du viewport
// Il y a aussi parfois la règle qui sort du cadre, et on ne veut pas réduire l'animation pour la voir en entier.
// => on abandonne cette idée de resize auto d'après svg.getBBox()

/**
 * @typedef iepLoadOptions
 * @property {boolean} [autostart=true] Passer false pour que l'animation ne démarre pas dès son chargement
 * @property {boolean} [debug=false] Passer true pour voir passer les infos de debug en console
 * @property {boolean} [zoom=false] Passer true pour ajouter les boutons de zoom (dans le parent du svg)
 */

/**
 * Charge une animation iep et retourne une promesse
 * @module
 * @param {HTMLElement} container
 * @param {string} xml Le script xml ou son url (absolue !)
 * @param {iepLoadOptions} [options]
 * @return {Promise<IepApp>}
 */
export default function iepLoadPromise (container, xml, options) {
  if (typeof options !== 'object') options = {}

  return Promise.resolve().then(() => {
    if (typeof window === 'undefined' || !window.document) throw Error('iepLoad doit être utilisé dans un navigateur')
    if (typeof container === 'string') container = document.getElementById(container)
    if (!(container instanceof HTMLElement)) throw Error('Conteneur html manquant')
    if (typeof xml !== 'string') throw Error('Script xml manquant')
    if (/^http/.test(xml)) return loadXml(xml)
    return xml
  }).then(xml => {
    if (!xml || !/<INSTRUMENPOCHE/.test(xml)) throw Error('Ce n’est pas un script instrumenpoche valide')
    // Il y a bcp de scripts existants contenant des images en http://*.sesamath.net/…
    // pour ceux-là on passe en https
    if (window.location.protocol === 'https:') {
      xml = xml.replace(/http:\/\/([a-z]+.sesamath.net)/g, (strMatched, domain) => `https://${domain}`)
    }
    // tant pis pour les autres, ça se chargera pas…

    // on ne fixe plus de taille (ni div ni svg, le svg va s'adapter)
    // const width = options.width || container.offsetWidth || 800
    // const height = options.height || width * 0.75 || 600

    // On réinitialise le conteneur
    empty(container)
    // que l'on positionne (pour que le absolute des enfants se fasse par rapport à lui), avec d'éventuels scroll
    // (Il y avait avant 'font-weight': 'normal', 'font-family': '"Times New Roman", Times, serif' qui a été viré pour utilisation MathJax 3
    setStyles(container, { position: 'relative', overflow: 'auto' })

    const svg = addSvg(container)
    const iepOptions = {}
    if (options.debug) iepOptions.debug = true
    if (!iepApp) iepApp = new IepApp(iepOptions)
    const autostart = typeof options.autostart === 'boolean' ? options.autostart : true
    iepApp.addDoc(svg, xml, autostart)
    // il faut ajouter le zoom après le script iep, car il utilise la viewBox mise par IepDoc sur le svg
    if (options.zoom) addZoom(svg)
    return iepApp
  })
}

/**
 * Retourne le svg créé avec les bonnes options
 * @private
 * @param {HTMLElement} container
 * @return {SVGElement} le svg
 */
function addSvg (container) {
  // pour créer le svg, addElement marche pas (il reste à 0 de hauteur), il faut passer par createElementNS
  // et surtout pas mettre de https sur le ns !
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  // faut éviter d'utiliser la propriété className avec du svg (https://developer.mozilla.org/fr/docs/Web/API/Element/className#Notes)
  // mais y'a pas de pb avec https://developer.mozilla.org/fr/docs/Web/API/Element/classList
  svg.classList.add('svgIep')
  container.appendChild(svg)

  // au resize du conteneur faut resize le svg, mais l'événement resize n'existe que sur window
  // (y'a bien Resize Observer mais c'est pas encore dans la spec, trop frais)
  // => on met le svg en 100% et il suivra le div tout seul (c'est IepDoc qui fixe la viewBox)
  // et on a plus besoin de listener sur le resize
  setStyles(svg, {
    margin: 0,
    padding: 0,
    // avec 100% on a des pbs de clignotement des ascenseurs, à 98% jamais d'ascenseur… et ça ajoute un peu de marge, pas plus mal
    width: '98%',
    height: '98%'
  })

  return svg
}

/**
 * Ajoute les boutons de zoom
 * @private
 * @param {HTMLElement} svg
 * @return {Promise<HTMLElement>}
 */
function addZoom (svg) {
  const container = svg.parentNode
  // on le rend resizable (cf https://developer.mozilla.org/en-US/docs/Web/CSS/resize et https://caniuse.com/#feat=css-resize)
  container.style.resize = 'both'
  container.style.padding = '0'
  container.style.border = '1px solid black'

  const styleBtn = {
    position: 'absolute',
    zIndex: 99,
    textAlign: 'center',
    padding: 0,
    width: '2.5em',
    height: '1.8em',
    left: '0.1em'
  }
  const buttonZoomIn = addElement(container, 'button', { style: { ...styleBtn, top: '0.1em' } }, '+')
  buttonZoomIn.addEventListener('click', () => svg.iepDoc.zoom(1.1), false)
  const buttonZoomOut = addElement(container, 'button', { style: { ...styleBtn, top: '2em' } }, '-')
  buttonZoomOut.addEventListener('click', () => svg.iepDoc.zoom(0.9), false)
  // const buttonZoomNone = addElement(container, 'button', { style: { ...styleBtn, top: '4em' } }, '=')
  // buttonZoomNone.addEventListener('click', () => svg.iepDoc.zoom(1), false)
}

// à priori plus besoin
// function getSize (elt) {
//   const st = getComputedStyle(elt)
//   const width = Math.max(100, parseInt(st.width, 10) || 800)
//   const height = Math.max(0.5 * width, parseInt(st.height, 10) || 600)
//   return { width, height }
// }

function loadXml (url) {
  // faut charger le xml externe, on check que c'est faisable
  if (window.location.protocol === 'https:' && url.substr(0, 5) === 'http:') {
    return Promise.reject(Error(`Impossible de charger ici un script externe qui n’est pas en https (${url})`))
  }
  return fetch(url, { Accept: 'text/xml' }).catch(error => {
    // on catch les erreurs réseau (pas de réseau, pb de cross domain, etc.)
    // pour renvoyer une erreur plus compréhensible
    console.error(error)
    throw Error(`Impossible de récupérer le xml ${url}`)
  }).then(response => {
    const { status, statusText, ok } = response
    if (status > 399) throw Error(`Impossible de récupérer le xml ${url} (erreur ${status} ${statusText})`)
    if (!ok) throw Error(`Impossible de récupérer le xml ${url}`)
    return response.text()
  }).then(xml => {
    if (!xml || !/<INSTRUMENPOCHE/.test(xml)) throw Error(`L’url ${url} ne retourne pas de script instrumenpoche en xml`)
    return xml
  })
}
