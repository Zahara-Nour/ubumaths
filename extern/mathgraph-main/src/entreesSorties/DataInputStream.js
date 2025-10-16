/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
  * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import BinaryParser from '../../outilsExternes/binaryParser/binary-parser'
import factory from '../factory'
import utf8 from '../../outilsExternes/utf8Utils'

export default DataInputStream
// Constructeur modifié par Yves pour pouvoir envoyer dans un console.log la chaîne Base4
/**
 * Classe servant à charger une figure depuis un flux binaire base 64
 * contenu dans un tableau de bytes
 * @constructor
 * @param {number[]} ba Array de bytes sorti d'un base64Decode
 * @param {string} [chdoc] La chaîne base64 source
 * @returns {void}
 */
function DataInputStream (ba, chdoc = '') {
  this.ba = ba
  this.chdoc = chdoc
  this.listeNomsClasse = []
  // Spécial JavaScript : pour pouvoir enregistrer la figure dans le flux, il faut aussi connaître le préfixe
  // du nom de classe qui est utilisé en Java
  // this.listePrefixes = []; // Abandonné version 5.2 car le prefix est toujours objets !
  this.listeNumerosVersion = []
  this.bp = new BinaryParser(true, true)
  this.indiceEnCours = 0
}
DataInputStream.inputStreamError = 'Erreur de flux'

DataInputStream.prototype.reset = function (index) {
  this.listeNumerosVersion = []
  this.listeNomsClasse = []
  this.indiceEnCours = index
}

/**
 * Saute nbBytes dans la lecture du tableau de bytes
 * @param {number} nbBytes
 * @returns {void}
 */
DataInputStream.prototype.skip = function (nbBytes) {
  this.indiceEnCours += nbBytes
}
/**
 * Lit un boolean depuis le tableau de bytes
 * @returns {boolean}
 */
DataInputStream.prototype.readBoolean = function () {
  if (this.indiceEnCours >= this.ba.length) throw new Error(DataInputStream.inputStreamError)
  return (this.ba[this.indiceEnCours++] === 1)
}
/**
 * Lit un byte depuis le tableau de bytes
 * @returns {number}
 */
DataInputStream.prototype.readByte = function () {
  if (this.indiceEnCours >= this.ba.length) throw new Error(DataInputStream.inputStreamError)
  return (this.ba[this.indiceEnCours++])
}
/**
 * Lit un integer sur 4 octets depuis le tableau de bytes
 * @returns {number}
 */
DataInputStream.prototype.readInt = function () {
  const b1 = this.readByte()
  const b2 = this.readByte()
  const b3 = this.readByte()
  const b4 = this.readByte()
  return (((b1 << 24) & 0xFF000000) | ((b2 << 16) & 0x00FF0000) | ((b3 << 8) & 0x0000FF00) | b4)
}
/**
 * Lit un entier sur deux octets depuis le tableau de bytes.
 * @returns {number}
 */
DataInputStream.prototype.readShortInt = function () {
  const b1 = this.readByte()
  const b2 = this.readByte()
  return (((b1 << 8) & 0x0000FF00) | b2)
}
/**
 * Lit un double depuis le tableau de bytes
 * @returns {number}
 */
DataInputStream.prototype.readDouble = function () {
  const ch = String.fromCharCode(this.readByte(), this.readByte(), this.readByte(), this.readByte(),
    this.readByte(), this.readByte(), this.readByte(), this.readByte())
  return this.bp.toDouble(ch)
}
/**
 * Lit un float depuis le tableau de bytes.
 * @returns {number}
 */
DataInputStream.prototype.readFloat = function () {
  const ch = String.fromCharCode(this.readByte(), this.readByte(), this.readByte(), this.readByte())
  return this.bp.toFloat(ch)
}
/**
 * Lit une chaîne UTF depuis le tableau de bytes
 * @returns {string}
 */
DataInputStream.prototype.readUTF = function () {
  const len = this.readShortInt(this.ba)
  // var ret = utf8.decode(this.ba.slice(this.indiceEnCours, this.indiceEnCours + len));
  // @FIXME, on recupère un tableau, utf8.decode veut une string
  // Marche quand même !
  // Non pas d'accord utf8.decode veut un byte array
  const ret = utf8.decode(this.ba.slice(this.indiceEnCours, this.indiceEnCours + len))
  this.indiceEnCours += len
  return ret
}
/**
 * Lit un objet depuis le tableau de bytes.
 * @param {CListeObjets} liste
 * @returns {CElementBase}
 */
DataInputStream.prototype.readObject = function (liste) {
  let nomClasse, numVer
  const s = this.readInt()
  if (s === -1) {
    numVer = this.readInt()
    nomClasse = this.readUTF()
    const ind = nomClasse.indexOf('.', 0)
    if (ind !== -1) {
      nomClasse = nomClasse.substring(ind + 1)
    }
    this.listeNomsClasse.push(nomClasse)
    this.listeNumerosVersion.push(numVer)
  } else {
    nomClasse = this.listeNomsClasse[s]
    numVer = this.listeNumerosVersion[s]
  }
  /* Modifié new
  if (!mtg32[nomClasse]) throw new Error("Erreur chargement objet");
  ob = new mtg32[nomClasse](liste);
  */
  // ob = classe(nomClasse, liste);
  const ob = factory(nomClasse, liste)
  if (ob === null) throw new Error('Erreur chargement objet')
  ob.nVersion = numVer
  ob.read(this, liste)
  return ob
}
/**
 * Lit une image depuis le tableau de bytes.
 * L'image est renvoyée sous forme d'un tableau d'entiers
 * @returns {number[]}
 */
DataInputStream.prototype.readBufferedImage = function () {
  const size = this.readInt()
  const bar = []
  for (let i = 0; i < size; i++) bar[i] = this.readByte()
  // var res =  base64Encode(bar, true); // Encodage standard
  return bar
}
