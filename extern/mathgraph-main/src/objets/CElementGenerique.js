/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import Nat from '../types/Nat'
import CElementBase from './CElementBase'
import NatObj from '../types/NatObj'
export default CElementGenerique

// Classe remaniée pour la version 6.7
/**
 *
 * @param impProto
 * @param {boolean} estElementFinal
 * @constructor
 * @extends CElementBase
 */
function CElementGenerique (impProto, estElementFinal) {
  // Le deuxième paramètre est null car un élémente générique n'a pas de liste propriétaire
  if (arguments.length === 0) CElementBase.call(this, null)
  else {
    CElementBase.call(this, null, impProto, estElementFinal)
  }
  this.nom = ''
  this.elementAssocie = null
  this.natureGraphique = 0
  this.natCal = 0
}
CElementGenerique.prototype = new CElementBase()
CElementGenerique.prototype.constructor = CElementGenerique
CElementGenerique.prototype.superClass = 'CElementBase'
CElementGenerique.prototype.className = 'CElementGenerique'

CElementGenerique.prototype.read = function (inps) {
  this.nom = inps.readUTF()
  let ind = inps.readInt()
  this.natureGraphique = this.nature(ind)
  ind = inps.readInt()
  this.natCal = this.nature(ind)
}

CElementGenerique.prototype.write = function (oups, list) {
  oups.writeUTF(this.nom)
  oups.writeInt(NatObj.indiceDeNature(this.natureGraphique))
  oups.writeInt(this.natCal.indice())
}

CElementGenerique.prototype.getNature = function () {
  return this.natureGraphique
}

CElementGenerique.prototype.getNatureCalcul = function () {
  return this.natCal
}

// Ce type d'objet est le seul qui a besoin de reconstituer un objet de type Nat à partir d'un entier
/**
 * Fonction renvoyant la nature de l'objet à partir de l'indice de la nature quia été enrégistré
 * dans le flux
 * @param {number} ind
 * @returns {Nat}
 */
CElementGenerique.prototype.nature = function (ind) {
  if (ind === -1) return new Nat(0, 0)
  else {
    const low = (ind < 31) ? (1 << ind) : 0
    // var high = (ind < 31) ? 0 : (1 << 32 - ind) // Corrigé version 6.7
    const high = (ind < 31) ? 0 : (1 << ind - 31)
    return new Nat(low, high)
  }
}
