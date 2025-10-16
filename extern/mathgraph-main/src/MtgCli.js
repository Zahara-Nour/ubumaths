/*
 * MathGraph32 Javascript : Software for animating online dynamic mathematics figures
 * https://www.mathgraph32.org/
 * @Author Yves Biton (yves.biton@sesamath.net)
 * @License: GNU AGPLv3 https://www.gnu.org/licenses/agpl-3.0.html
 */

import { readFile, writeFile } from 'node:fs/promises'

import loadTextes from './kernel/loadTextes'
import DataInputStream from './entreesSorties/DataInputStream'
import { base64Decode, mtgFileExtension, textes } from './kernel/kernel'
import CMathGraphDoc from './objets/CMathGraphDoc'
import Dimf from './types/Dimf'

const defaultDimf = new Dimf(800, 600)

/**
 * Pour manipuler des figures mathgraph en ligne de commande (Command Line Interface)
 * Utilisable par nodeJs uniquement
 */
class MtgCli {
  constructor () {
    if (!Object.keys(textes).length) {
      throw Error('Il faut appeler loadTextes avant d’instancier MtgCli (utiliser MtgCli.create())')
    }
    /**
     * Le document courant
     * @type {CMathGraphDoc|null}
     */
    this.doc = null
  }

  /**
   * Retourne le doc courant sous forme de Blob
   * @returns {Blob}
   * @throws {Error} si le doc courant est null
   */
  getBlob () {
    if (!this.doc) {
      throw Error('Il faut charger une figure avant de la récupérer')
    }
    return this.doc.getBlob()
  }

  /**
   * Retourne le code base64 du doc courant
   * @returns {string}
   * @throws {Error} si le doc courant est null
   */
  getBase64Code () {
    if (!this.doc) {
      throw Error('Il faut charger une figure avant de la récupérer')
    }
    return this.doc.getBase64Code()
  }

  /**
   * Charge une figure à partir d'un fichier mgj
   * @param filename
   * @returns {Promise<void>}
   */
  async open (filename) {
    const buffer = await readFile(filename)
    const inps = new DataInputStream(buffer)
    this.doc = new CMathGraphDoc('', false, false)
    this.doc.dimf = defaultDimf
    this.doc.read(inps)
  }

  /**
   * Sauvegarde la figure dans un fichier (extension mgj ajoutée si elle n'y est pas)
   * @param {string} fileName
   */
  saveAs (fileName) {
    const suffix = `.${mtgFileExtension}`
    if (!fileName.endsWith(suffix)) {
      fileName += suffix
    }
    const blob = this.getBlob()
    // cf https://nodejs.org/docs/latest-v20.x/api/buffer.html#blobstream
    // et https://nodejs.org/docs/latest-v20.x/api/fs.html#fspromiseswritefilefile-data-options
    return writeFile(fileName, blob.stream() /*, { mode: 0o644 } */)
  }

  /**
   * Charge une figure à partir de son code base64
   * @param code
   */
  setBase64Code (code) {
    // on vire d'éventuels espaces ou \n au début ou à la fin
    const cleanCode = code.trim()
    this.doc = new CMathGraphDoc('', false, false)
    this.doc.dimf = defaultDimf
    const ba = base64Decode(cleanCode, false)
    const inps = new DataInputStream(ba, cleanCode)
    this.doc.read(inps)
  }

  /**
   * @param {Object} [options] la langue à charger
   * @param {string} [options.lang=fr] la langue à charger
   * @param {string} [options.fig] Une figure base64 à charger
   */
  static async create ({ lang = 'fr', fig } = {}) {
    // faut refaire ici ce qui est fait dans mtgLoad
    await loadTextes(lang)
    const { default: factory } = await import('./factory.js')
    const { default: CListeObjets } = await import('./objets/CListeObjets.js')
    CListeObjets.setFactory(factory)
    const mtgCli = new MtgCli()
    if (fig) {
      mtgCli.setBase64Code(fig)
    }
    return mtgCli
  }
}

export default MtgCli
