/*!
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 * Version 9.4.0
 */
import constantes from 'src/kernel/constantes'

// ce js peut être exécuté dans node, window n'existe pas forcément !
const win = typeof window === 'object' ? window : globalThis

// utilisé par notify pour ne pas notifier plusieurs fois la même erreur
const notifications = new Set()

export const maxLastFig = 6
export const languages = ['de', 'en', 'es', 'fr']
const defaultLanguage = 'fr'
const languagesTranslation = {
  deu: 'de',
  eng: 'en',
  fra: 'fr',
  spa: 'es',
}
let currentLanguage

export const mimeType = 'application-x/MathGraph32'
export const mtgFileExtension = 'mgj'
// Constantes pour gérer la loupe
export const radiusLens = 50
export const decxLens = -10
export const decyLens = -60
export const ratioLens = 1.4
export const circleLensOpacity = 0.2
export const svgLensOpacity = 0.7

/**
 * Retourne l'url absolue
 * @returns {string} url relative (ou déjà absolue)
 */
export function getAbsolutePath (url) {
  if (/^(https?|file|data):/.test(url)) return url
  const baseUrl = import.meta?.url
    ? import.meta.url.replace(/^(https?:\/\/[^/]+)\/.*/, '$1')
    : ''
  const sep = url.startsWith('/') ? '' : '/'
  return baseUrl + sep + url
}

/**
 * Retourne l'url de base de MathJax (qui se termine par MathJax3/)
 * @returns {string}
 */
export function getMathjaxBase () {
  if (win.mathjax3Base) return win.mathjax3Base
  if (win.location?.hostname === 'localhost' || /\.sesamath.dev$/.test(win.location?.hostname)) {
    return 'https://dev.mathgraph32.org/js/MathJax3/'
  }
  return 'https://www.mathgraph32.org/js/MathJax3/'
}

const _digit64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+#'
const _digit64Standard = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// Ajout version 5.0.3 pour modification de testToile
const SHORT_MIN_VALUE = -32768
export const SHORT_MAX_VALUE = +32767

// DataInputStream.numeroVersionActif = 17; // Changé version 5.4
// DataInputStream.numeroVersionActif = 18 // Changé version 6.0
// déplacé ici pour éviter un pb de dépendance cyclique
// export const version = 19 // Changé version 6.6 car maintenant chaque élément a un tag (chaîne vide par défaut)
// export const version = 20 // Version 8.0.0 : On change le numéro de version car tous les objets graphiques ont maintenant une transparence
// export const version = 21 // Version 8.1.1 : Les affichages peuvent maintenant être punaisés
// export const version = 22 // Version 8.8.0 : Tout passe en police Roboto avec correction de taille pour les versions 21 et précédentes au chargement de la figure
// On corrigera dans CAffLiePt.read la taille des affichages pour tenir compte du fait que Roboto prend plus
// de place en largeur pour une même taille de police ex pixels
export const version = 23 // Version 9.0.0 : on enregistre maintenant avec la figure sa largeur mini et sa hauteur mini
export const ConvDegRad = Math.PI / 180
export const ConvRadDeg = 180 / Math.PI
/**
 * @typedef KernelUniteAngle
 * @type {(0|1|'radian'|'degre')}
 */
/**
 * Constante pour l'unité radian
 * @type {KernelUniteAngle}
 */
export const uniteAngleRadian = 0
export const uniteAngleDegre = 1
export const erreurCalculException = 'Erreur de calcul'
export const NombreMaxiTermesSuiteRec = 100000
export const MIN_VALUE = -2147483648
export const MAX_VALUE = 2147483647
export const cos30 = Math.cos(30 * ConvDegRad)
export const sin30 = 0.5
// Ajout version mtgApp pour gérer les écarns tactiles ou non //
export const distMinForTouch = 20
export const distMinForMouse = 10

/**
 * @typedef {Object} TagAttributes
 * @type {Object}
 * @enum {string}
 */

/**
 * Retourne la première langue de l'url ou du navigateur qui match une des notres, notre langue par défaut sinon
 * @return {string} Une langue gérée
 * @private
 */
function getContextLang () {
  try {
    // on regarde si on trouve du ?language=… dans l'url
    const url = new URL(window.location.href)
    const lang = url.searchParams.get('language') || url.searchParams.get('lang')
    if (lang) {
      if (languages.includes(lang)) return lang
      if (languagesTranslation[lang]) return languagesTranslation[lang]
    }
    // on prend le premier qui match notre liste
    // cf https://developer.mozilla.org/fr/docs/Web/API/Navigator/languages
    for (const lang of win.navigator?.languages ?? []) {
      for (const knownLang of languages) {
        // lang peut être un code à 2 caractères comme 'fr' ou à 5 comme 'fr-FR'
        if (lang === knownLang || lang.startsWith(knownLang + '-')) return knownLang
      }
    }
  } catch (error) {
    console.error(error)
  }
  return defaultLanguage
}

/**
 * Retourne le code langue (à 2 lettres) courant.
 * (le détermine s'il n'existait pas)
 * @returns {string}
 */
export function getLanguage () {
  // si on a déjà déterminé la langue on la retourne
  if (!currentLanguage) {
    currentLanguage = getContextLang()
  }
  return currentLanguage
}

/**
 * Change de langue (si languageWanted est fourni et connu on le prend, sinon réinitialise la langue d'après l'url ou les préférences du navigateur)
 * @param {string} [languageWanted]
 * @return {string} Le langage réellement affecté
 */
export function setLanguage (languageWanted) {
  currentLanguage = languages.includes(languageWanted)
    ? languageWanted
    : languagesTranslation[languageWanted]
      ? languagesTranslation[languageWanted]
      : getContextLang()
  return currentLanguage
}

/**
 * Ensemble des textes de l'appli dans la langue demandée au chargement (sinon celle préférée du navigateur).
 * Sera peuplé par loadTextes d'après la langue choisie (une seule dans le dom, le dernier appel écrase les précédents).
 * @private
 * @type {Object<string, string>}
 */
export const textes = {}

/**
 * Renvoie la chaine correspondante au textCode suivant la langue préférée du navigateur.
 * @param {string} textCode le "code" du texte, propriété des objets exportés par les différentes src/textes/*.js
 * @param {Object} [options]
 * @param {Object} [options.lax=false] passer true pour que ça ne râle pas en console si textCode ne correspond pas à une clé connue de textes
 * @param {Object<string, string>} [options.values] passer des key/value pour remplacer dans le texte les occurrences de #key# par value
 * @returns {string}
 */
export function getStr (textCode, { lax = false, values = null } = {}) {
  // on retourne une string vide sans râler si on nous passe pas de textCode
  if (!textCode) return ''
  let txt = textes[textCode] || ''
  if (!txt && !lax) {
    console.warn(Error(`Le texte ${textCode} n’existe pas`), textes)
  } else if (values) {
    for (const [key, value] of Object.entries(values)) {
      const re = new RegExp(`#${key}#`, 'g')
      txt = txt.replace(re, value)
    }
  }
  return txt
}

// inspiré de https://github.com/jamiebuilds/tinykeys/blob/e0d23b4f248af59ffbbe52411505c3d681c73045/src/tinykeys.ts#L50-L54
export const isApple = /Mac|iPod|iPhone|iPad|iOS|darwin/i.test(win.navigator?.userAgentData?.platform || win.navigator?.platform)
export const isIphoneOrIpad = /iPod|iPhone|iPad|iOS|Mac OS X/i.test(win.navigator?.userAgentData?.platform || win.navigator?.userAgent) && (win.navigator?.maxTouchPoints > 1)
export const isAndroidDevice = /android/i.test(win.navigator?.userAgentData?.platform || win.navigator?.userAgent)
export const isMobileDevice = isIphoneOrIpad || isAndroidDevice

/**
 * Fonction renvoyant true si la valeur absolue de x est inférieure à 10^-9
 * @param {number} x
 * @returns {boolean}
 */
export function zero (x) {
  return (Math.abs(x) < 1e-9)
}

/**
 * Fonction renvoyant true si la valeur absolue de x est inférieure à 10^-11
 * @param {number} x
 * @returns {boolean}
 */
export function zero11 (x) {
  return (Math.abs(x) < 1e-11)
}

/**
 * Fonction renvoyant true si la valeur absolue de x est inférieure à 10^-11
 * @param {number} x
 * @returns {boolean}
 */
export function zero13 (x) {
  return (Math.abs(x) < 1e-13)
}

// Modifié version 5.1 pour tenir compte d'une écriture scientifique
/**
 * Renvoie une chaîne de caractères reprséentant le nombre number avec
 * digits décimales.
 * @param {number} number
 * @param {number} digits
 * @param {boolean} decimalDot passer à false pour que le séparateur décimal des affichages soit la virgule
 * @returns {string}
 */
export function chaineNombre (number, digits, decimalDot = true) {
  let ind, exp, nb
  if (number === 0) return '0'
  if (number === Number.NEGATIVE_INFINITY) return '-∞'
  if (number === Number.POSITIVE_INFINITY) return '∞'
  let ch = number.toFixed(digits)
  const indexp = ch.indexOf('e')
  if (indexp === -1) exp = ''
  else {
    exp = ch.substring(indexp)
    ch = ch.substring(0, indexp)
    nb = parseFloat(ch)
    ch = nb.toFixed(digits)
  }
  let i = ch.length - 1
  if ((ind = ch.indexOf('.', 0)) !== -1) {
    while ((i >= ind) && (ch.charAt(i) === '0' || ch.charAt(i) === '.')) i--
    ch = ch.substring(0, i + 1)
  }
  if (!decimalDot) ch = ch.replaceAll('.', ',')
  if (ch === '-0') return '0' + exp
  // else return ch; // Modification version 4.9.2. On rajoute un espace si le nombre est négatif après le signe -
  if (ch.charAt(0) === '-') return '- ' + ch.substring(1) + exp
  else return ch + exp
}
/**
 * Fonction renvoyant une chaîne de caractères codant en base 64 le tableau de bytes ba.
 * Si la dimension du tableau n'est pas un multiple de 3, un ou deux zéros lui sont ajoutés et la chaîne
 * de caractères se termine par un ou deux caractères =
 * @param {string[]} ba  Un tableau de caractères qui représentent des bytes
 * @param {boolean} bstandard  Si true on encode de façon standard sinon avec encodage mathGraph32 avec / remplacé par  #
 * @returns {string}
 */
export function base64Encode (ba, bstandard) {
  // Il faut que la dimension du tableau de bytes soit un multiple de 3 (3 bytes seront codés sur 4 caractères)
  // A noter que un ou deux bytes mis à zéro de plus seront peut-être codés. Pour chacun on mettra un signe = à la fin
  // de la chaîne de caractères
  const digit = bstandard ? _digit64Standard : _digit64
  const len = ba.length
  const r = len % 3
  const q = Math.floor((len - 1) / 3)
  const q2 = q + 1
  if (r !== 0) {
    const ba2 = new Array(q2 * 3)
    for (let j = q * 3 + r; j < q2 * 3; j++) ba2[j] = 0
    for (let k = 0; k < len; k++) ba2[k] = ba[k]
    ba = ba2
  }
  let ch = ''
  for (let i = 0; i < q2 * 3; i += 3) {
    const n = ((ba[i] & 0xff) << 16) + ((ba[i + 1] & 0xff) << 8) + (ba[i + 2] & 0xff) // Les poids forts en premier
    ch += digit.charAt((n >> 18) & 0x3f)
    ch += digit.charAt((n >> 12) & 0x3f)
    ch += digit.charAt((n >> 6) & 0x3f)
    ch += digit.charAt(n & 0x3f)
  }
  // Revu version mtgApp
  // var paddingCount = Math.floor((3 - r) % 3); // nul si r = 0 // 1 si r = 2 et 2 si r = 3 c'est le nombre de = à mettre à la fin
  const paddingCount = (3 - r) % 3 // nul si r = 0 // 1 si r = 2 et 2 si r = 3 c'est le nombre de = à mettre à la fin
  return ch.substring(0, (q + 1) * 4 - paddingCount) + '=='.substring(0, paddingCount)
}
/**
 * Fonction renvoyant un tableau d'entiers représentant des bytes d'un flux de bytes.
 * @param {string} b64String  une chaîne base64.
 * @param {boolean} bstandard  Si true on décode de façon standard sinon avec encodage mathGraph32 avec / remplacé par  #
 * @returns {number[]} Tableau de bytes.
 */
export function base64Decode (b64String, bstandard) {
  const digit = arguments.length === 1 ? _digit64 : (bstandard ? _digit64Standard : _digit64)
  let paddingCount = 0
  const len = b64String.length
  const indegal = b64String.indexOf('=')
  if (indegal !== -1) {
    if (b64String.charAt(len - 1) === '=') {
      if (b64String.charAt(len - 2) === '=') paddingCount = 2
      else paddingCount = 1
    }
    b64String = b64String.substring(0, indegal) + 'AA'.substring(2 - paddingCount) // On remplace les = par des An donc des zéros
  } else paddingCount = 0
  // Ligne suivante modifiée JavaScript
  const barray = new Array((Math.floor((b64String.length - 1) / 4) + 1) * 3 - paddingCount)
  const der = len - paddingCount
  let j = 0
  for (let i = 0; i < len; i += 4) {
    const car1 = b64String.charAt(i)
    const car2 = b64String.charAt(i + 1)
    const car3 = b64String.charAt(i + 2)
    const car4 = b64String.charAt(i + 3)
    const n = (digit.indexOf(car1) << 18) + (digit.indexOf(car2) << 12) +
        (digit.indexOf(car3) << 6) + digit.indexOf(car4)
    if (i + 3 < der) barray[j + 2] = (n & 0xff)
    if (i + 2 < der) barray[j + 1] = ((n >> 8) & 0xff)
    barray[j] = ((n >> 16) & 0xff)
    j += 3
  }
  return barray
}
/**
 * Fonction renvoyant le PGCD de a et de b.
 * Avant appel a et b doivent être entiers et non tous les deux nuls, positifs ou nuls
 * @param {number} a  Entier positif
 * @param {number} b  Entier positif
 * @returns {number}
 */
export function pgcd (a, b) {
  while (b !== 0) {
    const r = a % b
    a = b
    b = r
  }
  return a
}
/**
 * Fonction renvoyant le PPCM de a et de b
 * Avant appel a et b doivent être entiers et non tous les deux nuls, positifs ou nuls
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function ppcm (a, b) {
  if ((a === 0) || (b === 0)) return 0
  const q = a / pgcd(a, b)
  // Modifié version 7.3 pour optimisation
  // return Math.floor(q * b + 0.5)
  return Math.round(q * b)
}
/**
 * Fonction renvoyant le coefficient du binôme Cnp
 * Avant appel n et p doivent être entiers, n > 0,
 * et p compris entre 0 et n
 * @param {number} n
 * @param {number} p
 * @returns {number}
 */
export function ncr (n, p) {
  if (p > n / 2) p = n - p
  if (p === 0) return 1
  let d = n / p
  const p1 = p
  for (let k = 1; k < p1; k++) {
    p--
    n--
    const d1 = n / p
    d = d * d1
  }
  // Modifié version 7.3 pour optimisation
  // return Math.floor(d + 0.5)
  return Math.round(d)
}
/**
 * Fonction renvoyant le nombre de permutations à p éléments d'un ensemble à n éléments
 * Avant appel n et p doivent être entiers, n > 0.
 * @param {number} n
 * @param {number} p
 * @returns {number}
 */
export function npr (n, p) {
  if (p === 0) return 1
  let d = n
  for (let k = 1; k < p; k++) {
    n--
    d = d * n
  }
  return d
}
/**
 * Fonction renvoyant true si un angle de mesure r est considéré comme
 * presque nul (valeur absolue inféieure à 10^-7)
 * @param {number} r
 * @returns {boolean}
 */
// Version 8.2 : on passe à 1e-7 car sinon certains arcs ne sont pas bien tracés
export function zeroAngle (r) {
  // return (Math.abs(r) < 1e-7)
  return (Math.abs(r) < 1e-5)
}

/**
 * Renvoie la mesure principale en radians d'un angle de mesure angrad.
 * @param {number} angrad
 * @returns {number}
 */
// Version 8.2 : On a lodifié zeroAngle en remplaçant 1e-7 par 1e-5
// mais ici on garde la comparaison à 1e-7 près
export function mesurePrincipale (angrad) {
  if (Math.abs(Math.abs(angrad) - Math.PI) < 1e-7) return Math.PI
  const dbpi = 2.0 * Math.PI
  return angrad - dbpi * Math.floor((angrad + Math.PI) / dbpi)
}

/**
 * Fonction renvoyant true si x et y sont des nombres compris entre le plus
 * petit et le plus grand  entiers représentés sur 4 actets.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function testToile (x, y) {
  return ((x <= SHORT_MAX_VALUE) && (y <= SHORT_MAX_VALUE) &&
    (x >= SHORT_MIN_VALUE) && (y >= SHORT_MIN_VALUE))
}
/**
 * Renvoie true si les deux vecteurs u et v sont considérés comme colinéaires
 * (à epsilon près).
 * @param {Vect} u
 * @param {Vect} v
 * @returns {boolean}
 */
export function colineaires (u, v) {
  const n1 = u.norme()
  const n2 = v.norme()
  if (zero(n1) || zero(n2)) return true
  else return (zero((u.x * v.y - u.y * v.x) / n1 / n2))
}
/**
 * Renvoie true si les deu vecteurs e et v sont considérés comme colinéiares
 * et de même sens (à epsilon près).
 * @param {Vect} u
 * @param {Vect} v
 * @returns {boolean}
 */
export function colineairesMemeSens (u, v) {
  return colineaires(u, v) && (u.x * v.x + u.y * v.y >= 0)
}
/**
 * Renvoie la distance entre deux points de coordonnées (x1,y1) et (x2,y2).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distancePointPoint (x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
}
/**
 * Renvoie le carré de la distance entre deux points de coordonnées (x1,y1) et (x2,y2).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distancePointPointCarre (x1, y1, x2, y2) {
  return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
}

/**
 * Affecte res.x et res.y avec les coordonnées de l'intersection de deux droites sécantes
 * On sait qu'elles sont sécantes avant appel.
 * @param {number} p1x  Abscisse d'un point de la première droite
 * @param {number} p1y  Ordonnée d'un point de la première droite
 * @param {Vect} u1  Vecteur directeur de la première droite.
 * @param {number} p2x  Abscisse d'un point de la deuxième droite
 * @param {number} p2y  Ordonnée d'un point de la deuxième droite
 * @param {Vect} u2  Vecteur directeur de la deuxième droite.
 * @param {Object} res
 * @returns {void}
 */
export function intersectionDroitesSecantes (p1x, p1y, u1, p2x, p2y, u2, res) {
  const d = u1.x * u2.y - u2.x * u1.y
  const k1 = u1.y * p1x - u1.x * p1y
  const k2 = u2.y * p2x - u2.x * p2y
  res.x = (u1.x * k2 - u2.x * k1) / d
  res.y = (u1.y * k2 - u2.y * k1) / d
}

/**
 * Affecte point.x avec l'indice de la valeur maximale contenue dans le tableau
 * de nombres tab et point.y avec l'indice de la valeur maximale.
 * @param {number} c Le nombre d'éléments du tableau.
 * @param {number[]} tab  Un tableau de nombres
 * @param {Object} point
 * @returns {void}
 */
export function indiceMiniMaxi (c, tab, point) {
  let imin, imax, min, max

  min = tab[0]
  max = min
  imin = 0
  imax = 0
  for (let i = 1; i <= c; i++) {
    if (tab[i] < min) {
      imin = i
      min = tab[i]
    }
    if (tab[i] > max) {
      imax = i
      max = tab[i]
    }
  }
  point.x = imin
  point.y = imax
}
/**
 * Renvoie true si la différence entre angle1 et angle2 est en valeur absolue
 * proche de pi/2 ou 3pi/2
 * @param {number} angle1
 * @param {number} angle2
 * @returns {boolean}
 */
export function testAngleDroit (angle1, angle2) {
  const dif = Math.abs(angle2 - angle1)
  return zeroAngle(dif - Math.PI / 2) || zeroAngle(dif - 3 * Math.PI / 2)
}

/**
 * Renvoie les coordonnées du pointeur souris de l'événement event relatives au svg par
 * @param {MouseEvent} event
 * @param {SVGElement|HTMLDivElement} par : Pour la version mtgApp le div conteneur de l'appli,
 * pour la version MtgAppLecteur le svg global de la figure
 * @param {number} decx Valeur à retrancher au premier élément du tableau de retour
 * @param {number} decy Valeur à retrancher au premier élément du tableau de retour
 * @returns {Point}
 */
export function getMousePositionToParent (event, par, decx = 0, decy = 0) {
  const { left, top } = par.getBoundingClientRect()
  return {
    x: event.clientX - left - decx,
    y: event.clientY - top - decy
  }
}

/**
 * Renvoie les coordonnées du pointeur d'un périphérique mobile de l'événement event par rapport au svg par
 * @param {TouchEvent} event
 * @param {SVGElement} parent
 * @param {number} decx Valeur à retrancher au premier élément du tableau de retour
 * @param {number} decy Valeur à retrancher au premier élément du tableau de retour
 * @returns {Point}
 */
export function getTouchPositionToParent (event, parent, decx = 0, decy = 0) {
  const { x, y } = parent.getBoundingClientRect()
  return {
    x: event.targetTouches[0].clientX - x - decx,
    y: event.targetTouches[0].clientY - y - decy
  }
}

/**
 * Affecte zRes
 * @param z1
 * @param z2
 * @param zRes
 */
export function divComp (z1, z2, zRes) {
  const a = z1.x
  const b = z1.y
  const c = z2.x
  const d = z2.y
  if (Math.abs(d) <= Math.abs(c)) {
    const r = d / c
    const den = c + d * r
    zRes.x = (a + b * r) / den
    zRes.y = (b - a * r) / den
  } else {
    const r = c / d
    const den = c * r + d
    zRes.x = (a * r + b) / den
    zRes.y = (b * r - a) / den
  }
}

export const descriptionNature = [
  'PointLibre', 'PointCons', 'PointLie',
  'Barycentre', 'PointRep', 'PointLibreEnt',
  'PointParAff', 'PointLiePoint', 'Macro',
  'Dte', 'Vect', 'Seg', 'Ddte',
  'Cerc', 'MarqueAng', 'Arc',
  'Polygone', 'Surf', 'LieuPt',
  'LieuPtDis', 'LigneBrisee',
  'LieuObj', 'Image', 'GrapheSuiteR',
  'GrapheSuiteComp', 'Comment', 'AffVal',
  'MarqueSeg', 'ObjetDup', 'DemiPlan',
  'PtIntPoly', 'Latex', 'PtIntCerc',
  'EditeurFormule', 'PtClone', 'DteClone', 'DdteClone',
  'SegClone', 'CercClone'
]

// Ajout version 6.3.0
/**
 * Fonction arrondissant une valeur à 3 chiffres après la virgule.
 * Utilisée pour les lieux de points, polygones et lignes brisées.
 * @param number
 * @returns {number}
 */
export function round3dg (number) {
  return number.toFixed(3)
}

/**
 * Appelle preventDefault sur l'événement s'il le supporte (pour éviter de générer une erreur sinon)
 * @param {Event} evt
 */
export function preventDefault (evt) {
  if (!evt) return console.error(Error('preventDefault called without event'))
  if (typeof evt.cancelable !== 'boolean' || evt.cancelable) evt.preventDefault()
}

// Fonction ajoutée uniquement pour réparer le bug d'affichage de chrome des signes - et +
// quand on dézoome dans les navigateurs
/**
 * Fonction renvoyant l'indice de l'accolade fermante acorrespondant à celle d'indice
 * pdebut dans chaine.
 * @param {string} chaine  La chaine dans laquelle se fait la recherche. Le caractère
 * d'indice pdebut doit être un {
 * @param {number} pdebut  L'indice du premier caractère de la recherche qui pointe sur une {
 * @returns {number} : L'indice de la parenthèse fermante ou -1 s'il n'y en a pas.
 */
export function accoladeFermante (chaine, pdebut) {
  let p
  let ch
  let somme

  somme = 1
  p = pdebut + 1
  while (p < chaine.length) {
    ch = chaine.charAt(p)
    if (ch === '{') { somme++ } else {
      if (ch === '}') { somme-- }
    }
    if (somme === 0) break
    p++
  }
  if (somme === 0) return p
  else return -1 // On renvoie -1 si pas trouvé
}

// Ajout version 6.7 pour les matrices
/**
 * Fonction renvoyant la chaîne repésentant en LaTeX une matrice.
 * Si tab est un nombre ça retourne ce nombre tel quel (dans son type number)
 * @param {number|MathJsChain} nb
 * @param {number} nbdec Le nombre de décimales
 * @returns {string|number}
 */
export function latexMat (nb, nbdec) {
  if (typeof nb === 'number') return nb
  const size = nb.size()
  const n = size[0]
  const p = size[1]
  let res = '\\begin{matrix}'
  for (let i = 0; i < n; i++) {
    if (i !== 0) res += '\\\\'
    for (let j = 0; j < p; j++) {
      if (j !== 0) res += ' & '
      const val = nb.get([i, j])
      res += chaineNombre(val, nbdec)
    }
  }
  return res + '\\end{matrix}'
}

// Ajout version 6.7 pour les matrices
/**
 * Retourne la chaîne LaTeX d'une matrice où les valeurs sont remplacées
 * par leur fraction continue aprrochée à 10^(-12) près
 * Si tab est un nombre renvoie ce nombre entre parenthèses
 * @param {number|MathJsChain} nb
 * @returns {string}
 */
export function latexMatFrac (nb) {
  if (typeof nb === 'number') {
    if (nb === Math.floor(nb)) return String(nb)
    if (Math.abs(nb) < 1e-12) return '0'
    const tb = fracCont(nb)
    // Pour le smatrices on utilise de \frac et pas des \frac
    return '\\frac{' + tb[0] + '}{' + tb[1] + '}'
  }
  const size = nb.size()
  const n = size[0]
  const p = size[1]
  let res = '\\begin{matrix}'
  for (let i = 0; i < n; i++) {
    if (i !== 0) res += '\\\\'
    for (let j = 0; j < p; j++) {
      if (j !== 0) res += ' & '
      const val = nb.get([i, j])
      if (val === Math.floor(val)) {
        res += String(val)
      } else {
        if (Math.abs(val) < 1e-12) {
          res += '0'
        } else {
          const tb = fracCont(val)
          res += (tb[1] === 1)
            ? String(tb[0])
            : '\\frac{' + tb[0] + '}{' + tb[1] + '}'
        }
      }
    }
  }
  return res + '\\end{matrix}'
}

/**
 * Fonction renvoyant un tableau de nombres correspondant à la matrice identité à n lignes et n colonnes
 * @param {number} n
 * @returns {number[]}
 */
export function identity (n) {
  const tab = []
  for (let i = 0; i < n; i++) {
    const lig = []
    tab.push(lig)
    for (let j = 0; j < n; j++) {
      lig.push(i === j ? 1 : 0)
    }
  }
  return tab
}

/**
 * Retourne un array de 2 valeurs [num, den] où num/den est la fraction continue apporchant x à 10^(-12) près.
 * Si le nombre est en valeur absolue supérieur à 10^9 ou inférieur à 10^-9  ou si on dépasse 50
 * boucles pour l'approximation on ne cherche pas à approximer et on renvoie [x, 1]
 * @param {number} x Le nombre à approcher par une fraction continue
 * @returns {number[]} un array [num, den]
 */
export function fracCont (x) {
  function fracContPos (nb) {
    let i = 0 // Compteur de boucles
    const a0 = Math.floor(nb)
    // if (a0 === nb) return [a0, 1]
    if (Math.abs(nb - a0) < 1e-10) return [a0, 1]
    let p0 = a0
    let q0 = 1
    const r1 = nb - a0
    const a1 = Math.floor(1 / r1)
    let p1 = a0 * a1 + 1
    let q1 = a1
    if (a1 === 1 / r1) return [p1, q1]
    // const k = Math.pow(10, -prec)
    // A priori cette fonction n'est utilisé que pour une approximation à 10^(-12) près
    let p = p1
    let q = q1
    let r = r1
    let a = a1
    // while (Math.abs(nb - p / q) > k) {
    while (Math.abs(nb - p / q) > 1e-12) {
      i++
      if (i > 50) return [x, 1] // Trop de boucles. On renvoie le nombre non approché par une fraction
      r = 1 / r - a
      a = Math.floor(1 / r)
      p = a * p1 + p0
      q = a * q1 + q0
      if (a === 1 / r) return [p, q]
      const oldp1 = p1
      const oldq1 = q1
      p1 = p
      q1 = q
      p0 = oldp1
      q0 = oldq1
    }
    return [p, q]
  }
  if (Number.isInteger(x)) return [x, 1]
  if (Math.abs(x) > 1000000000 || Math.abs(x) < 0.000000001) return [x, 1]
  if (x >= 0) return fracContPos(x)
  const res = fracContPos(-x)
  return [-res[0], res[1]]
}

/**
 * Retourne le code latex avec \dfrac pour cette fraction
 * @param {number[]} tab
 * @return {string}
 */
export function codeLatexFracCont (tab) {
  if (tab[1] === 1) return String(tab[0])
  return '\\dfrac{' + tab[0] + '}{' + tab[1] + '}'
}

/**
 * Une fct à mettre dans les catch de promesse pour sortir l'erreur en console
 * @type {function}
 */
export const consoleError = console.error.bind(console)

/**
 * Remplace les \text{truc}acute{e} par du \text{trucé}
 * @param {string} ch La chaîne à traiter
 * @returns {string} La chaîne traitée
 */
export function traiteAccents (ch) {
  const a = 'éèàùâêôî'
  const b = ['acute', 'grave', 'grave', 'grave', 'hat', 'hat', 'hat', 'hat']
  const c = 'eeauaeoi'
  for (let i = 0; i < b.length; i++) {
    const re = new RegExp('\\\\text{([^}]*?)}\\\\' + b[i] + '{' + c[i] + '}\\s*\\\\text{', 'g')
    while (ch.search(re) !== -1) ch = ch.replace(re, '\\text{$1' + a[i])
    const re2 = new RegExp('\\\\text{([^}]*?)}\\\\' + b[i] + '{' + c[i] + '}', 'g')
    while (ch.search(re2) !== -1) ch = ch.replace(re2, '\\text{$1' + a[i] + '}')
  }
  // on vire les \text{} (textes vides)
  ch = ch.replace(/\\text\{}/g, '')
  // on merge les ≠ \text{}\text{}
  const re3 = /\\text\{([^}]+)}\\text\{/g
  while (re3.test(ch)) ch = ch.replace(re3, '\\text{$1')
  return ch
}

/**
 * @typedef DecompPrim
 * @type Array
 * @property {number[]} 0 la liste des facteurs premiers
 * @property {number[]} 1 la liste des puissances de chaque facteur premier
 */
/**
 * Retourne la décomposition en facteurs premiers
 * @param {number} n
 * @returns {DecompPrim}
 */
export function decompPrim (n) {
  /**
   * Fonction renvoyant true si le nombre k est un entier à 10^-9 près
   * @inner
   * @param k
   * @returns {boolean}
   */
  function entier (k) {
    return zero(k - Math.round(k))
  }

  /**
   * Fonction qui, si x est divisible par q, renvoie le plus grand exposant de q qui divise n et sinon renvoie 0
   * @inner
   * @param {number} x entier
   * @param {number} q entier
   * @returns {number}
   */
  function divPar (x, q) {
    if (entier(x / q)) {
      let exp = 1
      let k = q
      while (entier(x / (q * k))) {
        exp++
        k = k * q
      }
      return exp
    } else return 0
  }

  let nb = n
  /** @type {number[]} */
  const factprem = []
  /** @type {number[]} */
  const exposants = []
  let exp = divPar(nb, 2)
  if (exp > 0) {
    factprem.push(2)
    exposants.push(exp)
    nb = nb / Math.pow(2, exp)
  }
  exp = divPar(nb, 3)
  if (exp > 0) {
    factprem.push(3)
    exposants.push(exp)
    nb = nb / Math.pow(3, exp)
  }
  let k = 5
  let pas = 4
  while (k * k <= nb) {
    exp = divPar(nb, k)
    if (exp > 0) {
      factprem.push(k)
      exposants.push(exp)
      nb = nb / Math.pow(k, exp)
    }
    pas = 6 - pas
    k = k + pas
  }
  if (nb !== 1) {
    factprem.push(nb)
    exposants.push(1)
  }
  return [factprem, exposants]
}

/**
 * Affecte la propriété wheelListener au doc (pour pouvoir le retirer) et l'ajoute en listener wheel sur target
 * (qui peut être un svg pour le cas du lecteur ou un rect svg pour le cas de l'appli)
 * @param {CMathGraphDoc} doc
 * @param {SVGElement} svg Le svg sur lequel on agit
 * @param {SVGElement} target le svg element sur lequel on met le listener
 */
export function addZoomListener (doc, svg, target) {
  if (doc.wheelListener) {
    target.removeEventListener('wheel', doc.wheelListener)
  }
  const list = doc.listePr
  let timeStart = Date.now()
  doc.wheelListener = (event) => {
    const time = Date.now()
    const dimf = doc.dimf // Le dimf du document peut avoir changé si on a redimensionné la figure
    const x = doc.dimf.x / 2
    const y = doc.dimf.y / 2
    event.preventDefault()
    if ((time - timeStart) < 50) {
      // event.stopPropagation()
      return
    }
    const sens = event.deltaY < 0
    const rap = sens ? constantes.rapportZoomPlus : constantes.rapportZoomMoins
    timeStart = Date.now()
    list.zoom(x, y, rap)
    list.positionne(false, dimf)
    list.update(svg, doc.couleurFond, true)
    // Seulement pout la version appli
    if (doc.app) doc.app.gestionnaire.enregistreFigureEnCoursPourZoom()
  }
  target.addEventListener('wheel', doc.wheelListener, { capture: false, passive: false })
}

/**
 * Affiche l'erreur en console et notifie bugsnag s'il a été chargé
 * @param {Error|string} error
 * @param {Object} [options]
 * @param {boolean} [options.onlyOnce]
 */
export function notify (error, { onlyOnce = false } = {}) {
  if (typeof error === 'string') error = Error(error)
  if (!(error instanceof Error)) {
    const err = Error('Appel de notify sans erreur')
    console.error(err, error)
    error = err
  }
  if (onlyOnce && notifications.has(error.message)) {
    return
  }
  notifications.add(error.message)
  console.error(error)
  if (typeof win.bugsnagClient?.notify === 'function') {
    win.bugsnagClient.notify(error)
  }
}

/**
 * Dans le cas où on utilise la virgule comme séparateur décimal pour les affichages, on doit
 * pour retrouver la formule normale utilisant le point décimal appliquer cette fonction
 * @param {MtgApp} app
 * @param {CCb} calc
 * @param {string[]} parametre Le paramètre à passer à calc.chaineCalculSansPar()
 * @returns {string}
 */
export function replaceSepDecVirg (app, calc, parametre = null) {
  // On mémorise le mode actuel pour decimalDot
  const decDot = app.decimalDot
  // On donne provisoirement à l'application le mode point décimal de façon à renvoyer des formules avce point décial et virgule
  app.decimalDot = true
  app.listePr.decimalDot = true
  const ch = calc.chaineCalculSansPar(parametre)
  app.decimalDot = decDot
  app.listePr.decimalDot = decDot
  return ch
}

/**
 * Fonction renvoyant un boolean correspondant à la chaîne ch sans tenir compte de la casse de ch (true si ch vaut 'true' ou 'TRUE', false sinon)
 * @param ch
 * @returns {boolean}
 */
export function strToBool (ch) {
  return ch.toLowerCase() === 'true'
}

/**
 * Fonction corrigeant les anciennes tailles de polices quand on passe à Roboto quand on est passés
 * du numéro de version 21 au numéro de version 22 (police Roboto utilisée partout
 * @param {number} taille l'ancienne taille de police
 * @returns {number} La nouvelle taille adaptée en Roboto
 */
export function correctionRoboto (taille) {
  if (taille >= 23) taille -= 2
  else if (taille > 17) taille--
  return taille
}

/* pour détecter si le focus sur un input lancerait un clavier virtuel, on peut utiliser le code ci-dessous (à mettre dans le loader, dans un addQueue ou mieux un promiseAll)
const hasCoarsePointer = window.matchMedia && matchMedia('(pointer: coarse)').matches

const seemsMobileUa = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || '')

// détecte le dépliement d'un clavier virtuel au focus sur un input
async function willSoftKeyboardPopUpOnFocus () {
  if (!window.visualViewport) return seemsMobileUa && hasCoarsePointer
  const input = ceIn(document.body, 'input')
  const vh0 = visualViewport.height
  input.focus()
  // on attend 50ms pour laisser le layout se stabiliser
  await new Promise((resolve) => setTimeout(resolve, 50))
  const vh1 = visualViewport.height
  // on peut virer l'input
  input.blur()
  input.remove()
  // si ça a bougé de plus de 50px c'est que y'a eu un clavier virtuel qui s'est déplié
  return vh1 < vh0 - 50
}
*/
