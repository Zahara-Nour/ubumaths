/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

export default Nat
/**
 * Définit la nature d'un objet.
 * Simule un entier sur 64 octets en utilisant deux entiers sur 32 octets.
 * Chaque nature est caractérisée par un bit (de 0 à 63)
 * @constructor
 * @param {number} low Les 32 premiers bits
 * @param {number} high Les 32 derniers bits.
 * @returns {Nat}
 */
function Nat (low, high) {
  this.low = low
  this.high = high
}
Nat.prototype.constructor = Nat
/**
 * Fonction acceptant un nombre quelconque d'arguments et renvoyant un objet Nat
 * formé du ET logique appliqué à tous les arguments.
 * @param {...Nat} arg
 * @returns {Nat}
 */
Nat.and = function () {
  let a = 0xFFFFFFFF
  let b = 0xFFFFFFFF
  for (let i = 0; i < arguments.length; i++) {
    const p = arguments[i]
    a &= p.low
    b &= p.high
  }
  return new Nat(a, b)
}
/**
 * Fonction acceptant un nombre quelconque d'arguments et renvoyant un objet Nat
 * formé du OU logique appliqué à tous les arguments.
 * @param {...Nat} arg
 * @returns {Nat}
 */
Nat.or = function () {
  let a = 0x0000
  let b = 0x0000
  for (let i = 0; i < arguments.length; i++) {
    const p = arguments[i]
    a |= p.low
    b |= p.high
  }
  return new Nat(a, b)
}
/**
 * Renvoie true si low et high sont tous les deux nuls.
 * @returns {boolean}
 */
Nat.prototype.isZero = function () {
  return (this.low === 0) && (this.high === 0)
}
/**
 * Renvoie true si au moins un des deux low et high est non nul.
 * @returns {boolean}
 */
Nat.prototype.isNotZero = function () {
  return !this.isZero()
}
/**
 * Renvoie un clone de this
 * @returns {Nat}
 */
Nat.prototype.getClone = function () {
  return new Nat(this.low, this.high)
}
/**
 * Renvoie true si les ET logique des 64 bits de this avec celui de nat
 * est non nul.
 * Utilisé pour savoir si un objet est d'au moins un des types contenus dans nat.
 * @param {Nat} nat
 * @returns {boolean}
 */
Nat.prototype.isOfNature = function (nat) {
  if (!(nat instanceof Object)) return false
  if (!nat.constructor === Nat) return false
  if (nat.isZero()) return this.isZero() // A revoir
  return (((nat.low & this.low) !== 0) || ((nat.high & this.high) !== 0))
}

/**
 * Retourne l'indice correspondant à la nature de l'objet (entre 0 et 63)
 * @since version 6.7
 * @returns {number} Un nombre entre -1 et 63 (-1 si l'objet n'a aucune nature, 0 correspond à la nature d'index 0, i.e. le premier bit)
 */
Nat.prototype.indice = function () {
  if (this.isZero()) return -1
  const natClone = this.getClone()
  let indnat = 0
  let typeTrouve = false
  while (!typeTrouve && (indnat <= 30)) {
    if ((natClone.low % 2) === 0) {
      indnat++
      natClone.low >>= 1
    } else {
      typeTrouve = true
    }
  } // while

  if (!typeTrouve) {
    while (!typeTrouve && (indnat <= 63)) {
      if ((natClone.high % 2) === 0) {
        indnat++
        natClone.high >>= 1
      } else {
        typeTrouve = true
      }
    } // while
  }
  // return indnat;
  return indnat
}
