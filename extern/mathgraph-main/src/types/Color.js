/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

const isColorValue = (nb) => Number.isInteger(nb) && nb < 256 && nb > -1

export default Color
/**
 * Classe couleur
 * @constructor
 * @param {number} red Composante rouge
 * @param {number} green Composante verte
 * @param {number} blue Composante bleue
 * @param {number} opacity Nombre compris entre 0 et 1 donnant l'opacité de l'élément svg (ajout version 6.9.1)
 * @returns {void}
 */
function Color (red, green, blue, opacity = 1) {
  this.red = isColorValue(red) ? red : 0
  this.green = isColorValue(green) ? green : 0
  this.blue = isColorValue(blue) ? blue : 0
  this.opacity = (typeof opacity === 'number' && opacity >= 0 && opacity <= 1) ? opacity : 1
}
/**
 * Renvoie la couleur rouge
 * @returns {number}
 */
Color.prototype.getRed = function () {
  return this.red
}
/**
 * Renvoie la couleur verte
 * @returns {number}
 */
Color.prototype.getGreen = function () {
  return this.green
}
/**
 *
 * @returns {number}Renvoie la couleur bleue
 */
Color.prototype.getBlue = function () {
  return this.blue
}
/**
 *
 * @returns {number} Renvoie l'opacité de l'élément
 */
Color.prototype.getOpacity = function () {
  return this.opacity
}
/**
 * Fonction renvoyant le code couleur pour du LaTeX
 * @returns {string}
 */
Color.prototype.rgb = function () {
  // le jour où l'opacité sera sauvegardée dans la figure base64 on pourra décommenter cette ligne
  return 'rgba(' + this.red + ',' + this.green + ',' + this.blue + ',' + this.opacity + ')'
  // return 'rgb(' + this.red + ',' + this.green + ',' + this.blue + ')'
}

Color.prototype.rgbWithoutOpacity = function () {
  return 'rgba(' + this.red + ',' + this.green + ',' + this.blue + ')'
}
/**
 * Fonction renvoyant true si la couleur est blanche
 * @returns {boolean}
 */
Color.prototype.isWhite = function () {
  return (this.red === 255) && (this.green === 255) && (this.blue === 255)
}
Color.black = new Color(0, 0, 0)
Color.blue = new Color(0, 0, 255)
Color.red = new Color(255, 0, 0)
Color.green = new Color(0, 128, 0)
Color.white = new Color(255, 255, 255)
Color.yellow = new Color(255, 255, 0)
Color.gray = new Color(128, 128, 128)
Color.maroon = new Color(128, 0, 0)
Color.purple = new Color(128, 0, 128)
Color.fuchsia = new Color(255, 0, 255)
Color.aqua = new Color(0, 255, 255)
Color.lime = new Color(0, 255, 0)
Color.silver = new Color(192, 192, 192)
Color.navy = new Color(0, 0, 128)
Color.olive = new Color(128, 128, 0)
Color.teal = new Color(0, 128, 128)

/**
 * Fonction renvoyant la couleur color mais avec transparence opacity
 * @param {Color} color
 * @param {number} [opacity=1] nombre entre 0.1 et 1
 * @returns {Color}
 * @constructor
 */
function ColorWithOpacity (color, opacity = 1) {
  return new Color(color.red, color.green, color.blue, opacity)
}
/**
 * Fonction renvoyant la couleur associée à la chaîne ch
 * @param {string} ch chaîne contenant soit une couleur de base css soit une chaîne commençant par un caractère # suivi de la couleur en hexadécimal
 * @param {number} [opacity=1] Nombre compris entre 0.1 et 1 donnant l'opacité de l'objet
 * @returns {Color}
 */
export function rgbToColor (ch, opacity = 1) {
  if (typeof ch !== 'string' || ch === '') return Color.black
  ch = ch.toLowerCase()
  switch (ch) {
    case 'black': return ColorWithOpacity(Color.black, opacity)
    case 'white': return ColorWithOpacity(Color.white, opacity)
    case 'blue': return ColorWithOpacity(Color.blue, opacity)
    case 'red': return ColorWithOpacity(Color.red, opacity)
    case 'green': return ColorWithOpacity(Color.green, opacity)
    case 'yellow': return ColorWithOpacity(Color.yellow, opacity)
    case 'gray':
    case 'grey':
      return ColorWithOpacity(Color.gray, opacity)
    case 'maroon': return ColorWithOpacity(Color.maroon, opacity)
    case 'purple': return ColorWithOpacity(Color.purple, opacity)
    case 'fuchsia':
    case 'magenta':
      return ColorWithOpacity(Color.fuchsia, opacity)
    case 'aqua':
    case 'cyan':
      return ColorWithOpacity(Color.aqua, opacity)
    case 'lime': return ColorWithOpacity(Color.lime, opacity)
    case 'navy': return ColorWithOpacity(Color.navy, opacity)
    case 'olive': return ColorWithOpacity(Color.olive, opacity)
    case 'teal': return ColorWithOpacity(Color.teal, opacity)
  }
  let r, v, b // , a
  let chunks = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/.exec(ch)
  if (chunks) {
    // la dernière capture (la couche alpha) est pour le moment ignorée
    // car l'opacité n'est pas enregistré dans le flux binaire des objets
    // (seulement l'opacité globale du svg). Inutile donc de gérer ici une opacité
    // qui ne survivrait pas à l'enregistrement / rechargement de la figure
    // ;[, r, v, b, a] = chunks
    ;[, r, v, b] = chunks
  } else {
    // on tente la notation #rvba
    chunks = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i.exec(ch)
    if (chunks) {
      // ;[, r, v, b, a] = chunks
      ;[, r, v, b] = chunks
      // et faut doubler chaque charactère
      r = r + r
      v = v + v
      b = b + b
    }
  }
  if (!r) {
    // on regarde la notation rgb(r, v, b)
    chunks = /^rgb\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)$/.exec(ch)
    if (!chunks) {
      // c'était la dernière chance…
      console.warn(`Couleur "${ch}" inconnue => black`)
      return Color.black
    }
    const [, red, green, blue] = chunks
    return new Color(Number(red), Number(green), Number(blue), opacity)
  }
  // on a r,v,b,a valides (a éventuellement undefined)
  const red = parseInt(r, 16)
  const green = parseInt(v, 16)
  const blue = parseInt(b, 16)
  // const opacity = a ? parseInt(a, 16) / 255 : 1
  // return new Color(red, green, blue, opacity)
  return new Color(red, green, blue, opacity)
}
