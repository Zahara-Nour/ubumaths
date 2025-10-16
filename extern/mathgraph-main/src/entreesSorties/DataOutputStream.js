/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import utf8 from '../../outilsExternes/utf8Utils'
import BinaryParser from '../../outilsExternes/binaryParser/binary-parser'

export default DataOutputStream

/**
 * Classe servant à enregistrer une figure depuis un flux binaire base 64
 * contenu dans un tableau de bytes.
 * @constructor
 * @returns {void}
 */
function DataOutputStream () {
  this.bp = new BinaryParser(true, true) // Poids forts en premeir et exceptions gérées
  this.listeNomsClasse = [] // Liste contenant les noms des classes des objets de la liste enregistrée
  this.ba = []
}
DataOutputStream.nat_png = 0
DataOutputStream.nat_gif = 1
DataOutputStream.nat_jpg = 2
DataOutputStream.nat_noImage = 255 // Non signé en java

/**
 * Enregistrement d'un entier sur 4 octets dans le flux
 * @param {number} ent
 * @returns {void}
 */
DataOutputStream.prototype.writeInt = function (ent) {
  // Corrigé version mtgApp. Ne marche pas
  let i
  if (ent === -1) {
    for (i = 0; i < 4; i++) this.ba.push(255)
  } else {
    const r = this.bp.fromInt(ent)
    for (i = 0; i < r.length; i++) this.ba.push(r.charCodeAt(i))
  }
}
/**
 * Enregistrement d'un entier sur 2 octets dans le flux
 * @param {number} ent
 * @returns {void}
 */
DataOutputStream.prototype.writeShortInt = function (ent) {
  // Corrigé version mtgApp. Ne marche pas
  let i
  if (ent === -1) for (i = 0; i < 2; i++) this.ba.push(255)
  else {
    const r = this.bp.fromShort(ent)
    for (i = 0; i < r.length; i++) this.ba.push(r.charCodeAt(i))
  }
}
/**
 * Enregistrement d'un byte dans le flux
 * @param {number} b
 * @returns {void}
 */
DataOutputStream.prototype.writeByte = function (b) {
  this.ba.push(b)
}
/**
 * Enregistrement d'un booléen dans le flux
 * @param {boolean} b
 * @returns {void}
 */
DataOutputStream.prototype.writeBoolean = function (b) {
  this.ba.push(b ? 1 : 0)
}
/**
 * Enregistrement d'un double dans le flux
 * @param {number} d
 * @returns {void}
 */
DataOutputStream.prototype.writeDouble = function (d) {
  const r = this.bp.fromDouble(d)
  for (let i = 0; i < r.length; i++) this.ba.push(r.charCodeAt(i))
}
/**
 * Enregistrement d'un float dans le flux.
 * @param {number} d
 * @returns {void}
 */
DataOutputStream.prototype.writeFloat = function (d) {
  const r = this.bp.fromFloat(d)
  for (let i = 0; i < r.length; i++) this.ba.push(r.charCodeAt(i))
}
/**
 * Enregistrement d'un tableau d'entiers décrivant une image dans le flux
 * @param {number[]} im
 * @returns {void}
 */
DataOutputStream.prototype.writeBufferedImage = function (im) {
  this.writeInt(im.length)
  this.ba = this.ba.concat(im)
}
/**
 * Enregistrement d'une chaîne de caractères dans le flux
 * La longueur de la chaîne est d'abod enregistrée
 * @param {string} ch
 * @returns {void}
 */
DataOutputStream.prototype.writeUTF = function (ch) {
  const st = utf8.encode(ch)
  this.writeShortInt(st.length)
  for (let i = 0; i < st.length; i++) this.ba.push(st[i])
}
/**
 * Enregistrement d'une chaîne de caractères dans le flux
 * La longueur de la chaîne n'est pas enregistrée.
 * @param {string} ch
 * @returns {void}
 */
DataOutputStream.prototype.writeCString = function (ch) {
  for (let i = 0; i < ch.length; i++) {
    this.writeByte(ch.charCodeAt(i))
  }
}
/**
 * Enregistrement d'un objet dans le flux
 * Si une m^ême classe a déjà été enregistrée, on enregistre l'indice du nom
 * de la classe de cet objet dans le flux et sinon on enregistre -1 suivi du
 * numéro de version de l'objet et du nom de la classe.
 * L'objet s'enregistre ensuite dans le flux.
 * @param {COb} ob
 * @returns {void}
 */
DataOutputStream.prototype.writeObject = function (ob) {
  let i
  const nomClasse = ob.className
  const numVer = ob.numeroVersion() // Numéro de version
  // On regarde d'abord si un objet de cette classe a déjà été enregistré dans le flux.
  // Si oui on enregistre dans le flux son indice dans la liste des classes déjà
  // chargées dans la liste listeNomsClasses.
  // Sinon on enregistre un short FFFF suivi du numéro de version de l'objet
  // suivi du nom de la classe
  let trouve = false
  for (i = 0; (i < this.listeNomsClasse.length) && !trouve; i++) {
    const ch = this.listeNomsClasse[i]
    if (ch === nomClasse) {
      trouve = true
      break
    }
  }
  if (trouve) {
    this.writeInt(i)
  } else {
    this.writeInt(-1)
    this.writeInt(numVer)
    this.writeUTF(nomClasse)
    this.listeNomsClasse.push(nomClasse)
  }
  ob.write(this, ob.listeProprietaire)
}

/**
 * Fonction renvoyant le code de nature d'iamge correspondant à l'extension ext
 * @param ext
 * @returns {number}
 */
DataOutputStream.getNatImage = function (ext) {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return DataOutputStream.nat_jpg
    case 'gif':
      return DataOutputStream.nat_gif
    default :
      return DataOutputStream.nat_png
  }
}
