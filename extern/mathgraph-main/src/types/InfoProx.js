/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */
import NatObj from './NatObj'
import RInfoObjetsVoisins from './RInfoObjetsVoisins'
import Nat from './Nat'
export default InfoProx
/**
 * Classe utilisée pour donner des informations sur les objets proches du pointeur souris.
 * @constructor
 * @returns {InfoProx}
 */
function InfoProx () {
  this.infoParType = new Array(NatObj.nombreTypesDesignables)
  for (let i = 0; i < NatObj.nombreTypesDesignables; i++) this.infoParType[i] = new RInfoObjetsVoisins()
  this.metAZero()
}

InfoProx.prototype.getClone = function () {
  const clone = new InfoProx()
  clone.nombreObjetsProches = this.nombreObjetsProches
  clone.nombrePointsVoisins = this.nombrePointsVoisins
  clone.typesProches = this.typesProches.getClone()
  clone.nombreTypesProches = this.nombreTypesProches
  clone.premierPointVoisinRencontre = this.premierPointVoisinRencontre
  clone.premierPointVoisin = this.premierPointVoisin
  clone.dernierPointVoisin = this.dernierPointVoisin
  for (let i = 0; i < NatObj.nombreTypesDesignables; i++) clone.infoParType[i].setClone(this.infoParType[i])
  return clone
}
/**
 * Réinitialise l'objet.
 * @returns {void}
 */
InfoProx.prototype.metAZero = function () {
  this.nombreObjetsProches = 0
  this.nombrePointsVoisins = 0
  this.typesProches = new Nat(0, 0)
  this.nombreTypesProches = 0
  this.premierPointVoisinRencontre = true
  this.premierPointVoisin = null
  this.dernierPointVoisin = null
  for (let ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    this.infoParType[ind].nombreVoisins = 0
    this.infoParType[ind].premierVoisin = null
    this.infoParType[ind].dernierVoisin = null
    this.infoParType[ind].premierVoisinRencontre = true
  }
}
/**
 * Remet à zéro les infos sur les objets qui ne sont pas des points
 * @returns {void}
 */
InfoProx.prototype.metAZeroObjetsNonPoints = function () {
  for (let ind = 0; ind < NatObj.nombreTypesDesignables; ind++) {
    if (!NatObj.conversionNumeroNature[ind].isOfNature(NatObj.NTtPoint)) {
      this.infoParType[ind].nombreVoisins = 0
      this.infoParType[ind].premierVoisin = null
      this.infoParType[ind].dernierVoisin = null
      this.infoParType[ind].premierVoisinRencontre = true
    }
  }
}

/**
 * Renvoie un pointeur sur le premier point proche du pointeur souris.
 * @returns {CElementGraphique}
 */
InfoProx.prototype.premierVoisin = function () {
  let elg = null
  for (let i = 0; (i < NatObj.nombreTypesDesignables) && (elg === null); i++) {
    if (this.infoParType[i].nombreVoisins > 0) elg = this.infoParType[i].premierVoisin
  }
  return elg
}
/**
 * Renvoie un pointeur sur le dernier point proche du pointeur souris.
 * @returns {CElementGraphique}
 */
InfoProx.prototype.dernierVoisin = function () {
  let elg = null
  for (let i = NatObj.nombreTypesDesignables - 1; (i >= 0) && (elg === null); i--) {
    if (this.infoParType[i].nombreVoisins > 0) {
      if (this.infoParType[i].dernierVoisin === null) elg = this.infoParType[i].premierVoisin
      else elg = this.infoParType[i].dernierVoisin
    }
  }
  return elg
}
