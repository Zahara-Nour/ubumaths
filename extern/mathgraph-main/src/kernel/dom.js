// qq fcts utiles pour manipuler le dom
import { getAbsolutePath } from './kernel'

const svgns = 'http://www.w3.org/2000/svg'

/**
 * Ajoute une image dans ct
 * @param {HTMLElement} ct
 * @param {string} imgName Le nom de l'image (dans src/images, si y'a pas d'extension on ajoute .png)
 * @param {object} options
 * @param {string} [options.alt]
 * @param {string} [options.width]
 * @param {string} [options.height]
 * @returns {HTMLImageElement}
 */
export function addImg (ct, imgName, { alt = '', width = 22, height = 22 } = {}) {
  const img = ce('img')
  img.setAttribute('alt', alt)
  if (width) img.setAttribute('width', `${width}px`)
  if (height) img.setAttribute('height', `${height}px`)
  ct.appendChild(img)
  // on ajoute l'image avec un import dynamique, mais il faut préciser l'extension dans l'import (vite l'exige)
  let suffix = 'png'
  if (imgName.includes('.')) {
    // on pourrait avoir deux points dans le nom, on ne fait donc pas de split mais une regexp
    const [, f, s] = /(.*)\.([^.]*)$/.exec(imgName)
    if (!['png', 'gif'].includes(s)) throw Error(`Suffixe ${s} non géré (png|gif seulement)`)
    imgName = f
    suffix = s
  }
  const p = suffix === 'gif'
    ? import(`src/images/${imgName}.gif`)
    : import(`src/images/${imgName}.png`)
  p.then(({ default: src }) => {
    // pour que ça fonctionne en CORS il faut une url absolue
    img.setAttribute('src', getAbsolutePath(src))
  })
    .catch(error => console.error(error))
  return img
}

/**
 * Crée un élément de tag name avec les attributs de l'objet att passés en paramètre
 * et le retourne
 * @param {string} name
 * @param {Object} [attrs]
 * @returns {HTMLElement}
 */
export function ce (name, attrs) {
  const element = document.createElement(name)
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      element.setAttribute(key, value)
    }
  }
  return element
}

/**
 * Ajoute un élément dans parent (de tag name avec les attributs att)
 * @param {HTMLElement} parent
 * @param {string} name
 * @param {Object<string, string>} [attrs]
 * @param {string} [textContent]
 * @returns {HTMLElement}
 */
export function ceIn (parent, name, attrs, textContent) {
  if (typeof attrs === 'string') {
    textContent = attrs
    attrs = null
  }
  const element = ce(name, attrs)
  if (textContent) element.appendChild(ctn(textContent))
  parent.appendChild(element)
  return element
}

/**
 * Créer un élément name dans le namespace http://www.w3.org/2000/svg
 * @param {string} name tag à créer
 * @param {TagAttributes} att ses attributs
 * @returns {SVGElement}
 */
export function cens (name, att) {
  const element = document.createElementNS(svgns, name)
  if (att) {
    for (const [key, value] of Object.entries(att)) {
      element.setAttribute(key, value)
    }
  }
  /* Supprimé. Inutile (avait été ajouté version MathJax 3)
  if (name === "svg") {
    element.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    element.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  }
  */
  return element
}

/**
 * Crée un TextNode et le retourne (sans l'ajouter dans le dom)
 * @type {function}
 * @param {string} text
 * @return {Text}
 */
export const ctn = (text) => document.createTextNode(text)
/**
 * Crée un TextNode et l'ajoute dans ct
 * @param {HTMLElement} ct
 * @param {string} text
 */
export function addText (ct, text) {
  if (!ct) return console.error(Error('conteneur manquant'))
  ct.appendChild(ctn(text))
}
/**
 * Vide elt
 * @param {HTMLElement} elt
 */
export function empty (elt) {
  while (elt?.lastChild) elt.removeChild(elt.lastChild)
}

/**
 * Retourne true si l'élément est en display none ou qu'il a un parent en display none (mais ça peut renvoyer false et être en visibility hidden)
 * @param {Element} elt
 * @returns {boolean}
 * /
export function hasDisplayNone (elt) {
  if (!elt) {
    console.error(Error('isDisplayed appelé sans élément'))
    return false
  }
  if (elt?.style?.display === 'none') return true
  while (elt?.parentElement) {
    if (elt.parentElement?.style?.display === 'none') return true
    elt = elt.parentElement
  }
  return false
} /* */

/**
 * Alias de getElementById (qui warn en console si ça n'existe pas,
 * sauf avec lax=true où c'est silencieux)
 * @param {string} id
 * @param {boolean} [lax=false] Passer true pour rester silencieux si #{id} n'existe pas
 * @returns {HTMLElement}
 */
export function ge (id, lax = false) {
  const elt = document.getElementById(id)
  if (!elt && !lax) console.warn(`Aucun élément #${id} dans le dom`)
  return elt
}

/**
 * Retourne le premier parent qui est un HTMLElement (null si on en trouve pas)
 * @param {Element|null} elt
 * @return {HTMLElement|null}
 */
export function getFirstHtmlParent (elt) {
  if (!elt) return null
  let parent = elt.parentElement
  while (parent?.parentElement && !/^\[object HTML.*Element\]/.test(Object.prototype.toString.call(parent))) parent = parent.parentElement
  return parent
}

/**
 * Retourne un id qui n'existe pas dans le DOM (prefix + num)
 * @param {string} prefix
 * @returns {string}
 */
export function getNewId (prefix = 'mtg') {
  let i = 1
  while (ge(`${prefix}${i}`, true)) i++
  return `${prefix}${i}`
}

/**
 * Lance le chargement d'un script et résoud la promesse quand c'est fait (ou la rejette en cas de timeout)
 * @param {string} url
 * @param {object} [opts]
 * @param {string} [opts.type=text/javascript] le type à mettre sur le tag script
 * @param {object} [opts.timeout=30_000] timeout en ms
 * @returns {Promise<void>}
 */
export function loadScript (url, opts) {
  const type = opts?.type ?? 'text/javascript'
  return new Promise((resolve, reject) => {
    const script = ce('script', { type })
    document.body.appendChild(script)
    const timeout = opts?.timeout ?? 30_000
    // on devrait virer le listener si on rejette, mais il sera visiblement jamais appelé,
    // et s'il l'était ça changerait rien, la promesse sera déjà rejetée
    const timerId = setTimeout(() => reject(Error(`Timeout : impossible de charger ${url} (après ${Math.round(timeout / 1000)}s d’attente)`)), timeout)
    script.addEventListener('load', () => {
      clearTimeout(timerId)
      resolve()
    }, { once: true })
    script.src = url
  })
}

/**
 * Affecte les attributs attrs à l'élément elt
 * @param {HTMLElement|SVGElement|string} elt
 * @param {Object} attrs Les propriétés sont les noms des attributs (et les valeurs devraient être des strings)
 */
export function setAttrs (elt, attrs) {
  const e = typeof elt === 'string' ? ge(elt) : elt
  if (!e) return console.error(Error(`Impossible d’affecter des attributs à un élément inexistant ${typeof elt === 'string' ? `(#${elt})` : ''}`))
  for (const [attr, value] of Object.entries(attrs)) {
    try {
      e.setAttribute(attr, value)
    } catch (error) {
      console.error(`Impossible d'affecter l’attribut ${attr} avec ${value} sur`, elt, error)
    }
  }
}

/**
 * Affecte chaque propriété de style à l'élément
 * @param {HTMLElement|SVGElement|string} elt
 * @param {Object} style Les propriétés devraient être des propriété de style existantes pour l'élément et les valeurs des strings
 */
export function setStyle (elt, style) {
  const e = typeof elt === 'string' ? ge(elt) : elt
  if (!e) return console.error(Error(`Impossible d’affecter le style d’un élément inexistant ${typeof elt === 'string' ? `(#${elt})` : ''}`))
  for (const [attr, value] of Object.entries(style)) {
    try {
      e.style[attr] = value
    } catch (error) {
      console.error(`Pb pour affecter ${value} dans style.${attr}`, error)
    }
  }
}

/**
 * Copie text dans le presse-papiers (ne plante pas si ça marche pas, la promesse sera résolue avec false dans ce cas)
 * @param {string} text
 * @return {Promise<boolean>} true si ça a été copié, false sinon
 */
export async function copyToClipBoard (text) {
  try {
    if (navigator.clipboard) {
      // Cf https://developer.mozilla.org/fr/docs/Web/API/Clipboard#disponibilit%C3%A9_du_presse-papiers
      // il faudrait normalement utiliser l'api Permission
      // https://developer.mozilla.org/fr/docs/Web/API/Permissions_API
      // pour y accéder, mais tous les navigateurs ne l'implémentent pas de la même manière
      // https://developer.mozilla.org/fr/docs/Web/API/Clipboard#disponibilit%C3%A9_du_presse-papiers
      await navigator.clipboard.writeText(text)
      return true // si writeText plante c'est parti dans le catch
    }
    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

/**
 * Copie le contenu de elt dans le presse-papiers (ne plante pas si ça marche pas, la promesse sera résolue avec false dans ce cas)
 * @param {HTMLElement} elt
 * @return {Promise<boolean>} true si ça a été copié, false sinon
 */
export async function copyContentToClipBoard (elt) {
  try {
    const text = elt.textContent
    // on tente d'abord la méthode moderne
    if (await copyToClipBoard(text)) return true
    // on tente le deprecated execCommand
    if (typeof document.execCommand === 'function') {
      elt.select()
      return document.execCommand('copy')
    }
    // ça veut pas :-/
    return false
  } catch (error) {
    console.error(error)
    return false
  }
}

/**
 * Impose le style du conteneur du svg, pour un calcul correct des positionnements
 * (input & boites de dialogue)
 * @param {HTMLElement} container
 * @param {number} height
 * @param {number} width
 */
export function fixSvgContainer ({ container, height, width, svg }) {
  container.style.boxSizing = 'border-box'
  // on lui impose un positionnement relatif, sauf s'il est déjà en absolu
  if (container.style.position !== 'absolute') container.style.position = 'relative'
  container.style.margin = '0'
  container.style.padding = '0'
  container.style.border = 'none'
  // on lui colle la taille imposée
  container.style.width = width + 'px'
  container.style.height = height + 'px'
  // et on passe au svg
  svg.setAttribute('width', width)
  svg.setAttribute('height', height)
  // Ajouté par Yves version 6.6.1 pour même fonctionnement dans le player que dans l'application
  svg.setAttribute('shape-rendering', 'geometricPrecision')
  // il faut aussi le forcer à coller à container (qui sert pour le positionnement des inputs et boites de dialogue)
  svg.setAttribute('style', `position:absolute;top:0;left:0;margin:0;padding:0;border:none;background-color:#ffffff;width:${width}px;height:${height}px;`)
}
