/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import { chaineNombre, ConvDegRad, ConvRadDeg, divComp, uniteAngleRadian } from '../kernel/kernel'
// CCb est requis dans Complexe.prototype.expComp, pour l'être à l'exécution
// sinon on a des pbs de dépendances cycliques que webpack n'arrive pas à résoudre
// Remplacé par CCbGlob
import CCbGlob from '../kernel/CCbGlob'

export default Complexe

/**
 * Classe représentant un nombre complexe pour les calculs dans MathGraph32.
 * this.x est la partie réelle.
 * this.y est la partie imaginaire.
 * @constructor
 * @returns {Complexe}
 */
function Complexe () {
  if (arguments.length === 0) {
    this.x = 0
    this.y = 0
  } else if (arguments.length === 1) { // Construction à partir d'un autre complexe
    this.x = arguments[0].x
    this.y = arguments[0].y
  } else { // Construction par donnée de partie réelle et imaginaire
    this.x = arguments[0]
    this.y = arguments[1]
  }
}
/**
 * Fonction donnant une valeur à un nombre complee.
 * Avec un paramètre : Le paramètre est lui-même un Complexe
 * Avec deux paramètres : On donne une valeur à la partir réelle
 * et à la partie imaginaire.
 * @returns {void}
 */
Complexe.prototype.set = function () {
  if (arguments.length === 2) { // Construction par partie réelle et imaginaire
    this.x = arguments[0]
    this.y = arguments[1]
  } else { // Construction à partir d'un autre complexe
    this.x = arguments[0].x
    this.y = arguments[0].y
  }
}
/**
 * Fonction renvoyant true si la valeur réelle ou imaginaire de this n'est pas définie.
 * @returns {boolean}
 */
Complexe.prototype.isNanOrInfinite = function () {
  return !isFinite(this.x) || !isFinite(this.y)
}
/**
 * Fonction renvoyant l'argument principal du complexe s'il est non nul.
 * La réponse tient compte du paramètre uniteAngle
 * @param {KernelUniteAngle} uniteAngle 0 pour le radian, 1 pour le degré.
 * @returns {number} : L'argument principal.
 */
Complexe.prototype.argument = function (uniteAngle) {
  let resul
  if (this.x === 0) {
    if (this.y > 0) resul = Math.PI / 2
    else resul = -Math.PI / 2
  } else {
    const tangente = this.y / this.x
    if (this.x > 0) resul = Math.atan(tangente)
    else {
      if (this.y >= 0) resul = Math.atan(tangente) + Math.PI
      else resul = Math.atan(tangente) - Math.PI
    }
  }
  if (uniteAngle === uniteAngleRadian) return resul
  else return resul * ConvRadDeg
}
/**
 * Renvoie le module du nombre complexe.
 * @returns {number}
 */
Complexe.prototype.module = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y)
}
/**
 * Renvoie dans le complexe res la somme de this avec z1.
 * @param {Complexe} z1
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.sommeComp = function (z1, res) {
  res.x = this.x + z1.x
  res.y = this.y + z1.y
}
/**
 * Renvoie dans le complexe z1 la différence de this avec z1.
 * @param {Complexe} z1
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.differenceComp = function (z1, res) {
  res.x = this.x - z1.x
  res.y = this.y - z1.y
}
/**
 * Renvoie dans le complexe res le produit de this avec z1.
 * @param {Complexe} z1
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.produitComp = function (z1, res) {
  // Corrigé version 7.1 car si on réaffectait le résultat à this ne marchait pas
  // et cela provoquait des résultats faux dans les produits indicés de complexes.
  // res.x = this.x * z1.x - this.y * z1.y
  // res.y = this.x * z1.y + z1.x * this.y
  const x = this.x * z1.x - this.y * z1.y
  const y = this.x * z1.y + z1.x * this.y
  res.x = x
  res.y = y
}
/**
 * Renvoie le carré du module du complexe.
 * @returns {number}
 */
Complexe.prototype.moduleCarre = function () {
  return this.x * this.x + this.y * this.y
}
/**
 * Fonction renvoyant l'inverse de tthis  dans res
 * @param res
 */
Complexe.prototype.inverseComp = function (res) {
  const modCar = this.moduleCarre()
  res.x = this.x / modCar
  res.y = -this.y / modCar
}
Complexe.prototype.sinComp = function (uniteAngle, res) {
// On utilise la formule sinz = 1/(2i)(exp(iz)-exp(-iz))
  const c1 = new Complexe(-this.y, this.x)
  // c1 contient iz
  const c2 = new Complexe(this.y, -this.x)
  // c2 contient -iz
  const c3 = new Complexe()
  c1.expComp(uniteAngle, c3) // C3 contient exp(iz)
  const c4 = new Complexe()
  c2.expComp(uniteAngle, c4) // C4 contient exp(-iz)
  const c5 = new Complexe()
  c3.differenceComp(c4, c5)
  // On divise c5 par 2i, donc on le multiplie par -0.5*i
  res.x = 0.5 * c5.y
  res.y = -0.5 * c5.x
}
Complexe.prototype.cosComp = function (uniteAngle, res) {
// On utilise la formule sinz = 1/2(exp(iz)+exp(-iz))
  const c1 = new Complexe(-this.y, this.x)
  // c1 contient iz
  const c2 = new Complexe(this.y, -this.x)
  // c2 contient -iz
  const c3 = new Complexe()
  c1.expComp(uniteAngle, c3) // C3 contient exp(iz)
  const c4 = new Complexe()
  c2.expComp(uniteAngle, c4) // C4 contient exp(-iz)
  const c5 = new Complexe()
  c3.sommeComp(c4, c5)
  res.x = 0.5 * c5.x
  res.y = 0.5 * c5.y
}

Complexe.prototype.tanComp = function (uniteAngle, res) {
  // On utilise la formule 1/i*(exp(2iz-1)/(exp(2iz+1))
  const c1 = new Complexe(-2 * this.y, 2 * this.x) // c1 contient 2ic
  // c1 contient 2ic
  const c2 = new Complexe()
  c1.expComp(uniteAngle, c2) // c2 contient exp(2ic)
  const c3 = new Complexe(c2.x + 1, c2.y) // c3 contient exp(2c) + 1
  c2.x = c2.x - 1 // z1 contient exp(2c) - 1
  const c4 = new Complexe()
  // c2.quotientComp(c3, c4)
  divComp(c2, c3, c4)
  res.set(c4.y, -c4.x)
}
Complexe.prototype.shComp = function (uniteAngle, res) {
  const c1 = new Complexe(-this.x, -this.y)
  // c1 contient -this
  const c2 = new Complexe()
  this.expComp(uniteAngle, c2) // c2 contient expComp(this)
  const c3 = new Complexe()
  c1.expComp(uniteAngle, c3) // C3 contient  expComp(-this)
  c2.differenceComp(c3, res)
  res.x /= 2
  res.y /= 2
}
Complexe.prototype.chComp = function (uniteAngle, res) {
  const c1 = new Complexe(-this.x, -this.y)
  // c1 contient -this
  const c2 = new Complexe()
  this.expComp(uniteAngle, c2) // c2 contient expComp(this)
  const c3 = new Complexe()
  c1.expComp(uniteAngle, c3) // c3 contient expComp(-this)
  c2.sommeComp(c3, res)
  res.x /= 2
  res.y /= 2
}
Complexe.prototype.thComp = function (uniteAngle, res) {
  const c1 = new Complexe()
  this.expComp(uniteAngle, c1)
  const c2 = new Complexe(-this.x, -this.y)
  const c3 = new Complexe()
  c2.expComp(uniteAngle, c3)
  const num = new Complexe()
  c1.differenceComp(c3, num)
  const den = new Complexe()
  c1.sommeComp(c3, den)
  divComp(num, den, res)
}

/**
 * Renvoie l'exponentielle complexe de this en tenant compte de uniteAngle.
 * @param {KernelUniteAngle} uniteAngle
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.expComp = function (uniteAngle, res) {
  // Corrigé version 7.1 car sin on réaffectait le résultat à this ne marchait pas
  let x, y
  if (uniteAngle === uniteAngleRadian) {
    x = Math.exp(this.x) * CCbGlob.cosinus(this.y)
    y = Math.exp(this.x) * CCbGlob.sinus(this.y)
  } else {
    x = Math.exp(this.x) * CCbGlob.cosinus(this.y * ConvDegRad)
    y = Math.exp(this.x) * CCbGlob.sinus(this.y * ConvDegRad)
  }
  res.x = x
  res.y = y
}
/**
 * Renvoie le logarithme complexe de this en tenant compte de uniteAngle.
 * @param {KernelUniteAngle} uniteAngle  0 pour radian, 1 pour degré.
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.lnComp = function (uniteAngle, res) {
  // Corrigé version 7.1 car sin on réaffectait le résultat à this ne marchait pas
  const r = this.module()
  const x = Math.log(r)
  const y = this.argument(uniteAngle)
  res.x = x
  res.y = y
}
/**
 * Renvoie dans res this élevé à la puissnace b (b complexe)
 * @param {Complexe} b
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.puisComp = function (b, res) {
  const c1 = new Complexe()
  this.lnComp(uniteAngleRadian, c1) // c1 contient ln(this)
  const c2 = new Complexe()
  b.produitComp(c1, c2) // c2 contient b*ln(this)
  c2.expComp(uniteAngleRadian, res)
}
/**
 * Elévation d'un complexe à une puissance entière d'exposant
 * strictement positif, inférieur ou égal à 255 et non nul
 * On utilise l'algorithme optimisé n'utilisant que des produits.
 * Le résultat est renvoyé dans res.
 * @param {number} exposant
 * @param {Complexe} res
 * @returns {void}
 */
Complexe.prototype.puisCompExpEnt = function (exposant, res) {
  res.x = 1
  res.y = 0
  const tampon = new Complexe(this.x, this.y)
  // Version n'utilisant que des décalages de bits pour optimisation
  let b = 128
  let indfin = 7
  let x1, y1
  while ((b & exposant) === 0) {
    indfin--
    b = b >> 1
  }
  for (let i = 0; i <= indfin; i++) {
    if ((exposant % 2) !== 0) {
      // On n'appele pas produitComp qui créerait un nouvel objet Complexe
      x1 = res.x * tampon.x - res.y * tampon.y
      y1 = res.x * tampon.y + res.y * tampon.x
      res.x = x1
      res.y = y1
    }
    exposant >>= 1
    // On élève tampon au carré
    x1 = tampon.x * tampon.x - tampon.y * tampon.y
    y1 = 2 * tampon.x * tampon.y
    tampon.x = x1
    tampon.y = y1
  }
}
/**
 * Renvoie une chaîne de caractères représentant le complexe this.
 * @returns {string}
 */
Complexe.prototype.toString = function () {
  const y = this.y
  if (y === 0) return this.x.toString()
  if (y < 0) return this.x.toString() + this.y.toString() + 'i'
  return this.x.toString() + '+' + this.y.toString() + 'i'
}

Complexe.prototype.chaineValeurComplexe = function (nbDecimales) {
  const ch1 = chaineNombre(this.x, nbDecimales)
  let ch2 = chaineNombre(this.y, nbDecimales)
  if (ch2 === '0') return ch1
  else {
    if (ch1 === '0') {
      if (ch2 === '-1') return '- i'
      else if (ch2 === '1') ch2 = ''
      return ch2 + ' i'
    } else {
      if (ch2 === '1') return ch1 + ' + i'
      else {
        // if (ch2 === "-1") ch2 = "-";
        if (ch2 === '- 1') return ch1 + ' - i'
        if (ch2.charAt(0) === '-') return ch1 + ' - ' + ch2.substring(1) + ' i'
        else return ch1 + ' + ' + ch2 + ' i'
      }
    }
  }
}
